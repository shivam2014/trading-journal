'use client';

import { SessionProvider } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();

  useEffect(() => {
    // Handle authentication errors
    const handleAuthError = (event: StorageEvent) => {
      if (event.key === 'nextauth.message') {
        try {
          const message = event.newValue ? JSON.parse(event.newValue) : null;
          if (message?.type === 'error') {
            toast.error(message.message || 'Authentication error');
            router.push('/auth/signin');
          }
        } catch (error) {
          console.error('Error parsing auth message:', error);
        }
      }
    };

    window.addEventListener('storage', handleAuthError);
    return () => window.removeEventListener('storage', handleAuthError);
  }, [router]);

  return (
    <SessionProvider refetchInterval={5 * 60} // Refetch session every 5 minutes
    >
      {children}
    </SessionProvider>
  );
}

export default AuthProvider;