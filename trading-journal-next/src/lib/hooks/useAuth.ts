import { useSession, signIn, signOut } from 'next-auth/react';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginCredentials, RegisterCredentials, AuthResponse } from '@/lib/auth/types';

interface UseAuthOptions {
  redirectTo?: string;
  onError?: (error: string) => void;
}

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<AuthResponse> => {
      try {
        const result = await signIn('credentials', {
          ...credentials,
          redirect: false,
        });

        if (result?.error) {
          options.onError?.(result.error);
          return {
            success: false,
            error: {
              type: 'auth',
              message: result.error,
            },
          };
        }

        if (options.redirectTo) {
          router.push(options.redirectTo);
        }

        return {
          success: true,
          user: session?.user,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Login failed';
        options.onError?.(message);
        return {
          success: false,
          error: {
            type: 'system',
            message,
          },
        };
      }
    },
    [session, router, options]
  );

  const register = useCallback(
    async (credentials: RegisterCredentials): Promise<AuthResponse> => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(credentials),
        });

        const data = await response.json();

        if (!response.ok) {
          options.onError?.(data.error || 'Registration failed');
          return {
            success: false,
            error: {
              type: data.code || 'system',
              message: data.error || 'Registration failed',
            },
          };
        }

        // Automatically log in after successful registration
        return login({
          email: credentials.email,
          password: credentials.password,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Registration failed';
        options.onError?.(message);
        return {
          success: false,
          error: {
            type: 'system',
            message,
          },
        };
      }
    },
    [login, options]
  );

  const logout = useCallback(async () => {
    try {
      await signOut({ redirect: false });
      if (options.redirectTo) {
        router.push(options.redirectTo);
      }
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      options.onError?.(message);
      return {
        success: false,
        error: {
          type: 'system',
          message,
        },
      };
    }
  }, [router, options]);

  const refreshSession = useCallback(async () => {
    await update();
  }, [update]);

  return {
    // Session state
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',

    // Auth methods
    login,
    register,
    logout,
    refreshSession,

    // Helper methods
    isAdmin: session?.user?.role === 'ADMIN',
    requiresAuth: useCallback(
      (callback: () => void) => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') {
          signIn();
          return;
        }
        callback();
      },
      [status]
    ),
  };
}

// Export types
export type { LoginCredentials, RegisterCredentials, AuthResponse };