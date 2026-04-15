import { cookies } from 'next/headers';
import { getUserFromToken } from './db';
import { User } from './types';

const COOKIE_NAME = 'lumion_session';

export async function getSessionUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return getUserFromToken(token);
}

export function getSessionCookieName(): string {
    return COOKIE_NAME;
}
