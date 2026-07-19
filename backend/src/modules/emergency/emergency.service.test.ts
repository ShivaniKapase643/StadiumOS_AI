import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: { sOSAlert: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() }, ambulanceDispatch: { create: vi.fn() } },
}));
vi.mock('../../sockets', () => ({ emitToAll: vi.fn() }));

import { prisma } from '../../config/db';
import { emitToAll } from '../../sockets';
import { createSosAlert, dispatchAmbulance, resolveSosAlert } from './emergency.service';

describe('emergency.service (unit, mocked Prisma)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('broadcasts a real-time alert when a new SOS is raised', async () => {
    vi.mocked(prisma.sOSAlert.create).mockResolvedValue({ id: 'a1', type: 'MEDICAL', zoneId: 'z1', createdAt: new Date() } as never);
    await createSosAlert('u1', { type: 'MEDICAL', zoneId: 'z1' });
    expect(emitToAll).toHaveBeenCalledWith('alert:new', expect.objectContaining({ id: 'a1', type: 'MEDICAL' }));
  });

  it('throws 404 dispatching an ambulance for a non-existent alert', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue(null);
    await expect(dispatchAmbulance('nope')).rejects.toMatchObject({ status: 404 });
    expect(prisma.ambulanceDispatch.create).not.toHaveBeenCalled();
  });

  it('marks the alert DISPATCHED and creates an ambulance dispatch record', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1' } as never);
    vi.mocked(prisma.sOSAlert.update).mockResolvedValue({} as never);
    vi.mocked(prisma.ambulanceDispatch.create).mockResolvedValue({ id: 'd1' } as never);

    await dispatchAmbulance('a1', 'Sam');
    expect(prisma.sOSAlert.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { status: 'DISPATCHED' } });
    expect(prisma.ambulanceDispatch.create).toHaveBeenCalledWith({ data: { sosAlertId: 'a1', driverName: 'Sam' } });
  });

  it('throws 404 resolving a non-existent alert', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue(null);
    await expect(resolveSosAlert('nope')).rejects.toMatchObject({ status: 404 });
  });

  it('stamps resolvedAt when resolving an alert', async () => {
    vi.mocked(prisma.sOSAlert.findUnique).mockResolvedValue({ id: 'a1' } as never);
    vi.mocked(prisma.sOSAlert.update).mockResolvedValue({} as never);
    await resolveSosAlert('a1');
    expect(prisma.sOSAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'RESOLVED', resolvedAt: expect.any(Date) }) })
    );
  });
});
