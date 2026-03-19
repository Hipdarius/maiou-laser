import { NextRequest, NextResponse } from 'next/server';
import { startSimulator, isRunning, getTelemetryHistory } from '@/lib/simulator';

// GET /api/telemetry/history?limit=60 — returns recent telemetry frames
export async function GET(request: NextRequest) {
    if (!isRunning()) {
        startSimulator();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '60', 10), 500);

    const frames = getTelemetryHistory(limit);

    return NextResponse.json({
        count: frames.length,
        frames,
    });
}
