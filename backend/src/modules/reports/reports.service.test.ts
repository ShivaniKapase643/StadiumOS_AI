import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/db', () => ({
  prisma: {
    fixture: { findMany: vi.fn() },
    payment: { findMany: vi.fn() },
    stadiumZone: { findMany: vi.fn() },
    incident: { findMany: vi.fn() },
    vendor: { findMany: vi.fn() },
  },
}));
vi.mock('../parking/parking.service', () => ({ getParkingAnalytics: vi.fn() }));
vi.mock('../maintenance/maintenance.service', () => ({ listLatestPredictions: vi.fn() }));
vi.mock('../ai/insights.service', () => ({ generateInsights: vi.fn() }));
vi.mock('../dashboard/healthScore.service', () => ({ getStadiumHealthScore: vi.fn() }));

import { prisma } from '../../config/db';
import { getParkingAnalytics } from '../parking/parking.service';
import { listLatestPredictions } from '../maintenance/maintenance.service';
import { generateInsights } from '../ai/insights.service';
import { getStadiumHealthScore } from '../dashboard/healthScore.service';
import { getReport, getFullEventReport } from './reports.service';

function mockEmptyEverything() {
  vi.mocked(prisma.fixture.findMany).mockResolvedValue([]);
  vi.mocked(prisma.payment.findMany).mockResolvedValue([]);
  vi.mocked(prisma.stadiumZone.findMany).mockResolvedValue([]);
  vi.mocked(prisma.incident.findMany).mockResolvedValue([]);
  vi.mocked(prisma.vendor.findMany).mockResolvedValue([]);
  vi.mocked(getParkingAnalytics).mockResolvedValue([]);
  vi.mocked(listLatestPredictions).mockResolvedValue([]);
  vi.mocked(generateInsights).mockResolvedValue([]);
  vi.mocked(getStadiumHealthScore).mockResolvedValue({ overall: 90 } as never);
}

describe('reports.service (unit, mocked Prisma + collaborators)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmptyEverything();
  });

  it('dispatches "parking" to the parking analytics function, not a local query', async () => {
    await getReport('parking');
    expect(getParkingAnalytics).toHaveBeenCalled();
  });

  it('dispatches "maintenance" to the maintenance predictions function', async () => {
    await getReport('maintenance');
    expect(listLatestPredictions).toHaveBeenCalled();
  });

  it('dispatches "revenue" to a real Payment query', async () => {
    await getReport('revenue');
    expect(prisma.payment.findMany).toHaveBeenCalled();
  });

  it('getFullEventReport combines every section plus AI insights and the health score in one payload', async () => {
    vi.mocked(getStadiumHealthScore).mockResolvedValue({ overall: 77, overallStatus: 'yellow' } as never);
    vi.mocked(generateInsights).mockResolvedValue([{ id: 'x' }] as never);

    const report = await getFullEventReport();

    expect(report.health).toEqual({ overall: 77, overallStatus: 'yellow' });
    expect(report.aiInsights).toEqual([{ id: 'x' }]);
    expect(report.sections).toHaveProperty('attendance');
    expect(report.sections).toHaveProperty('revenue');
    expect(report.sections).toHaveProperty('parking');
    expect(report.generatedAt).toBeTruthy();
  });
});
