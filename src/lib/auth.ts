import { cookies } from 'next/headers';
import { auth } from './auth-provider';
import { User } from './types';

const COOKIE_NAME = 'lumion_session';

export async function getSessionUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return auth.getUserFromToken(token);
}

export function getSessionCookieName(): string {
    return COOKIE_NAME;
}

export function getSessionCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
    };
}
