import { isSupabaseEnabled } from './supabase';
import { TelemetryFrame, EventEntry, Device, SessionSummary } from './types';

// ─── Data Provider ─────────────────────────────────────────────────────────
// Abstracts telemetry, events, and device operations.
// Uses Supabase when configured (production/Vercel), SQLite fallback (local dev).

// ─── Supabase implementations ──────────────────────────────────────────────

async function getSupabaseServer() {
    const { createClient } = await import('@/utils/supabase/server');
    return createClient();
}

async function sbInsertTelemetry(frame: TelemetryFrame, userId?: number): Promise<void> {
    const sb = await getSupabaseServer();
    await sb.from('telemetry').insert({
        session_id: frame.session_id,
        timestamp: frame.timestamp,
        user_id: userId || 1,
        transmitter_on: frame.transmitter_on,
        beam_locked: frame.beam_locked,
        safety_ok: frame.safety_ok,
        receiver_voltage: frame.receiver_voltage,
        receiver_current: frame.receiver_current,
        received_power: frame.received_power,
        supercap_voltage: frame.supercap_voltage,
        energy_delivered_j: frame.energy_delivered_j,
        distance_cm: frame.distance_cm,
        temperature_c: frame.temperature_c,
    });
}

async function sbGetLatestTelemetry(): Promise<TelemetryFrame | null> {
    const sb = await getSupabaseServer();
    const { data } = await sb.from('telemetry')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();
    return data ? sbRowToFrame(data) : null;
}

async function sbGetTelemetryHistory(limit: number = 60): Promise<TelemetryFrame[]> {
    const sb = await getSupabaseServer();
    const { data } = await sb.from('telemetry')
        .select('*')
        .order('id', { ascending: false })
        .limit(limit);
    return (data || []).map(sbRowToFrame).reverse();
}

function sbRowToFrame(row: Record<string, unknown>): TelemetryFrame {
    return {
        timestamp: row.timestamp as string,
        session_id: row.session_id as string,
        transmitter_on: Boolean(row.transmitter_on),
        beam_locked: Boolean(row.beam_locked),
        safety_ok: Boolean(row.safety_ok),
        receiver_voltage: row.receiver_voltage as number,
        receiver_current: row.receiver_current as number,
        received_power: row.received_power as number,
        supercap_voltage: row.supercap_voltage as number,
        energy_delivered_j: row.energy_delivered_j as number,
        distance_cm: row.distance_cm as number,
        temperature_c: row.temperature_c as number,
    };
}

async function sbInsertEvent(event: EventEntry, userId?: number): Promise<void> {
    const sb = await getSupabaseServer();
    await sb.from('events').insert({
        session_id: event.session_id,
        timestamp: event.timestamp,
        user_id: userId || 1,
        type: event.type,
        message: event.message,
    });
}

async function sbGetEvents(limit: number = 50): Promise<EventEntry[]> {
    const sb = await getSupabaseServer();
    const { data } = await sb.from('events')
        .select('*')
        .order('id', { ascending: false })
        .limit(limit);
    return (data || []) as EventEntry[];
}

async function sbGetEventsBySession(sessionId: string): Promise<EventEntry[]> {
    const sb = await getSupabaseServer();
    const { data } = await sb.from('events')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: false });
    return (data || []) as EventEntry[];
}

async function sbGetSessionSummaries(): Promise<SessionSummary[]> {
    const sb = await getSupabaseServer();
    // Use raw SQL via RPC or aggregate manually
    const { data: sessions } = await sb.from('telemetry')
        .select('session_id')
        .order('id', { ascending: false })
        .limit(1000);

    if (!sessions || sessions.length === 0) return [];

    const uniqueSessions = [...new Set(sessions.map(s => s.session_id))].slice(0, 50);
    const summaries: SessionSummary[] = [];

    for (const sid of uniqueSessions) {
        const { data: frames } = await sb.from('telemetry')
            .select('timestamp, received_power, energy_delivered_j')
            .eq('session_id', sid)
            .order('timestamp', { ascending: true });

        const { count: eventCount } = await sb.from('events')
            .select('id', { count: 'exact', head: true })
            .eq('session_id', sid);

        if (frames && frames.length > 0) {
            summaries.push({
                session_id: sid,
                started_at: frames[0].timestamp,
                frame_count: frames.length,
                total_energy_j: Math.max(...frames.map(f => f.energy_delivered_j || 0)),
                peak_power_w: Math.max(...frames.map(f => f.received_power || 0)),
                event_count: eventCount || 0,
            });
        }
    }

    return summaries;
}

// ─── Device operations (Supabase) ──────────────────────────────────────────

async function sbGetDevices(userId: number): Promise<Device[]> {
    const sb = await getSupabaseServer();
    const { data } = await sb.from('devices')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    return (data || []) as Device[];
}

async function sbCreateDevice(userId: number, name: string, type: string): Promise<Device> {
    const sb = await getSupabaseServer();
    const crypto = await import('crypto');
    const apiKey = crypto.randomBytes(24).toString('hex');
    const { data, error } = await sb.from('devices').insert({
        user_id: userId,
        name,
        type,
        api_key: apiKey,
        config: {},
    }).select('*').single();
    if (error) throw new Error(error.message);
    return data as Device;
}

async function sbUpdateDevice(id: number, fields: Partial<Device>): Promise<void> {
    const sb = await getSupabaseServer();
    const update: Record<string, unknown> = {};
    if (fields.name !== undefined) update.name = fields.name;
    if (fields.status !== undefined) update.status = fields.status;
    if (fields.firmware_version !== undefined) update.firmware_version = fields.firmware_version;
    if (fields.config !== undefined) update.config = fields.config;
    if (fields.last_seen_at !== undefined) update.last_seen_at = fields.last_seen_at;
    await sb.from('devices').update(update).eq('id', id);
}

async function sbDeleteDevice(id: number): Promise<void> {
    const sb = await getSupabaseServer();
    await sb.from('devices').delete().eq('id', id);
}

// ─── SQLite implementations ────────────────────────────────────────────────

function getSqlite() {
    try {
        const { insertTelemetry, getLatestTelemetry, getTelemetryHistory, insertEvent, getEvents, getEventsBySession, getSessionSummaries } = require('./db');
        return { insertTelemetry, getLatestTelemetry, getTelemetryHistory, insertEvent, getEvents, getEventsBySession, getSessionSummaries };
    } catch {
        throw new Error('SQLite not available — set Supabase env vars for production');
    }
}

// ─── Exported API (auto-selects Supabase or SQLite) ────────────────────────

export const data = {
    // Telemetry
    insertTelemetry: (frame: TelemetryFrame, userId?: number): Promise<void> =>
        isSupabaseEnabled ? sbInsertTelemetry(frame, userId) : Promise.resolve(getSqlite().insertTelemetry(frame)),

    getLatestTelemetry: (): Promise<TelemetryFrame | null> =>
        isSupabaseEnabled ? sbGetLatestTelemetry() : Promise.resolve(getSqlite().getLatestTelemetry()),

    getTelemetryHistory: (limit?: number): Promise<TelemetryFrame[]> =>
        isSupabaseEnabled ? sbGetTelemetryHistory(limit) : Promise.resolve(getSqlite().getTelemetryHistory(limit)),

    getSessionSummaries: (): Promise<SessionSummary[]> =>
        isSupabaseEnabled ? sbGetSessionSummaries() : Promise.resolve(getSqlite().getSessionSummaries()),

    // Events
    insertEvent: (event: EventEntry, userId?: number): Promise<void> =>
        isSupabaseEnabled ? sbInsertEvent(event, userId) : Promise.resolve(getSqlite().insertEvent(event)),

    getEvents: (limit?: number): Promise<EventEntry[]> =>
        isSupabaseEnabled ? sbGetEvents(limit) : Promise.resolve(getSqlite().getEvents(limit)),

    getEventsBySession: (sessionId: string): Promise<EventEntry[]> =>
        isSupabaseEnabled ? sbGetEventsBySession(sessionId) : Promise.resolve(getSqlite().getEventsBySession(sessionId)),

    // Devices (Supabase only — no SQLite equivalent needed for local dev)
    getDevices: (userId: number): Promise<Device[]> =>
        isSupabaseEnabled ? sbGetDevices(userId) : Promise.resolve([]),

    createDevice: (userId: number, name: string, type: string): Promise<Device> =>
        isSupabaseEnabled ? sbCreateDevice(userId, name, type) : Promise.reject(new Error('Devices require Supabase')),

    updateDevice: (id: number, fields: Partial<Device>): Promise<void> =>
        isSupabaseEnabled ? sbUpdateDevice(id, fields) : Promise.resolve(),

    deleteDevice: (id: number): Promise<void> =>
        isSupabaseEnabled ? sbDeleteDevice(id) : Promise.resolve(),
};
