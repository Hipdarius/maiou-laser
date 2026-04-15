import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/login', '/api/auth/register'];
const API_PATHS = ['/api/'];

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Allow public paths
    if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow API routes (they handle their own auth or are telemetry endpoints for ESP32)
    if (API_PATHS.some(p => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    // Allow static files and Next.js internals
    if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')) {
        return NextResponse.next();
    }

    // Check for session cookie
    const session = request.cookies.get('lumion_session');
    if (!session?.value) {
        const loginUrl = new URL('/login', request.url);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
