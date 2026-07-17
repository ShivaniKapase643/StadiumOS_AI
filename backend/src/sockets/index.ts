import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from '../config/logger';

interface AuthedSocket extends Socket {
  userId?: string;
  role?: string;
}

let io: SocketIOServer | undefined;

export function initSocketServer(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.clientUrl,
      credentials: true,
    },
  });

  io.use((socket: AuthedSocket, next) => {
    try {
      const token = socket.handshake.auth?.token as string | undefined;
      if (token) {
        const payload = jwt.verify(token, env.jwt.accessSecret) as { sub: string; role: string };
        socket.userId = payload.sub;
        socket.role = payload.role;
      }
      next();
    } catch {
      // Allow anonymous/public sockets (e.g. public dashboard TV displays);
      // authenticated-only rooms are gated separately when joining.
      next();
    }
  });

  io.on('connection', (socket: AuthedSocket) => {
    logger.debug(`Socket connected: ${socket.id} (user=${socket.userId ?? 'anonymous'})`);
    socket.join('broadcast');

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('Socket.IO server not initialized');
  return io;
}

export function emitToAll(event: string, payload: unknown): void {
  io?.to('broadcast').emit(event, payload);
}
