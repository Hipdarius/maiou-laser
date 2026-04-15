import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth-provider';
import { getSessionCookieName } from '@/lib/auth';

export async function POST() {
    const cookieStore = await cookies();
    const token = cookieStore.get(getSessionCookieName())?.value;

    if (token) {
        await auth.deleteSession(token);
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(getSessionCookieName());
    return response;
}
