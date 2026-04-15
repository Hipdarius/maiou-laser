import { NextRequest, NextResponse } from 'next/server';
import { startSimulator, stopSimulator, isRunning, getLatestTelemetry, getSimulatorStatus } from '@/lib/simulator';
import { insertTelemetry } from '@/lib/db';
import { getHardwareMode, recordHardwareFrame } from '@/lib/hardware';

// GET /api/telemetry — returns the latest telemetry frame
export async function GET() {
    const hwMode = getHardwareMode();

    // Auto-start simulator only if NOT in hardware mode
    if (!hwMode.active && !isRunning()) {
        startSimulator();
    }

    const frame = getLatestTelemetry();
    const status = getSimulatorStatus();

    if (!frame) {
        return NextResponse.json(
            { error: 'No telemetry data yet', simulator: status, hardware_mode: hwMode },
            { status: 202 }
        );
    }

    return NextResponse.json({
        ...frame,
        _simulator: status,
        _hardware: hwMode,
    });
}

// POST /api/telemetry — receive telemetry from ESP32 hardware
// This is the endpoint the ESP32 firmware will call.
// When data arrives here, the simulator automatically stops.
//
// Expected JSON body (TelemetryFrame):
// {
//   "session_id": "hw-001",
//   "transmitter_on": true,
//   "beam_locked": true,
//   "safety_ok": true,
//   "receiver_voltage": 5.1,
//   "receiver_current": 0.82,
//   "supercap_voltage": 1.4,
//   "distance_cm": 30.2,
//   "temperature_c": 34.5
// }
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate required fields
        const required = ['session_id', 'receiver_voltage', 'receiver_current'];
        for (const field of required) {
            if (body[field] === undefined) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                );
            }
        }

        // Stop the simulator when real hardware data arrives
        if (isRunning()) {
            stopSimulator();
        }

        // Compute derived fields
        const voltage = Number(body.receiver_voltage) || 0;
        const current = Number(body.receiver_current) || 0;
        const power = voltage * current;

        const frame = {
            timestamp: body.timestamp || new Date().toISOString(),
            session_id: String(body.session_id),
            transmitter_on: Boolean(body.transmitter_on ?? true),
            beam_locked: Boolean(body.beam_locked ?? true),
            safety_ok: Boolean(body.safety_ok ?? true),
            receiver_voltage: voltage,
            receiver_current: current,
            received_power: body.received_power ?? Math.round(power * 1000) / 1000,
            supercap_voltage: Number(body.supercap_voltage) || 0,
            energy_delivered_j: Number(body.energy_delivered_j) || 0,
            distance_cm: Number(body.distance_cm) || 0,
            temperature_c: Number(body.temperature_c) || 0,
        };

        insertTelemetry(frame);
        recordHardwareFrame();

        return NextResponse.json({ ok: true, frame });
    } catch (e) {
        return NextResponse.json(
            { error: 'Invalid JSON body', details: String(e) },
            { status: 400 }
        );
    }
}
