import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, ParkingSquare, Radar, Rewind, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { ZONE_TYPE_LABEL } from '@/lib/zoneMeta';
import * as twinService from '@/services/twin.service';
import * as crowdIntelligenceService from '@/services/crowdIntelligence.service';
import type { DensityLevel, ZoneType } from '@/types';
import { useLiveSnapshot, useStadiumOverview } from './useTwinData';
import { StadiumMap } from './StadiumMap';

const TOGGLEABLE_TYPES: ZoneType[] = [
  'SEATING_BLOCK',
  'GATE',
  'PARKING',
  'MEDICAL',
  'FIRE_STATION',
  'WASHROOM',
  'FOOD_COURT',
  'VENDOR_STALL',
  'EV_CHARGING',
  'EMERGENCY_ROUTE',
  'CCTV',
];

export default function DigitalTwinPage() {
  const { data: stadium, isLoading: stadiumLoading } = useStadiumOverview();
  const { data: snapshot, isLoading: snapshotLoading, crowdOverrides, equipmentOverrides, parkingOverrides, alerts } = useLiveSnapshot(
    stadium?.id
  );

  const [visibleTypes, setVisibleTypes] = useState<Set<ZoneType>>(new Set(TOGGLEABLE_TYPES));
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [droneMode, setDroneMode] = useState(false);
  const [predictiveMode, setPredictiveMode] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [replayAt, setReplayAt] = useState<Date | null>(null);

  const { data: replayRange } = useQuery({
    queryKey: ['twin', 'replay-range', stadium?.id],
    queryFn: () => twinService.getReplayTimeRange(stadium!.id),
    enabled: Boolean(stadium?.id) && replayMode,
  });

  useEffect(() => {
    if (replayMode && replayRange?.latest && !replayAt) setReplayAt(new Date(replayRange.latest));
    if (!replayMode) setReplayAt(null);
  }, [replayMode, replayRange, replayAt]);

  const { data: replaySnapshot } = useQuery({
    queryKey: ['twin', 'replay', stadium?.id, replayAt?.toISOString()],
    queryFn: () => twinService.getReplaySnapshot(stadium!.id, replayAt!),
    enabled: Boolean(stadium?.id && replayAt),
  });

  const replayCrowdOverrides = useMemo(() => {
    const map: Record<string, { capacityPct: number; densityLevel: DensityLevel; count: number }> = {};
    for (const z of replaySnapshot?.zones ?? []) {
      if (z.capacityPct !== null && z.densityLevel !== null) {
        map[z.zoneId] = { capacityPct: z.capacityPct, densityLevel: z.densityLevel as DensityLevel, count: 0 };
      }
    }
    return map;
  }, [replaySnapshot]);

  const { data: riskPredictions } = useQuery({
    queryKey: ['crowd-intelligence', 'predict', stadium?.id],
    queryFn: () => crowdIntelligenceService.predictCrowdRisk(stadium!.id),
    enabled: Boolean(stadium?.id) && predictiveMode,
    refetchInterval: predictiveMode ? 20000 : false,
  });

  const toggleType = (type: ZoneType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const activeAlertZoneIds = useMemo(() => new Set(alerts.map((a) => a.zoneId)), [alerts]);

  const parkingSummary = useMemo(() => {
    if (!snapshot) return { total: 0, occupied: 0 };
    let total = 0;
    let occupied = 0;
    for (const lot of snapshot.parkingLots) {
      for (const slot of lot.slots) {
        total++;
        const liveStatus = parkingOverrides[slot.id]?.status ?? slot.status;
        if (liveStatus === 'OCCUPIED') occupied++;
      }
    }
    return { total, occupied };
  }, [snapshot, parkingOverrides]);

  const equipmentSummary = useMemo(() => {
    if (!snapshot) return { healthy: 0, warning: 0, critical: 0 };
    let healthy = 0;
    let warning = 0;
    let critical = 0;
    for (const eq of snapshot.equipment) {
      const status = equipmentOverrides[eq.id]?.status ?? eq.status;
      if (status === 'CRITICAL' || status === 'OFFLINE') critical++;
      else if (status === 'WARNING') warning++;
      else healthy++;
    }
    return { healthy, warning, critical };
  }, [snapshot, equipmentOverrides]);

  if (stadiumLoading || snapshotLoading || !stadium || !snapshot) {
    return <Skeleton className="h-[70vh] w-full" />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Stadium Digital Twin</h1>
        <p className="text-sm text-muted-foreground">{stadium.name} &middot; Live interactive map</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Map Layers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="heatmap-toggle" className="text-sm font-normal">
                  Crowd Heatmap
                </Label>
                <Switch id="heatmap-toggle" checked={showHeatmap} onCheckedChange={setShowHeatmap} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="drone-toggle" className="text-sm font-normal">
                  Drone View
                </Label>
                <Switch id="drone-toggle" checked={droneMode} onCheckedChange={setDroneMode} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="predictive-toggle" className="text-sm font-normal">
                  Predictive Risk Map
                </Label>
                <Switch
                  id="predictive-toggle"
                  checked={predictiveMode}
                  onCheckedChange={(checked) => {
                    setPredictiveMode(checked);
                    if (checked) setReplayMode(false);
                  }}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="replay-toggle" className="text-sm font-normal">
                  Live Replay
                </Label>
                <Switch
                  id="replay-toggle"
                  checked={replayMode}
                  onCheckedChange={(checked) => {
                    setReplayMode(checked);
                    if (checked) setPredictiveMode(false);
                  }}
                />
              </div>
              <div className="h-px bg-border" />
              {TOGGLEABLE_TYPES.map((type) => (
                <div key={type} className="flex items-center justify-between">
                  <Label htmlFor={`layer-${type}`} className="text-sm font-normal">
                    {ZONE_TYPE_LABEL[type]}
                  </Label>
                  <Switch id={`layer-${type}`} checked={visibleTypes.has(type)} onCheckedChange={() => toggleType(type)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <ParkingSquare className="h-4 w-4" /> Parking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {parkingSummary.occupied}/{parkingSummary.total}
              </p>
              <p className="text-xs text-muted-foreground">slots occupied live</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Wrench className="h-4 w-4" /> Equipment Health
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Badge variant="success">{equipmentSummary.healthy} Healthy</Badge>
              <Badge variant="warning">{equipmentSummary.warning} Warning</Badge>
              <Badge variant="destructive">{equipmentSummary.critical} Critical</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="h-4 w-4" /> Active Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts</p>}
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                  <p className="font-medium text-destructive">{alert.type}</p>
                  <p className="text-muted-foreground">
                    {alert.zoneName} &middot; {formatDateTime(alert.createdAt)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {replayMode && replayRange?.earliest && replayRange?.latest && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Rewind className="h-4 w-4" /> Live Stadium Replay
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <input
                  type="range"
                  aria-label="Replay time"
                  min={new Date(replayRange.earliest).getTime()}
                  max={new Date(replayRange.latest).getTime()}
                  value={replayAt?.getTime() ?? new Date(replayRange.latest).getTime()}
                  onChange={(e) => setReplayAt(new Date(Number(e.target.value)))}
                  className="w-full accent-primary"
                />
                <p className="text-center text-xs text-muted-foreground">{replayAt ? formatDateTime(replayAt.toISOString()) : ''}</p>
                {replaySnapshot && replaySnapshot.recentEvents.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Events in this window</p>
                    {replaySnapshot.recentEvents.slice(0, 5).map((e, i) => (
                      <p key={i} className="text-xs">
                        {e.label}
                        {e.zoneName ? ` — ${e.zoneName}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {predictiveMode && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Radar className="h-4 w-4" /> Predictive Risk (10 min ahead)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!riskPredictions || riskPredictions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Not enough crowd-tracked zones yet.</p>
                ) : (
                  riskPredictions.slice(0, 6).map((p) => (
                    <div key={p.zoneId} className="rounded-md border border-border p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{p.zoneName}</span>
                        <Badge variant={p.predictedDensityLevel === 'CRITICAL' || p.predictedDensityLevel === 'HIGH' ? 'destructive' : 'outline'}>
                          {p.predictedCapacityPct.toFixed(0)}%
                        </Badge>
                      </div>
                      <p className="text-muted-foreground">
                        {p.reason} &middot; {p.confidencePct}% confidence
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="overflow-hidden">
          <div className="h-[70vh] w-full">
            <StadiumMap
              mapWidth={stadium.mapWidth}
              mapHeight={stadium.mapHeight}
              zones={snapshot.zones}
              crowdOverrides={replayMode ? replayCrowdOverrides : crowdOverrides}
              equipmentOverrides={equipmentOverrides}
              activeAlertZoneIds={activeAlertZoneIds}
              visibleTypes={visibleTypes}
              showHeatmap={showHeatmap}
              droneMode={droneMode}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
