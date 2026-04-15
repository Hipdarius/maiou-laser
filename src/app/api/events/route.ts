import { NextRequest, NextResponse } from 'next/server';
import { startSimulator, isRunning } from '@/lib/simulator';
import { data } from '@/lib/data-provider';

// GET /api/events?limit=50 — returns recent event log entries
export async function GET(request: NextRequest) {
    if (!isRunning()) {
        startSimulator();
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const events = await data.getEvents(limit);

    return NextResponse.json({
        count: events.length,
        events,
    });
}
