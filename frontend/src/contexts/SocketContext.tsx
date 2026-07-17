import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { tokenStorage } from '@/services/api';
import { AuthContext } from './AuthContext';

interface SocketContextValue {
  socket: Socket | null;
}

// eslint-disable-next-line react-refresh/only-export-components
export const SocketContext = createContext<SocketContextValue>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const auth = useContext(AuthContext);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!auth?.user) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return;
    }

    const instance = io(import.meta.env.VITE_SOCKET_URL ?? '/', {
      path: '/socket.io',
      auth: { token: tokenStorage.getAccess() },
      transports: ['websocket', 'polling'],
    });
    setSocket(instance);

    return () => {
      instance.disconnect();
    };
  }, [auth?.user]);

  const value = useMemo(() => ({ socket }), [socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
