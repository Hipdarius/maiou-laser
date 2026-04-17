-- ═══════════════════════════════════════════════════════════════════════════════
-- Lumion — Supabase Database Setup
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Run this ONCE in your Supabase SQL Editor:
--   supabase.com → Dashboard → SQL Editor → New Query → Paste → Run
--
-- This creates all tables, indexes, RLS policies, and seed data.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT).
--
-- After running this, set these env vars on Vercel:
--   NEXT_PUBLIC_SUPABASE_URL       = https://your-project.supabase.co
--   NEXT_PUBLIC_SUPABASE_ANON_KEY  = eyJ... (from Supabase → Settings → API)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. DROP old policies if re-running ────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow all for anon" ON users;
  DROP POLICY IF EXISTS "Allow all for anon" ON auth_sessions;
  DROP POLICY IF EXISTS "Allow all for anon" ON invite_codes;
  DROP POLICY IF EXISTS "Allow all for anon" ON telemetry;
  DROP POLICY IF EXISTS "Allow all for anon" ON events;
  DROP POLICY IF EXISTS "Allow all for anon" ON devices;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;


-- ─── 2. TABLES ─────────────────────────────────────────────────────────────────

-- Users
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  company TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth sessions (cookie-based, managed by Next.js API)
CREATE TABLE IF NOT EXISTS auth_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Invite codes (single-use registration)
CREATE TABLE IF NOT EXISTS invite_codes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Telemetry (streaming sensor data)
-- user_id is NULLABLE because the simulator runs without a logged-in user
CREATE TABLE IF NOT EXISTS telemetry (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  transmitter_on BOOLEAN NOT NULL DEFAULT false,
  beam_locked BOOLEAN NOT NULL DEFAULT false,
  safety_ok BOOLEAN NOT NULL DEFAULT true,
  receiver_voltage REAL NOT NULL DEFAULT 0,
  receiver_current REAL NOT NULL DEFAULT 0,
  received_power REAL NOT NULL DEFAULT 0,
  supercap_voltage REAL NOT NULL DEFAULT 0,
  energy_delivered_j REAL NOT NULL DEFAULT 0,
  distance_cm REAL NOT NULL DEFAULT 0,
  temperature_c REAL NOT NULL DEFAULT 0
);

-- Events (system event log)
-- user_id is NULLABLE because simulator events have no user
CREATE TABLE IF NOT EXISTS events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  session_id TEXT NOT NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL
);

-- Devices (registered hardware units)
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ─── 3. INDEXES ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(token);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_telemetry_session ON telemetry(session_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_ts ON telemetry(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_devices_user ON devices(user_id);


-- ─── 4. ROW LEVEL SECURITY ────────────────────────────────────────────────────
-- Our app handles auth server-side via session tokens.
-- RLS policies allow anon key full access (Next.js API validates permissions).

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON users         FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON auth_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON invite_codes  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON telemetry     FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON events        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON devices       FOR ALL TO anon USING (true) WITH CHECK (true);


-- ─── 5. SEED DATA ─────────────────────────────────────────────────────────────

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
  ('LUMION-BETA-05')
ON CONFLICT (code) DO NOTHING;


-- ─── 6. VERIFY ─────────────────────────────────────────────────────────────────

SELECT '✓ Lumion database setup complete' AS status;
SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS columns
FROM information_schema.tables t
WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
