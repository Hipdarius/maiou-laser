import { NextRequest, NextResponse } from 'next/server';
import { authenticateUser, createSession } from '@/lib/db';
import { getSessionCookieName } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const { email, password } = await request.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = authenticateUser(email, password);
    if (!user) {
        return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = createSession(user.id);
    const response = NextResponse.json({ user });
    response.cookies.set(getSessionCookieName(), token, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
    });

    return response;
}
