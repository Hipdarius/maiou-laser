-- ─── Lumion Supabase Schema ──────────────────────────────────────────────────
-- Run this SQL in your Supabase SQL Editor to set up all tables.
-- Dashboard URL: https://supabase.com/dashboard → SQL Editor → New Query
--
-- These tables handle: users, auth sessions, invite codes, devices, telemetry, events.
-- On Vercel, all data persists in Supabase. Locally, SQLite is used as fallback.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. AUTH TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1a. Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Auth sessions (cookie-based)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 1c. Invite codes (single-use registration codes)
CREATE TABLE IF NOT EXISTS invite_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. DEVICE & DATA TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- 2a. Devices — registered hardware units per user
CREATE TABLE IF NOT EXISTS devices (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Lumion TX-1',
    type TEXT NOT NULL DEFAULT 'transmitter',
    status TEXT NOT NULL DEFAULT 'offline',
    firmware_version TEXT DEFAULT '1.0.0',
    api_key TEXT UNIQUE,
    config JSONB DEFAULT '{}',
    last_seen_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2b. Telemetry — streaming sensor data from hardware
CREATE TABLE IF NOT EXISTS telemetry (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id BIGINT REFERENCES devices(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transmitter_on BOOLEAN DEFAULT false,
    beam_locked BOOLEAN DEFAULT false,
    safety_ok BOOLEAN DEFAULT true,
    receiver_voltage REAL DEFAULT 0,
    receiver_current REAL DEFAULT 0,
    received_power REAL DEFAULT 0,
    supercap_voltage REAL DEFAULT 0,
    energy_delivered_j REAL DEFAULT 0,
    distance_cm REAL DEFAULT 0,
    temperature_c REAL DEFAULT 0
);

-- 2c. Events — system event log
CREATE TABLE IF NOT EXISTS events (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    device_id BIGINT REFERENCES devices(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    type TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_user ON telemetry(user_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user ON events(user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SEED DATA
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO invite_codes (code) VALUES
    ('LUMION-2026'),
    ('BEAM-ALPHA'),
    ('IR-POWER-LUX'),
    ('PHOTON-ACCESS'),
    ('MAIOU-LASER'),
    ('LUMION-BETA-01'),
    ('LUMION-BETA-02'),
    ('LUMION-BETA-03'),
    ('LUMION-BETA-04'),
    ('LUMION-BETA-05'),
    ('LUMION-BETA-06'),
    ('LUMION-BETA-07'),
    ('LUMION-BETA-08'),
    ('LUMION-BETA-09'),
    ('LUMION-BETA-10')
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Allow the anon/publishable key full access (our API handles auth logic)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for anon' AND tablename = 'users') THEN
        CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for anon' AND tablename = 'auth_sessions') THEN
        CREATE POLICY "Allow all for anon" ON auth_sessions FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for anon' AND tablename = 'invite_codes') THEN
        CREATE POLICY "Allow all for anon" ON invite_codes FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for anon' AND tablename = 'devices') THEN
        CREATE POLICY "Allow all for anon" ON devices FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for anon' AND tablename = 'telemetry') THEN
        CREATE POLICY "Allow all for anon" ON telemetry FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all for anon' AND tablename = 'events') THEN
        CREATE POLICY "Allow all for anon" ON events FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
