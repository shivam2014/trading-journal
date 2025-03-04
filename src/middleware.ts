import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import type { NextRequest } from 'next/server';

// Configure paths that require authentication
const AUTH_PATHS = [
  '/trades',
  '/settings',
  '/analysis',
  '/api/trades',
  '/api/analysis',
];

// Configure paths that require admin role
const ADMIN_PATHS = [
  '/admin',
  '/api/admin',
];

// Paths that should be accessible only to non-authenticated users
const PUBLIC_ONLY_PATHS = [
  '/auth/signin',
  '/auth/register',
];

// Security headers configuration
const securityHeaders = {
  // Enable DNS prefetch
  'X-DNS-Prefetch-Control': 'on',
  
  // Disable iframes embedding from other domains
  'X-Frame-Options': 'SAMEORIGIN',
  
  // XSS protection
  'X-XSS-Protection': '1; mode=block',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Referrer policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' https:",
  ].join('; '),
  
  // Permissions policy
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=()',
  ].join(', '),
  
  // Strict Transport Security
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
};

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;
  let response = NextResponse.next();

  // Redirect authenticated users away from public-only paths
  if (PUBLIC_ONLY_PATHS.some(path => pathname.startsWith(path)) && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Handle non-authenticated users trying to access protected routes
  if (AUTH_PATHS.some(path => pathname.startsWith(path)) && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Handle non-admin users trying to access admin routes
  if (ADMIN_PATHS.some(path => pathname.startsWith(path)) && (!token || token.role !== 'ADMIN')) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 403 }
    );
  }

  // Add user info to headers for API routes
  if (token && pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', token.id);
    requestHeaders.set('x-user-role', token.role);
    requestHeaders.set('x-user-email', token.email);

    response = NextResponse.next({
      headers: requestHeaders,
    });
  }

  // Apply security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * 1. /api/auth/* (authentication endpoints)
     * 2. /_next/* (Next.js internals)
     * 3. /static/* (static files)
     * 4. /*.* (files with extensions)
     */
    '/((?!api/auth|_next|static|[\\w-]+\\.\\w+).*)',
  ],
};