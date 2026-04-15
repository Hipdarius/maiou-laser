import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Supabase is optional — if env vars are not set, the app falls back to local SQLite auth.
// To enable Supabase:
//   1. Create a project at https://supabase.com
//   2. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
//   3. Optionally set SUPABASE_SERVICE_ROLE_KEY for server-side admin operations

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseEnabled = !!(supabaseUrl && supabaseAnonKey);

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
    if (!isSupabaseEnabled) return null;
    if (!_supabase) {
        _supabase = createClient(supabaseUrl!, supabaseAnonKey!);
    }
    return _supabase;
}

// Server-side client with service role key (for admin operations like invite codes)
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;
    if (!_supabaseAdmin) {
        _supabaseAdmin = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false },
        });
    }
    return _supabaseAdmin;
}
