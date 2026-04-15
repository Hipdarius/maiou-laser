// ─── Supabase Configuration ────────────────────────────────────────────────
// Detects if Supabase is configured via environment variables.
// Auth-provider uses the SSR helpers from src/utils/supabase/ for cookie-aware clients.
// This module just exports the detection flag.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseEnabled = !!(supabaseUrl && supabaseKey);
