import Database from 'better-sqlite3';
import path from 'path';
import { TelemetryFrame, EventEntry, User } from './types';
import crypto from 'crypto';

// ─── SQLite Connection ──────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), 'data', 'lumion.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (!_db) {
        const fs = require('fs');
        const dir = path.dirname(DB_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        _db = new Database(DB_PATH);
        _db.pragma('journal_mode = WAL');
        initSchema(_db);
    }
    return _db;
}

// ─── Schema ─────────────────────────────────────────────────────────────────
function initSchema(db: Database.Database) {
    db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      company TEXT DEFAULT '',
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS telemetry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      transmitter_on INTEGER NOT NULL DEFAULT 0,
      beam_locked INTEGER NOT NULL DEFAULT 0,
      safety_ok INTEGER NOT NULL DEFAULT 1,
      receiver_voltage REAL NOT NULL DEFAULT 0,
      receiver_current REAL NOT NULL DEFAULT 0,
      received_power REAL NOT NULL DEFAULT 0,
      supercap_voltage REAL NOT NULL DEFAULT 0,
      energy_delivered_j REAL NOT NULL DEFAULT 0,
      distance_cm REAL NOT NULL DEFAULT 0,
      temperature_c REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      session_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      message TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry(session_id);
    CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(timestamp);
    CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
    CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp);
    CREATE TABLE IF NOT EXISTS invite_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_invite_codes ON invite_codes(code);
  `);

    // Seed default invite codes if table is empty
    const count = db.prepare('SELECT COUNT(*) as n FROM invite_codes').get() as { n: number };
    if (count.n === 0) {
        const codes = ['LUMION-2026', 'BEAM-ALPHA', 'IR-POWER-LUX', 'PHOTON-ACCESS', 'MAIOU-LASER'];
        const stmt = db.prepare('INSERT INTO invite_codes (code) VALUES (?)');
        for (const code of codes) {
            stmt.run(code);
        }
    }
}

// ─── Password Hashing ──────────────────────────────────────────────────────
function hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
    const [salt, hash] = stored.split(':');
    const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verify;
}

// ─── User Operations ───────────────────────────────────────────────────────
export function createUser(email: string, name: string, password: string, company?: string): User {
    const db = getDb();
    const passwordHash = hashPassword(password);
    const stmt = db.prepare('INSERT INTO users (email, name, company, password_hash) VALUES (?, ?, ?, ?)');
    const result = stmt.run(email, name, company || '', passwordHash);
    return {
        id: result.lastInsertRowid as number,
        email,
        name,
        company: company || '',
        created_at: new Date().toISOString(),
    };
}

export function authenticateUser(email: string, password: string): User | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (!verifyPassword(password, row.password_hash as string)) return null;
    return {
        id: row.id as number,
        email: row.email as string,
        name: row.name as string,
        company: row.company as string,
        created_at: row.created_at as string,
    };
}

export function getUserById(id: number): User | null {
    const db = getDb();
    const row = db.prepare('SELECT id, email, name, company, created_at FROM users WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
        id: row.id as number,
        email: row.email as string,
        name: row.name as string,
        company: row.company as string,
        created_at: row.created_at as string,
    };
}

export function getUserByEmail(email: string): User | null {
    const db = getDb();
    const row = db.prepare('SELECT id, email, name, company, created_at FROM users WHERE email = ?').get(email) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
        id: row.id as number,
        email: row.email as string,
        name: row.name as string,
        company: row.company as string,
        created_at: row.created_at as string,
    };
}

export function updateUser(id: number, fields: { name?: string; company?: string }): void {
    const db = getDb();
    if (fields.name !== undefined) {
        db.prepare('UPDATE users SET name = ? WHERE id = ?').run(fields.name, id);
    }
    if (fields.company !== undefined) {
        db.prepare('UPDATE users SET company = ? WHERE id = ?').run(fields.company, id);
    }
}

// ─── Session (Auth) Operations ─────────────────────────────────────────────
export function createSession(userId: number): string {
    const db = getDb();
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').run(token, userId, expiresAt);
    return token;
}

export function getUserFromToken(token: string): User | null {
    const db = getDb();
    const row = db.prepare(`
    SELECT u.id, u.email, u.name, u.company, u.created_at
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.token = ? AND s.expires_at > datetime('now')
  `).get(token) as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
        id: row.id as number,
        email: row.email as string,
        name: row.name as string,
        company: row.company as string,
        created_at: row.created_at as string,
    };
}

export function deleteSession(token: string): void {
    const db = getDb();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

// ─── Telemetry Operations ───────────────────────────────────────────────────
export function insertTelemetry(frame: TelemetryFrame): void {
    const db = getDb();
    const stmt = db.prepare(`
    INSERT INTO telemetry (timestamp, session_id, transmitter_on, beam_locked, safety_ok,
      receiver_voltage, receiver_current, received_power, supercap_voltage,
      energy_delivered_j, distance_cm, temperature_c)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(
        frame.timestamp, frame.session_id,
        frame.transmitter_on ? 1 : 0, frame.beam_locked ? 1 : 0, frame.safety_ok ? 1 : 0,
        frame.receiver_voltage, frame.receiver_current, frame.received_power,
        frame.supercap_voltage, frame.energy_delivered_j, frame.distance_cm, frame.temperature_c
    );
}

export function getLatestTelemetry(): TelemetryFrame | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM telemetry ORDER BY id DESC LIMIT 1').get() as Record<string, unknown> | undefined;
    return row ? rowToFrame(row) : null;
}

export function getTelemetryHistory(limit: number = 60): TelemetryFrame[] {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM telemetry ORDER BY id DESC LIMIT ?').all(limit) as Record<string, unknown>[];
    return rows.map(rowToFrame).reverse();
}

function rowToFrame(row: Record<string, unknown>): TelemetryFrame {
    return {
        timestamp: row.timestamp as string,
        session_id: row.session_id as string,
        transmitter_on: row.transmitter_on === 1,
        beam_locked: row.beam_locked === 1,
        safety_ok: row.safety_ok === 1,
        receiver_voltage: row.receiver_voltage as number,
        receiver_current: row.receiver_current as number,
        received_power: row.received_power as number,
        supercap_voltage: row.supercap_voltage as number,
        energy_delivered_j: row.energy_delivered_j as number,
        distance_cm: row.distance_cm as number,
        temperature_c: row.temperature_c as number,
    };
}

// ─── Event Operations ───────────────────────────────────────────────────────
export function insertEvent(event: EventEntry): void {
    const db = getDb();
    const stmt = db.prepare('INSERT INTO events (timestamp, session_id, type, message) VALUES (?, ?, ?, ?)');
    stmt.run(event.timestamp, event.session_id, event.type, event.message);
}

export function getEvents(limit: number = 50): EventEntry[] {
    const db = getDb();
    return db.prepare('SELECT * FROM events ORDER BY id DESC LIMIT ?').all(limit) as EventEntry[];
}

export function getEventsBySession(sessionId: string): EventEntry[] {
    const db = getDb();
    return db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY id DESC').all(sessionId) as EventEntry[];
}

// ─── Telemetry Session Summaries ────────────────────────────────────────────
export function getSessionSummaries() {
    const db = getDb();
    return db.prepare(`
    SELECT
      session_id,
      MIN(timestamp) as started_at,
      COUNT(*) as frame_count,
      MAX(energy_delivered_j) as total_energy_j,
      MAX(received_power) as peak_power_w,
      (SELECT COUNT(*) FROM events e WHERE e.session_id = t.session_id) as event_count
    FROM telemetry t
    GROUP BY session_id
    ORDER BY MIN(timestamp) DESC
    LIMIT 50
  `).all();
}
