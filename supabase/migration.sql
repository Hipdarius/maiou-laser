-- ─── Lumion Supabase Schema ──────────────────────────────────────────────────
-- Run this SQL in your Supabase SQL Editor to set up the auth tables.
-- Dashboard URL: https://supabase.com/dashboard → SQL Editor → New Query
--
-- These tables handle: users, auth sessions, and invite codes.
-- Telemetry data stays in local SQLite (runs with the hardware).

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    company TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Auth sessions (cookie-based)
CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    token TEXT UNIQUE NOT NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 3. Invite codes (single-use registration codes)
CREATE TABLE IF NOT EXISTS invite_codes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

-- Seed invite codes
INSERT INTO invite_codes (code) VALUES
    ('LUMION-2026'),
    ('BEAM-ALPHA'),
    ('IR-POWER-LUX'),
    ('PHOTON-ACCESS'),
    ('MAIOU-LASER')
ON CONFLICT (code) DO NOTHING;

-- Row Level Security (RLS) — lock down tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

-- Allow the anon key to read/write these tables (our API handles auth logic)
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON auth_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON invite_codes FOR ALL USING (true) WITH CHECK (true);
