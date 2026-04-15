import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { auth } from '@/lib/auth-provider';

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { name, company } = await request.json();

    // Input validation
    if (name !== undefined && (typeof name !== 'string' || name.length === 0 || name.length > 100)) {
        return NextResponse.json({ error: 'Name must be 1-100 characters' }, { status: 400 });
    }
    if (company !== undefined && (typeof company !== 'string' || company.length > 200)) {
        return NextResponse.json({ error: 'Company must be under 200 characters' }, { status: 400 });
    }

    await auth.updateUser(user.id, { name, company });
    return NextResponse.json({ ok: true });
}
