import { useMemo, useState } from 'react';
import { AlertTriangle, ParkingSquare, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/utils';
import { ZONE_TYPE_LABEL } from '@/lib/zoneMeta';
import type { ZoneType } from '@/types';
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
        </div>

        <Card className="overflow-hidden">
          <div className="h-[70vh] w-full">
            <StadiumMap
              mapWidth={stadium.mapWidth}
              mapHeight={stadium.mapHeight}
              zones={snapshot.zones}
              crowdOverrides={crowdOverrides}
              equipmentOverrides={equipmentOverrides}
              activeAlertZoneIds={activeAlertZoneIds}
              visibleTypes={visibleTypes}
              showHeatmap={showHeatmap}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
