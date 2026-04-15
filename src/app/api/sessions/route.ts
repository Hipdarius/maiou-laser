import { NextResponse } from 'next/server';
import { startSimulator, isRunning } from '@/lib/simulator';
import { data } from '@/lib/data-provider';

export async function GET() {
    if (!isRunning()) {
        startSimulator();
    }

    const sessions = await data.getSessionSummaries();
    return NextResponse.json({ sessions });
}
