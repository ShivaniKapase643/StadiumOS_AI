import { describe, it, expect, vi, beforeAll } from 'vitest';
import { createServer } from 'http';
import { initSocketServer, getIO, emitToAll } from './index';
import { SOCKET_EVENTS } from './events';

describe('Socket.IO server (unit)', () => {
  it('throws from getIO() before the server has been initialized', () => {
    expect(() => getIO()).toThrow('Socket.IO server not initialized');
  });

  it('does not throw when emitting before initialization (silent no-op)', () => {
    expect(() => emitToAll(SOCKET_EVENTS.ALERT_NEW, { id: 'x' })).not.toThrow();
  });

  describe('after initialization', () => {
    beforeAll(() => {
      const httpServer = createServer();
      initSocketServer(httpServer);
    });

    it('getIO() returns the initialized server', () => {
      expect(getIO()).toBeTruthy();
    });

    it('emitToAll broadcasts the event to the "broadcast" room with the given payload', () => {
      const io = getIO();
      const broadcastRoom = { emit: vi.fn() };
      const toSpy = vi.spyOn(io, 'to').mockReturnValue(broadcastRoom as unknown as ReturnType<typeof io.to>);

      const payload = { zoneId: 'zone-1', type: 'MEDICAL', createdAt: new Date().toISOString() };
      emitToAll(SOCKET_EVENTS.ALERT_NEW, payload);

      expect(toSpy).toHaveBeenCalledWith('broadcast');
      expect(broadcastRoom.emit).toHaveBeenCalledWith(SOCKET_EVENTS.ALERT_NEW, payload);

      toSpy.mockRestore();
    });

    it('emits distinct known event names for crowd updates and ticket scans', () => {
      const io = getIO();
      const broadcastRoom = { emit: vi.fn() };
      vi.spyOn(io, 'to').mockReturnValue(broadcastRoom as unknown as ReturnType<typeof io.to>);

      emitToAll(SOCKET_EVENTS.CROWD_UPDATE, [{ zoneId: 'z1', capacityPct: 50 }]);
      emitToAll(SOCKET_EVENTS.TICKET_SCANNED, { ticketId: 't1' });

      expect(broadcastRoom.emit).toHaveBeenNthCalledWith(1, 'crowd:update', [{ zoneId: 'z1', capacityPct: 50 }]);
      expect(broadcastRoom.emit).toHaveBeenNthCalledWith(2, 'ticket:scanned', { ticketId: 't1' });

      vi.restoreAllMocks();
    });
  });
});
