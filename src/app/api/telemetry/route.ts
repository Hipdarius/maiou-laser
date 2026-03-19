import { NextResponse } from 'next/server';
import { startSimulator, isRunning, getLatestTelemetry, getSimulatorStatus } from '@/lib/simulator';

// GET /api/telemetry — returns the latest telemetry frame
export async function GET() {
    // Auto-start simulator if not running
    if (!isRunning()) {
        startSimulator();
    }

    const frame = getLatestTelemetry();
    const status = getSimulatorStatus();

    if (!frame) {
        return NextResponse.json(
            { error: 'No telemetry data yet', simulator: status },
            { status: 202 }
        );
    }

    return NextResponse.json({
        ...frame,
        _simulator: status,
    });
}
