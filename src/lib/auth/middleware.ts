import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { UserRole } from '@prisma/client';

export type AuthOptions = {
  requiredRole?: UserRole;
};

/**
 * Middleware for protecting API routes based on authentication and roles
 * @param req - Next.js request
 * @param options - Authentication options including required role
 * @returns NextResponse or null if authorized
 */
export async function withAuth(
  req: NextRequest,
  options: AuthOptions = {}
) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Not authenticated
  if (!token) {
    return NextResponse.json(
      { error: 'You must be signed in to access this endpoint' },
      { status: 401 }
    );
  }

  // Role-based access control
  if (options.requiredRole && token.role !== options.requiredRole) {
    return NextResponse.json(
      { error: 'You do not have permission to access this resource' },
      { status: 403 }
    );
  }

  // User is authenticated and has required role
  return null;
}