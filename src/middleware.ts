import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register'];
const PUBLIC_API_PATHS = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/telemetry',      // Open for ESP32 hardware (has its own API key auth)
    '/api/telemetry/history',
    '/api/events',
];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public pages
    if (PUBLIC_PATHS.some(p => pathname === p)) {
        return NextResponse.next();
    }

    // Allow whitelisted API routes
    if (PUBLIC_API_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow static files and Next.js internals
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check for session cookie (existence check in middleware, full validation in API routes)
    const session = request.cookies.get('lumion_session');
    if (!session?.value) {
        // For API routes, return 401 instead of redirect
        if (pathname.startsWith('/api/')) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        return NextResponse.redirect(new URL('/login', request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
