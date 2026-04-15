import { NextRequest, NextResponse } from 'next/server';
import { startSimulator, stopSimulator, isRunning, getSimulatorStatus } from '@/lib/simulator';
import { data } from '@/lib/data-provider';
import { getHardwareMode, recordHardwareFrame } from '@/lib/hardware';

// GET /api/telemetry — returns the latest telemetry frame
export async function GET() {
    const hwMode = getHardwareMode();

    if (!hwMode.active && !isRunning()) {
        startSimulator();
    }

    const frame = await data.getLatestTelemetry();
    const status = getSimulatorStatus();

    if (!frame) {
        return NextResponse.json(
            { error: 'No telemetry data yet', _simulator: status, _hardware: hwMode },
            { status: 202 }
        );
    }

    return NextResponse.json({
        ...frame,
        _simulator: status,
        _hardware: hwMode,
    });
}

// Simple rate limiter for POST (max 5 req/sec per IP)
const postRates = new Map<string, number[]>();

function checkPostRate(ip: string): boolean {
    const now = Date.now();
    const timestamps = postRates.get(ip) || [];
    const recent = timestamps.filter(t => now - t < 1000);
    if (recent.length >= 5) return false;
    recent.push(now);
    postRates.set(ip, recent);
    return true;
}

// POST /api/telemetry — receive telemetry from ESP32 hardware
// Requires HARDWARE_API_KEY header when configured, open otherwise (for dev).
//
// Expected JSON body:
// {
//   "session_id": "hw-001",
//   "receiver_voltage": 5.1,
//   "receiver_current": 0.82,
//   "supercap_voltage": 1.4,
//   "distance_cm": 30.2,
//   "temperature_c": 34.5
// }
export async function POST(request: NextRequest) {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    if (!checkPostRate(ip)) {
        return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    // API key check (only when HARDWARE_API_KEY is configured)
    const requiredKey = process.env.HARDWARE_API_KEY;
    if (requiredKey) {
        const providedKey = request.headers.get('x-hardware-key');
        if (providedKey !== requiredKey) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const body = await request.json();

        const required = ['session_id', 'receiver_voltage', 'receiver_current'];
        for (const field of required) {
            if (body[field] === undefined) {
                return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
            }
        }

        if (isRunning()) {
            stopSimulator();
        }

        const voltage = Number(body.receiver_voltage) || 0;
        const current = Number(body.receiver_current) || 0;
        const power = voltage * current;

        const frame = {
            timestamp: body.timestamp || new Date().toISOString(),
            session_id: String(body.session_id).slice(0, 64),
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

        await data.insertTelemetry(frame);
        recordHardwareFrame();

        return NextResponse.json({ ok: true, frame });
    } catch {
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
}
