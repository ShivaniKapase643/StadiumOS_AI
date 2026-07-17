import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { Role } from '@/types';

interface RoleGateProps {
  roles: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
}
