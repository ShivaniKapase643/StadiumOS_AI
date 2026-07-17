import { useMemo } from 'react';
import { MapContainer, CircleMarker, Polygon, Popup, Marker } from 'react-leaflet';
import L, { CRS } from 'leaflet';
import { HeatmapLayer } from './HeatmapLayer';
import { ZONE_TYPE_COLOR, ZONE_TYPE_LABEL } from '@/lib/zoneMeta';
import { densityLevelColor } from '@/lib/chartColors';
import { useTheme } from '@/hooks/useTheme';
import type { DensityLevel, EquipmentStatus, StadiumZone, ZoneType } from '@/types';

interface StadiumMapProps {
  mapWidth: number;
  mapHeight: number;
  zones: StadiumZone[];
  crowdOverrides: Record<string, { capacityPct: number; densityLevel: DensityLevel; count: number }>;
  equipmentOverrides: Record<string, { zoneId: string; healthScore: number; status: EquipmentStatus }>;
  activeAlertZoneIds: Set<string>;
  visibleTypes: Set<ZoneType>;
  showHeatmap: boolean;
}

function toLatLng(x: number, y: number, mapHeight: number): [number, number] {
  return [mapHeight - y, x];
}

function ellipsePoints(cx: number, cy: number, rx: number, ry: number, mapHeight: number, segments = 64): Array<[number, number]> {
  const points: Array<[number, number]> = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(toLatLng(cx + rx * Math.cos(angle), cy + ry * Math.sin(angle), mapHeight));
  }
  return points;
}

const CROWD_TYPES: ZoneType[] = ['SEATING_BLOCK', 'GATE', 'FOOD_COURT'];

export function StadiumMap({
  mapWidth,
  mapHeight,
  zones,
  crowdOverrides,
  equipmentOverrides,
  activeAlertZoneIds,
  visibleTypes,
  showHeatmap,
}: StadiumMapProps) {
  const { theme } = useTheme();
  const bounds: [[number, number], [number, number]] = [
    [0, 0],
    [mapHeight, mapWidth],
  ];

  const bowlPoints = useMemo(() => ellipsePoints(mapWidth / 2, mapHeight / 2, mapWidth / 2 - 20, mapHeight / 2 - 20, mapHeight), [mapWidth, mapHeight]);
  const pitchPoints = useMemo(() => ellipsePoints(mapWidth / 2, mapHeight / 2, mapWidth * 0.28, mapHeight * 0.22, mapHeight), [mapWidth, mapHeight]);

  const heatPoints = useMemo<Array<[number, number, number]>>(() => {
    return zones
      .filter((z) => CROWD_TYPES.includes(z.type))
      .map((z) => {
        const live = crowdOverrides[z.id];
        const pct = live?.capacityPct ?? z.crowdReadings?.[0]?.capacityPct ?? 0;
        const [lat, lng] = toLatLng(z.x, z.y, mapHeight);
        return [lat, lng, Math.min(pct / 100, 1)];
      });
  }, [zones, crowdOverrides, mapHeight]);

  const alertIcon = useMemo(
    () =>
      L.divIcon({
        className: '',
        html: `<div class="relative flex items-center justify-center"><span class="absolute inline-flex h-6 w-6 rounded-full bg-destructive/60 animate-pulse-ring"></span><span class="relative inline-flex h-3 w-3 rounded-full bg-destructive"></span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      }),
    []
  );

  return (
    <MapContainer
      crs={CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={1}
      minZoom={-2}
      maxZoom={2}
      zoom={0}
      style={{ height: '100%', width: '100%', background: theme === 'dark' ? '#0d1117' : '#eef2f6' }}
      attributionControl={false}
    >
      <HeatmapLayer points={heatPoints} visible={showHeatmap} />

      <Polygon positions={bowlPoints} pathOptions={{ color: '#94a3b8', weight: 2, fillColor: '#cbd5e1', fillOpacity: 0.25 }} />
      <Polygon positions={pitchPoints} pathOptions={{ color: '#16a34a', weight: 2, fillColor: '#22c55e', fillOpacity: 0.35 }} />

      {zones
        .filter((z) => visibleTypes.has(z.type))
        .map((zone) => {
          const [lat, lng] = toLatLng(zone.x, zone.y, mapHeight);
          const live = crowdOverrides[zone.id];
          const density = live?.densityLevel ?? zone.crowdReadings?.[0]?.densityLevel;
          const pct = live?.capacityPct ?? zone.crowdReadings?.[0]?.capacityPct;
          const color = density ? densityLevelColor(density, theme) : ZONE_TYPE_COLOR[zone.type];
          const zoneEquipment = zone.equipment ?? [];

          return (
            <CircleMarker
              key={zone.id}
              center={[lat, lng]}
              radius={CROWD_TYPES.includes(zone.type) ? 14 : 8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: zone.status === 'CLOSED' ? 0.2 : 0.75,
                weight: zone.status === 'DEGRADED' ? 3 : 1.5,
                dashArray: zone.status === 'CLOSED' ? '4 3' : undefined,
              }}
            >
              <Popup>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{zone.name}</p>
                  <p className="text-muted-foreground">{ZONE_TYPE_LABEL[zone.type]}</p>
                  <p>
                    Status: <span className="font-medium">{zone.status}</span>
                  </p>
                  {pct !== undefined && (
                    <p>
                      Occupancy: <span className="font-medium">{pct.toFixed(0)}%</span> ({density})
                    </p>
                  )}
                  {zoneEquipment.length > 0 && (
                    <div className="pt-1">
                      <p className="text-xs font-medium text-muted-foreground">Equipment</p>
                      {zoneEquipment.map((eq) => {
                        const liveEq = equipmentOverrides[eq.id];
                        return (
                          <p key={eq.id} className="text-xs">
                            {eq.name}: {liveEq?.status ?? eq.status} ({(liveEq?.healthScore ?? eq.healthScore).toFixed(0)}%)
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

      {zones
        .filter((z) => activeAlertZoneIds.has(z.id))
        .map((zone) => {
          const [lat, lng] = toLatLng(zone.x, zone.y, mapHeight);
          return (
            <Marker key={`alert-${zone.id}`} position={[lat, lng]} icon={alertIcon}>
              <Popup>Active alert near {zone.name}</Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
