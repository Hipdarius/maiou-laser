import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession } from '@/lib/db';
import { getSessionCookieName } from '@/lib/auth';

export async function POST() {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;

    if (token) {
        deleteSession(token);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(getSessionCookieName());
    return response;
}
