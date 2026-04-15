import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

const PUBLIC_PATHS = ['/login', '/register'];
const PUBLIC_API_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/telemetry',
    '/api/telemetry/history',
    '/api/events',
];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public pages
    if (PUBLIC_PATHS.some(p => pathname === p)) {
        return updateSession(request);
    }

    // Allow whitelisted API routes
    if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow static files and Next.js internals
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check for session cookie
    const session = request.cookies.get('lumion_session');
    if (!session?.value) {
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // Refresh Supabase session if configured
    return updateSession(request);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
