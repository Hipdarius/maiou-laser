import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        ok: true,
        supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
        supabase_key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ? 'set' : 'MISSING',
        node_env: process.env.NODE_ENV,
    });
}
