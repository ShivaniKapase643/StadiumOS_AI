import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./api', () => ({ api: { get: vi.fn(), post: vi.fn() } }));

import { api } from './api';
import {
  listSosAlerts,
  raiseSosAlert,
  dispatchAmbulance,
  resolveSosAlert,
  listEvacuationPlans,
  getIncidentActionPlan,
  simulateEvacuation,
} from './emergency.service';

describe('emergency.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists SOS alerts', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [{ id: 'a1' }] } });
    const alerts = await listSosAlerts();
    expect(api.get).toHaveBeenCalledWith('/emergency/sos');
    expect(alerts).toHaveLength(1);
  });

  it('raises an SOS alert with the given type/zone', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'a1' } } });
    await raiseSosAlert({ type: 'MEDICAL', zoneId: 'z1' });
    expect(api.post).toHaveBeenCalledWith('/emergency/sos', { type: 'MEDICAL', zoneId: 'z1' });
  });

  it('dispatches an ambulance to the correct alert id', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
    await dispatchAmbulance('a1', 'Sam');
    expect(api.post).toHaveBeenCalledWith('/emergency/sos/a1/dispatch', { driverName: 'Sam' });
  });

  it('resolves an SOS alert by id', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { data: {} } });
    await resolveSosAlert('a1');
    expect(api.post).toHaveBeenCalledWith('/emergency/sos/a1/resolve', {});
  });

  it('lists evacuation plans', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
    await listEvacuationPlans();
    expect(api.get).toHaveBeenCalledWith('/emergency/evacuation-plans');
  });

  it('fetches the AI Incident Commander action plan for a specific alert', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { alertId: 'a1', steps: [] } } });
    const plan = await getIncidentActionPlan('a1');
    expect(api.get).toHaveBeenCalledWith('/emergency/sos/a1/action-plan');
    expect(plan.alertId).toBe('a1');
  });

  it('runs the evacuation simulator for a specific zone', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: { data: { fromZoneName: 'East Stand' } } });
    const result = await simulateEvacuation('z1');
    expect(api.get).toHaveBeenCalledWith('/emergency/evacuation-simulate/z1');
    expect(result.fromZoneName).toBe('East Stand');
  });
});
