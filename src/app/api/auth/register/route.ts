import { NextRequest, NextResponse } from 'next/server';
import { createUser, getUserByEmail, createSession } from '@/lib/db';
import { getSessionCookieName } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const { email, password, name, company } = await request.json();

    if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
        return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = getUserByEmail(email);
    if (existing) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const user = createUser(email, name, password, company);
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
