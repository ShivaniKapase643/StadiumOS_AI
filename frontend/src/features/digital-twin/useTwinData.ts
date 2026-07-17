import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as twinService from '@/services/twin.service';
import { useSocketEvent } from '@/hooks/useSocket';
import type { DensityLevel, EquipmentStatus } from '@/types';

interface CrowdUpdate {
  zoneId: string;
  zoneName: string;
  count: number;
  capacityPct: number;
  densityLevel: DensityLevel;
  recordedAt: string;
}

interface EquipmentUpdate {
  equipmentId: string;
  zoneId: string;
  healthScore: number;
  status: EquipmentStatus;
}

interface ParkingUpdate {
  slotId: string;
  lotId: string;
  status: string;
}

interface AlertEvent {
  id: string;
  type: string;
  zoneId: string;
  zoneName: string;
  createdAt: string;
}

export function useStadiumOverview() {
  return useQuery({ queryKey: ['twin', 'overview'], queryFn: twinService.getStadiumOverview });
}

export function useLiveSnapshot(stadiumId?: string) {
  const query = useQuery({
    queryKey: ['twin', 'live', stadiumId],
    queryFn: () => twinService.getLiveSnapshot(stadiumId!),
    enabled: Boolean(stadiumId),
  });

  const [crowdOverrides, setCrowdOverrides] = useState<Record<string, CrowdUpdate>>({});
  const [equipmentOverrides, setEquipmentOverrides] = useState<Record<string, EquipmentUpdate>>({});
  const [parkingOverrides, setParkingOverrides] = useState<Record<string, ParkingUpdate>>({});
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);

  useSocketEvent<CrowdUpdate[]>('crowd:update', (updates) => {
    setCrowdOverrides((prev) => {
      const next = { ...prev };
      for (const u of updates) next[u.zoneId] = u;
      return next;
    });
  });

  useSocketEvent<EquipmentUpdate[]>('equipment:update', (updates) => {
    setEquipmentOverrides((prev) => {
      const next = { ...prev };
      for (const u of updates) next[u.equipmentId] = u;
      return next;
    });
  });

  useSocketEvent<ParkingUpdate[]>('parking:update', (updates) => {
    setParkingOverrides((prev) => {
      const next = { ...prev };
      for (const u of updates) next[u.slotId] = u;
      return next;
    });
  });

  useSocketEvent<AlertEvent>('alert:new', (alert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, 10));
  });

  useEffect(() => {
    if (query.data?.activeAlerts) {
      setAlerts(
        query.data.activeAlerts.map((a) => ({ id: a.id, type: a.type, zoneId: a.zoneId, zoneName: a.zone.name, createdAt: a.createdAt }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  return { ...query, crowdOverrides, equipmentOverrides, parkingOverrides, alerts };
}
