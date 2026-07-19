import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';

vi.mock('../../config/db', () => ({ prisma: { stadium: { findFirst: vi.fn() } } }));
vi.mock('./sustainability.service');

import { createApp } from '../../app';
import { tokenFor } from '../../test-helpers/authToken';
import { prisma } from '../../config/db';
import { getSustainabilitySummary } from './sustainability.service';

const app = createApp();
const FAN_TOKEN = tokenFor(Role.FAN);

describe('sustainability.routes (Supertest, mocked service)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires auth', async () => {
    const res = await request(app).get('/api/sustainability/summary');
    expect(res.status).toBe(401);
  });

  it('returns 404 when no stadium is configured yet', async () => {
    vi.mocked(prisma.stadium.findFirst).mockResolvedValue(null);
    const res = await request(app).get('/api/sustainability/summary').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(404);
  });

  it('returns the sustainability summary for the configured stadium', async () => {
    vi.mocked(prisma.stadium.findFirst).mockResolvedValue({ id: 's1' } as never);
    vi.mocked(getSustainabilitySummary).mockResolvedValue({ waste: { recyclingRatePct: 75 } } as never);
    const res = await request(app).get('/api/sustainability/summary').set('Authorization', `Bearer ${FAN_TOKEN}`);
    expect(res.status).toBe(200);
    expect(getSustainabilitySummary).toHaveBeenCalledWith('s1');
  });
});
