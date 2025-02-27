import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { ComponentType } from 'react';

export interface RoleProtectionProps {
  requiredRole?: UserRole;
}

export function withRoleProtection<T extends object>(
  WrappedComponent: ComponentType<T>,
  requiredRole?: UserRole
) {
  return function ProtectedComponent(props: T) {
    const { data: session, status } = useSession();

    if (status === 'loading') {
      return <div>Loading...</div>;
    }

    if (status === 'unauthenticated') {
      redirect('/auth/signin');
    }

    if (requiredRole && session?.user?.role !== requiredRole) {
      redirect('/unauthorized');
    }

    return <WrappedComponent {...props} />;
  };
}