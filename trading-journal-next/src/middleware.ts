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

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const { pathname } = request.nextUrl;

  // Check if the path requires authentication
  const isAuthPath = AUTH_PATHS.some(path => pathname.startsWith(path));
  const isAdminPath = ADMIN_PATHS.some(path => pathname.startsWith(path));
  const isPublicOnlyPath = PUBLIC_ONLY_PATHS.some(path => pathname.startsWith(path));

  // Redirect authenticated users away from public-only paths
  if (isPublicOnlyPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Handle non-authenticated users trying to access protected routes
  if (isAuthPath && !token) {
    const signInUrl = new URL('/auth/signin', request.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Handle non-admin users trying to access admin routes
  if (isAdminPath && (!token || token.role !== 'ADMIN')) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      {
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  // Add user info to headers for API routes
  if (token && pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', token.id);
    requestHeaders.set('x-user-role', token.role);
    requestHeaders.set('x-user-email', token.email);

    return NextResponse.next({
      headers: requestHeaders,
    });
  }

  return NextResponse.next();
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