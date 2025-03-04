import { User as PrismaUser } from '@prisma/client';
import 'next-auth';
import { JWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User extends PrismaUser {}
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
    email: string;
    name?: string;
    picture?: string;
    sub?: string;
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  image?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name: string;
}

export interface AuthError {
  type: string;
  message: string;
}

export type AuthResponse = {
  success: boolean;
  message?: string;
  error?: AuthError;
  user?: AuthenticatedUser;
};