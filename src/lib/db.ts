import Database from 'better-sqlite3';
import path from 'path';
import { TelemetryFrame, EventEntry } from './types';

// ─── SQLite Connection ──────────────────────────────────────────────────────
const DB_PATH = path.join(process.cwd(), 'data', 'beamdock.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (!_db) {
        // Ensure data directory exists
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
  `);
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
