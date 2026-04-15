import { NextResponse } from 'next/server';
import { getSessionSummaries } from '@/lib/db';
import { startSimulator, isRunning } from '@/lib/simulator';

export async function GET() {
    if (!isRunning()) {
        startSimulator();
    }

    const sessions = getSessionSummaries();
    return NextResponse.json({ sessions });
}
