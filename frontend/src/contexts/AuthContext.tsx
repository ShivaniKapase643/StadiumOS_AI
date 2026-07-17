import { createContext, useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import type { AuthUser } from '@/types';
import { tokenStorage } from '@/services/api';
import * as authService from '@/services/auth.service';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: { name: string; email: string; password: string; phone?: string; role: 'FAN' | 'VOLUNTEER' | 'VENDOR' }) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      if (!tokenStorage.getAccess()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authService.getMe();
        setUser(me);
      } catch {
        tokenStorage.clear();
      } finally {
        setIsLoading(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authService.login(email, password);
    tokenStorage.setTokens(result.accessToken, result.refreshToken);
    setUser(result.user);
    return result.user;
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string; role: 'FAN' | 'VOLUNTEER' | 'VENDOR' }) => {
      const result = await authService.register(input);
      tokenStorage.setTokens(result.accessToken, result.refreshToken);
      setUser(result.user);
      return result.user;
    },
    []
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefresh();
    tokenStorage.clear();
    setUser(null);
    if (refreshToken) {
      await authService.logout(refreshToken).catch(() => undefined);
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, register, logout }), [user, isLoading, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
