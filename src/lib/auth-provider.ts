import { isSupabaseEnabled } from './supabase';
import { User } from './types';
import crypto from 'crypto';

// ─── Auth Provider ──────────────────────────────────────────────────────────
// Abstracts auth operations. Uses Supabase when configured (Vercel production),
// falls back to local SQLite (local dev with hardware).

// ─── Password Hashing (shared) ──────────────────────────────────────────────

function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
    try {
        const [salt, hash] = stored.split(':');
        if (!salt || !hash) return false;
        const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return hash === verify;
    } catch {
        return false;
    }
}

// ─── Supabase implementation ────────────────────────────────────────────────

async function getSupabaseServer() {
    const { createClient } = await import('@/utils/supabase/server');
    return createClient();
}

async function supabaseCreateUser(email: string, name: string, password: string, company?: string): Promise<User> {
    const sb = await getSupabaseServer();
    const passwordHash = hashPassword(password);
    const { data, error } = await sb.from('users').insert({
        email, name, company: company || '', password_hash: passwordHash,
    }).select('id, email, name, company, created_at').single();
    if (error) {
        console.error('[Auth] Supabase createUser error:', error.message, error.code);
        throw new Error(`Failed to create user: ${error.message}`);
    }
    return data as User;
}

async function supabaseAuthenticateUser(email: string, password: string): Promise<User | null> {
    const sb = await getSupabaseServer();
    const { data, error } = await sb.from('users').select('*').eq('email', email).single();
    if (error) {
        // PGRST116 = no rows found (not an error for auth)
        if (error.code === 'PGRST116') return null;
        console.error('[Auth] Supabase authenticateUser error:', error.message, error.code);
        throw new Error(`Authentication failed: ${error.message}`);
    }
    if (!data) return null;
    if (!verifyPassword(password, data.password_hash)) return null;
    return { id: data.id, email: data.email, name: data.name, company: data.company || '', created_at: data.created_at };
}

async function supabaseGetUserById(id: number): Promise<User | null> {
    const sb = await getSupabaseServer();
    const { data, error } = await sb.from('users').select('id, email, name, company, created_at').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[Auth] Supabase getUserById error:', error.message);
        return null;
    }
    return data as User | null;
}

async function supabaseGetUserByEmail(email: string): Promise<User | null> {
    const sb = await getSupabaseServer();
    const { data, error } = await sb.from('users').select('id, email, name, company, created_at').eq('email', email).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[Auth] Supabase getUserByEmail error:', error.message);
        return null;
    }
    return data as User | null;
}

async function supabaseUpdateUser(id: number, fields: { name?: string; company?: string }): Promise<void> {
    const sb = await getSupabaseServer();
    const update: Record<string, string> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.company !== undefined) update.company = fields.company;
    const { error } = await sb.from('users').update(update).eq('id', id);
    if (error) {
        console.error('[Auth] Supabase updateUser error:', error.message);
        throw new Error(`Failed to update user: ${error.message}`);
    }
}

async function supabaseCreateSession(userId: number): Promise<string> {
    const sb = await getSupabaseServer();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb.from('auth_sessions').insert({ token, user_id: userId, expires_at: expiresAt });
    if (error) {
        console.error('[Auth] Supabase createSession error:', error.message, error.code);
        throw new Error(`Failed to create session: ${error.message}`);
    }
    return token;
}

async function supabaseGetUserFromToken(token: string): Promise<User | null> {
    const sb = await getSupabaseServer();
    const { data, error } = await sb.from('auth_sessions').select('user_id, expires_at').eq('token', token).single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[Auth] Supabase getUserFromToken error:', error.message);
        return null;
    }
    if (!data) return null;
    if (new Date(data.expires_at) < new Date()) return null;
    return supabaseGetUserById(data.user_id);
}

async function supabaseDeleteSession(token: string): Promise<void> {
    const sb = await getSupabaseServer();
    const { error } = await sb.from('auth_sessions').delete().eq('token', token);
    if (error) {
        console.error('[Auth] Supabase deleteSession error:', error.message);
    }
}

async function supabaseIsValidInviteCode(code: string): Promise<boolean> {
    const sb = await getSupabaseServer();
    const { data, error } = await sb.from('invite_codes').select('id').eq('code', code).eq('used', false).single();
    if (error) {
        if (error.code === 'PGRST116') return false;
        console.error('[Auth] Supabase isValidInviteCode error:', error.message);
        return false;
    }
    return !!data;
}

async function supabaseUseInviteCode(code: string): Promise<boolean> {
    const sb = await getSupabaseServer();
    const { data, error } = await sb.from('invite_codes').select('id').eq('code', code).eq('used', false).single();
    if (error || !data) return false;
    const { error: updateError } = await sb.from('invite_codes').update({ used: true, used_at: new Date().toISOString() }).eq('id', data.id);
    if (updateError) {
        console.error('[Auth] Supabase useInviteCode error:', updateError.message);
        return false;
    }
    return true;
}

// ─── SQLite implementation ──────────────────────────────────────────────────

function getSqliteDb() {
    // Dynamic require so it doesn't crash on Vercel (better-sqlite3 is native)
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getDb } = require('./db');
        return getDb();
    } catch (e) {
        console.error('[Auth] SQLite not available:', (e as Error).message);
        throw new Error('Database not available — set Supabase env vars for production');
    }
}

function sqliteCreateUser(email: string, name: string, password: string, company?: string): User {
    const db = getSqliteDb();
    const passwordHash = hashPassword(password);
    const result = db.prepare('INSERT INTO users (email, name, company, password_hash) VALUES (?, ?, ?, ?)').run(email, name, company || '', passwordHash);
    return { id: result.lastInsertRowid as number, email, name, company: company || '', created_at: new Date().toISOString() };
}

function sqliteAuthenticateUser(email: string, password: string): User | null {
    const db = getSqliteDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (!verifyPassword(password, row.password_hash as string)) return null;
    return { id: row.id as number, email: row.email as string, name: row.name as string, company: row.company as string, created_at: row.created_at as string };
}

function sqliteGetUserByEmail(email: string): User | null {
    const db = getSqliteDb();
    const row = db.prepare('SELECT id, email, name, company, created_at FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id as number, email: row.email as string, name: row.name as string, company: row.company as string, created_at: row.created_at as string };
}

function sqliteUpdateUser(id: number, fields: { name?: string; company?: string }): void {
    const db = getSqliteDb();
    if (fields.name !== undefined) db.prepare('UPDATE users SET name = ? WHERE id = ?').run(fields.name, id);
    if (fields.company !== undefined) db.prepare('UPDATE users SET company = ? WHERE id = ?').run(fields.company, id);
}

function sqliteCreateSession(userId: number): string {
    const db = getSqliteDb();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
    return token;
}

function sqliteGetUserFromToken(token: string): User | null {
    const db = getSqliteDb();
    const row = db.prepare(`
        SELECT u.id, u.email, u.name, u.company, u.created_at
        FROM sessions s JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > datetime('now')
    `).get(token) as Record<string, unknown> | undefined;
    if (!row) return null;
    return { id: row.id as number, email: row.email as string, name: row.name as string, company: row.company as string, created_at: row.created_at as string };
}

function sqliteDeleteSession(token: string): void {
    const db = getSqliteDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function sqliteIsValidInviteCode(code: string): boolean {
    const db = getSqliteDb();
    const row = db.prepare('SELECT id FROM invite_codes WHERE code = ? AND used = 0').get(code) as { id: number } | undefined;
    return !!row;
}

function sqliteUseInviteCode(code: string): boolean {
    const db = getSqliteDb();
    const row = db.prepare('SELECT id FROM invite_codes WHERE code = ? AND used = 0').get(code) as { id: number } | undefined;
    if (!row) return false;
    db.prepare("UPDATE invite_codes SET used = 1, used_at = datetime('now') WHERE id = ?").run(row.id);
    return true;
}

// ─── Exported API (auto-selects Supabase or SQLite) ─────────────────────────

export const auth = {
    createUser: (email: string, name: string, password: string, company?: string): Promise<User> =>
        isSupabaseEnabled ? supabaseCreateUser(email, name, password, company) : Promise.resolve(sqliteCreateUser(email, name, password, company)),

    authenticateUser: (email: string, password: string): Promise<User | null> =>
        isSupabaseEnabled ? supabaseAuthenticateUser(email, password) : Promise.resolve(sqliteAuthenticateUser(email, password)),

    getUserByEmail: (email: string): Promise<User | null> =>
        isSupabaseEnabled ? supabaseGetUserByEmail(email) : Promise.resolve(sqliteGetUserByEmail(email)),

    updateUser: (id: number, fields: { name?: string; company?: string }): Promise<void> =>
        isSupabaseEnabled ? supabaseUpdateUser(id, fields) : Promise.resolve(sqliteUpdateUser(id, fields)),

    createSession: (userId: number): Promise<string> =>
        isSupabaseEnabled ? supabaseCreateSession(userId) : Promise.resolve(sqliteCreateSession(userId)),

    getUserFromToken: (token: string): Promise<User | null> =>
        isSupabaseEnabled ? supabaseGetUserFromToken(token) : Promise.resolve(sqliteGetUserFromToken(token)),

    deleteSession: (token: string): Promise<void> =>
        isSupabaseEnabled ? supabaseDeleteSession(token) : Promise.resolve(sqliteDeleteSession(token)),

    isValidInviteCode: (code: string): Promise<boolean> =>
        isSupabaseEnabled ? supabaseIsValidInviteCode(code) : Promise.resolve(sqliteIsValidInviteCode(code)),

    useInviteCode: (code: string): Promise<boolean> =>
        isSupabaseEnabled ? supabaseUseInviteCode(code) : Promise.resolve(sqliteUseInviteCode(code)),
};
