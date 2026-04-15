import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─── Supabase Configuration ────────────────────────────────────────────────
// When NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set,
// auth (users, sessions, invite_codes) uses Supabase PostgreSQL.
// When not set, the app falls back to local SQLite for everything.
//
// Telemetry data always uses local SQLite (it runs with the hardware).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey);

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!_supabase) {
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.');
        }
        _supabase = createClient(supabaseUrl, supabaseAnonKey);
    }
    return _supabase;
}
