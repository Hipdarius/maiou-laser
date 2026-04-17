import { NextResponse } from 'next/server';
import { isSupabaseEnabled, supabaseUrl } from '@/lib/supabase';

export async function GET() {
    const health: Record<string, unknown> = {
        ok: true,
        timestamp: new Date().toISOString(),
        node_env: process.env.NODE_ENV,
        database: isSupabaseEnabled ? 'supabase' : 'sqlite',
        supabase_url: supabaseUrl ? supabaseUrl.replace(/https?:\/\//, '').split('.')[0] + '...' : 'NOT SET',
        supabase_key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            ? 'set (ANON_KEY)'
            : process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                ? 'set (PUBLISHABLE_KEY)'
                : 'MISSING',
    };

    // If Supabase is enabled, test the connection
    if (isSupabaseEnabled) {
        try {
            const { createClient } = await import('@/utils/supabase/server');
            const sb = await createClient();

            // Test 1: Can we reach the database?
            const { error: pingError } = await sb.from('invite_codes').select('id').limit(1);
            if (pingError) {
                health.ok = false;
                health.supabase_connection = 'FAILED';
                health.supabase_error = pingError.message;
                health.supabase_error_code = pingError.code;

                // Common issues
                if (pingError.message.includes('relation') && pingError.message.includes('does not exist')) {
                    health.fix = 'Tables not created. Run supabase/migration.sql in your Supabase SQL Editor.';
                } else if (pingError.code === '42501' || pingError.message.includes('permission')) {
                    health.fix = 'RLS policies missing. Run supabase/migration.sql to add them.';
                } else if (pingError.message.includes('Invalid API key') || pingError.message.includes('invalid')) {
                    health.fix = 'Invalid Supabase key. Check NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel env vars. Get it from Supabase → Settings → API → anon public.';
                }
            } else {
                health.supabase_connection = 'OK';

                // Test 2: Check if critical tables exist
                const tables = ['users', 'auth_sessions', 'invite_codes', 'telemetry', 'events'];
                const missing: string[] = [];
                for (const table of tables) {
                    const { error: tErr } = await sb.from(table).select('id').limit(0);
                    if (tErr) missing.push(table);
                }
                if (missing.length > 0) {
                    health.ok = false;
                    health.missing_tables = missing;
                    health.fix = 'Run supabase/migration.sql to create missing tables.';
                } else {
                    health.tables = 'all present';
                }

                // Test 3: Check invite codes exist
                const { count } = await sb.from('invite_codes').select('id', { count: 'exact', head: true }).eq('used', false);
                health.available_invite_codes = count ?? 0;
                if ((count ?? 0) === 0) {
                    health.invite_warning = 'No unused invite codes. New users cannot register.';
                }
            }
        } catch (e) {
            health.ok = false;
            health.supabase_connection = 'ERROR';
            health.error = (e as Error).message;
        }
    }

    return NextResponse.json(health, { status: health.ok ? 200 : 503 });
}
