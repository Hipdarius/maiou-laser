import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-provider';
import { getSessionCookieName, getSessionCookieOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
    const { email, password, name, company, inviteCode } = await request.json();

    if (!email || !password || !name) {
        return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    if (!inviteCode) {
        return NextResponse.json({ error: 'An invite code is required to register' }, { status: 400 });
    }

    if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    if (name.length > 100 || email.length > 255) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (company && company.length > 200) {
        return NextResponse.json({ error: 'Company name too long' }, { status: 400 });
    }

    try {
        // Validate invite code
        const codeValid = await auth.isValidInviteCode(inviteCode);
        if (!codeValid) {
            return NextResponse.json({ error: 'Invalid invite code' }, { status: 403 });
        }

        // Check for existing user
        const existing = await auth.getUserByEmail(email);
        if (existing) {
            return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
        }

        // Create user, mark code used, create session
        const user = await auth.createUser(email, name, password, company);
        await auth.useInviteCode(inviteCode);
        const token = await auth.createSession(user.id);

        const response = NextResponse.json({ user });
        response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
        return response;
    } catch (e) {
        console.error('[Register] Error:', (e as Error).message);
        return NextResponse.json(
            { error: 'Unable to connect to database. Please try again or contact support.' },
            { status: 503 }
        );
    }
}
