import { v4 as uuidv4 } from 'uuid';
import { TelemetryFrame, EventEntry } from './types';
import { insertTelemetry as sqliteInsertTelemetry, insertEvent as sqliteInsertEvent, getLatestTelemetry, getTelemetryHistory, getEvents } from './db';
import { data } from './data-provider';

// Write through data-provider (Supabase in prod, SQLite locally)
// Falls back to direct SQLite if data-provider fails
function insertTelemetry(frame: TelemetryFrame) {
    data.insertTelemetry(frame).catch(() => sqliteInsertTelemetry(frame));
}
function insertEvent(event: EventEntry) {
    data.insertEvent(event).catch(() => sqliteInsertEvent(event));
}

// ─── Lumion Telemetry Simulator ─────────────────────────────────────────────
// Generates realistic power-beaming telemetry: ramp-up, steady state,
// perturbations, beam-loss events, and thermal drift.

interface SimState {
    sessionId: string;
    tick: number;
    transmitterOn: boolean;
    beamLocked: boolean;
    safetyOk: boolean;
    voltage: number;
    current: number;
    supercapVoltage: number;
    energyDelivered: number;
    distance: number;
    temperature: number;
    phase: 'startup' | 'rampup' | 'steady' | 'perturbation' | 'cooldown';
}

let state: SimState | null = null;
let intervalId: ReturnType<typeof setInterval> | null = null;

const TICK_MS = 1000;

// Steady-state targets
const TARGET_VOLTAGE = 5.2;       // V
const TARGET_CURRENT = 0.85;      // A
const MAX_SUPERCAP = 2.7;         // V
const BASE_DISTANCE = 30;         // cm
const BASE_TEMP = 28;             // °C

function initState(): SimState {
    return {
        sessionId: uuidv4(),
        tick: 0,
        transmitterOn: false,
        beamLocked: false,
        safetyOk: true,
        voltage: 0,
        current: 0,
        supercapVoltage: 0,
        energyDelivered: 0,
        distance: BASE_DISTANCE + (Math.random() - 0.5) * 5,
        temperature: BASE_TEMP + (Math.random() - 0.5) * 2,
        phase: 'startup',
    };
}

function clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
}

function noise(scale: number = 0.02): number {
    return (Math.random() - 0.5) * scale;
}

function simulateTick(): void {
    if (!state) return;
    state.tick++;

    const t = state.tick;

    // ── Phase transitions ──
    if (t === 1) {
        state.phase = 'startup';
        state.transmitterOn = true;
        state.safetyOk = true;
        addEvent('info', 'Transmitter powered on');
    }
    if (t === 3) {
        state.phase = 'rampup';
        state.beamLocked = true;
        addEvent('info', 'Beam lock acquired');
    }
    if (t === 15) {
        state.phase = 'steady';
        addEvent('info', 'Steady-state power transfer');
    }

    // Random perturbation every ~40-80 ticks
    if (state.phase === 'steady' && Math.random() < 0.02) {
        state.phase = 'perturbation';
        addEvent('warning', 'Beam perturbation detected');
    }

    // Recovery from perturbation
    if (state.phase === 'perturbation' && Math.random() < 0.15) {
        state.phase = 'steady';
        addEvent('info', 'Beam stabilized');
    }

    // Rare safety event
    if (state.phase === 'steady' && Math.random() < 0.005) {
        state.safetyOk = false;
        addEvent('critical', 'Thermal warning — temperature spike');
        state.temperature += 8;
        setTimeout(() => {
            if (state) {
                state.safetyOk = true;
                state.temperature -= 6;
                addEvent('info', 'Temperature normalized');
            }
        }, 5000);
    }

    // Rare tracking loss
    if (state.phase === 'steady' && Math.random() < 0.008) {
        state.beamLocked = false;
        state.phase = 'perturbation';
        addEvent('warning', 'Tracking lost');
        setTimeout(() => {
            if (state) {
                state.beamLocked = true;
                state.phase = 'steady';
                addEvent('info', 'Tracking reacquired');
            }
        }, 3000 + Math.random() * 4000);
    }

    // ── Values based on phase ──
    switch (state.phase) {
        case 'startup':
            state.voltage = 0.1 + noise(0.05);
            state.current = 0.01 + noise(0.005);
            break;

        case 'rampup': {
            const rampProgress = clamp((t - 3) / 12, 0, 1);
            state.voltage = TARGET_VOLTAGE * rampProgress + noise(0.1);
            state.current = TARGET_CURRENT * rampProgress + noise(0.02);
            break;
        }

        case 'steady':
            state.voltage = TARGET_VOLTAGE + noise(0.15);
            state.current = TARGET_CURRENT + noise(0.03);
            break;

        case 'perturbation':
            state.voltage = TARGET_VOLTAGE * (0.3 + Math.random() * 0.4) + noise(0.2);
            state.current = TARGET_CURRENT * (0.2 + Math.random() * 0.3) + noise(0.05);
            break;

        case 'cooldown':
            state.voltage *= 0.9;
            state.current *= 0.85;
            break;
    }

    state.voltage = clamp(state.voltage, 0, 8);
    state.current = clamp(state.current, 0, 2);

    const power = state.voltage * state.current;
    state.energyDelivered += power * (TICK_MS / 1000);

    // Supercap charges when power flows, slowly discharges when not
    if (power > 0.5) {
        state.supercapVoltage = clamp(state.supercapVoltage + power * 0.003, 0, MAX_SUPERCAP);
    } else {
        state.supercapVoltage = clamp(state.supercapVoltage - 0.01, 0, MAX_SUPERCAP);
    }

    // Temperature drift
    state.temperature += power * 0.005 + noise(0.1);
    state.temperature = clamp(state.temperature, 20, 65);

    // Distance drift
    state.distance += noise(0.3);
    state.distance = clamp(state.distance, 10, 100);

    // ── Record frame ──
    const frame: TelemetryFrame = {
        timestamp: new Date().toISOString(),
        session_id: state.sessionId,
        transmitter_on: state.transmitterOn,
        beam_locked: state.beamLocked,
        safety_ok: state.safetyOk,
        receiver_voltage: Math.round(state.voltage * 1000) / 1000,
        receiver_current: Math.round(state.current * 1000) / 1000,
        received_power: Math.round(power * 1000) / 1000,
        supercap_voltage: Math.round(state.supercapVoltage * 1000) / 1000,
        energy_delivered_j: Math.round(state.energyDelivered * 100) / 100,
        distance_cm: Math.round(state.distance * 10) / 10,
        temperature_c: Math.round(state.temperature * 10) / 10,
    };

    insertTelemetry(frame);
}

function addEvent(type: EventEntry['type'], message: string): void {
    if (!state) return;
    insertEvent({
        timestamp: new Date().toISOString(),
        session_id: state.sessionId,
        type,
        message,
    });
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function startSimulator(): void {
    if (intervalId) return; // already running
    state = initState();
    addEvent('info', `Session started: ${state.sessionId}`);
    intervalId = setInterval(simulateTick, TICK_MS);
    simulateTick(); // first tick immediately
}

export function stopSimulator(): void {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    if (state) {
        addEvent('info', 'Session ended');
        state = null;
    }
}

export function isRunning(): boolean {
    return intervalId !== null;
}

export function getSimulatorStatus() {
    return {
        running: isRunning(),
        sessionId: state?.sessionId ?? null,
        tick: state?.tick ?? 0,
        phase: state?.phase ?? null,
    };
}

// Re-export DB queries for convenience
export { getLatestTelemetry, getTelemetryHistory, getEvents };
