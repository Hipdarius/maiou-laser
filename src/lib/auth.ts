import { cookies } from 'next/headers';
import { getUserFromToken, getDb } from './db';
import { User } from './types';

const COOKIE_NAME = 'lumion_session';

// ─── Valid invite codes ─────────────────────────────────────────────────────
// Only users with a valid invite code can register.
// In production with Supabase, these would be stored in a database table.
// For now, they are stored in SQLite and seeded on first run.

export function getValidInviteCodes(): string[] {
    const db = getDb();
    const rows = db.prepare('SELECT code FROM invite_codes WHERE used = 0').all() as { code: string }[];
    return rows.map(r => r.code);
}

export function useInviteCode(code: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT id FROM invite_codes WHERE code = ? AND used = 0').get(code) as { id: number } | undefined;
    if (!row) return false;
    db.prepare('UPDATE invite_codes SET used = 1, used_at = datetime(\'now\') WHERE id = ?').run(row.id);
    return true;
}

export function isValidInviteCode(code: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT id FROM invite_codes WHERE code = ? AND used = 0').get(code) as { id: number } | undefined;
    return !!row;
}

// ─── Session management ─────────────────────────────────────────────────────

export async function getSessionUser(): Promise<User | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return getUserFromToken(token);
}

export function getSessionCookieName(): string {
    return COOKIE_NAME;
}
