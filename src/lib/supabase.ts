// ─── Supabase Configuration ────────────────────────────────────────────────
// Detects if Supabase is configured via environment variables.
// Supports both the standard ANON_KEY and the legacy PUBLISHABLE_KEY name.

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
export const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    '';

export const isSupabaseEnabled = !!(supabaseUrl && supabaseKey);

// Log once at startup so deployment issues are immediately visible
if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    if (isSupabaseEnabled) {
        console.log(`[Lumion] Supabase enabled: ${supabaseUrl.replace(/https?:\/\//, '').slice(0, 20)}...`);
    } else {
        console.log('[Lumion] Supabase not configured — using SQLite fallback');
        if (supabaseUrl && !supabaseKey) {
            console.warn('[Lumion] ⚠ SUPABASE_URL is set but ANON_KEY is missing!');
        }
    }
}
