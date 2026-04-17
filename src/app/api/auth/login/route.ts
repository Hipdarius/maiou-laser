import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-provider';
import { getSessionCookieName, getSessionCookieOptions } from '@/lib/auth';

// Simple in-memory rate limiter (per serverless instance)
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 15;
const WINDOW_MS = 5 * 60 * 1000; // 5 minutes

function getClientIp(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip') || 'unknown';
}

function checkRateLimit(key: string): boolean {
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now > entry.resetAt) {
        attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return true;
    }
    if (entry.count >= MAX_ATTEMPTS) return false;
    entry.count++;
    return true;
}

export async function POST(request: NextRequest) {
    const ip = getClientIp(request);
    if (!checkRateLimit(ip)) {
        return NextResponse.json({ error: 'Too many login attempts. Try again in 5 minutes.' }, { status: 429 });
    }

    const { email, password } = await request.json();

    if (!email || !password) {
        return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    try {
        const user = await auth.authenticateUser(email, password);
        if (!user) {
            return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
        }

        const token = await auth.createSession(user.id);
        const response = NextResponse.json({ user });
        response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
        return response;
    } catch (e) {
        console.error('[Login] Error:', (e as Error).message);
        return NextResponse.json(
            { error: 'Unable to connect to database. Please try again or contact support.' },
            { status: 503 }
        );
    }
}
