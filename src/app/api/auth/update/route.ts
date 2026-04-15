import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { updateUser } from '@/lib/db';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, company } = await request.json();
    updateUser(user.id, { name, company });

    return NextResponse.json({ ok: true });
}
