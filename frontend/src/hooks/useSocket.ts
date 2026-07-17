import { useContext, useEffect } from 'react';
import { SocketContext } from '@/contexts/SocketContext';

export function useSocket() {
  return useContext(SocketContext).socket;
}

export function useSocketEvent<T = unknown>(event: string, handler: (payload: T) => void) {
  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event]);
}
