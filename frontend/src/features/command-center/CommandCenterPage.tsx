import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ParkingSquare, ShieldAlert, Siren, Radio, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/StatCard';
import { formatDateTime } from '@/lib/utils';
import { useKpis, useUpcomingMatches } from '@/features/dashboard/useDashboardData';
import { useLiveSnapshot, useStadiumOverview } from '@/features/digital-twin/useTwinData';
import { StadiumMap } from '@/features/digital-twin/StadiumMap';
import { AIInsightsPanel } from '@/features/ai/AIInsightsPanel';
import { useSocketEvent } from '@/hooks/useSocket';
import * as tournamentService from '@/services/tournament.service';

export default function CommandCenterPage() {
  const queryClient = useQueryClient();
  const { data: kpis, isLoading: kpisLoading } = useKpis();
  const { data: stadium } = useStadiumOverview();
  const { data: snapshot, crowdOverrides, equipmentOverrides, alerts } = useLiveSnapshot(stadium?.id);
  const { data: upcomingMatches = [] } = useUpcomingMatches();

  const { data: tournaments = [] } = useQuery({ queryKey: ['tournaments'], queryFn: tournamentService.listTournaments });
  const primaryTournamentId = tournaments[0]?.id;
  const { data: primaryTournament } = useQuery({
    queryKey: ['tournament', primaryTournamentId],
    queryFn: () => tournamentService.getTournament(primaryTournamentId!),
    enabled: Boolean(primaryTournamentId),
  });

  useSocketEvent('match:score-update', () => {
    if (primaryTournamentId) queryClient.invalidateQueries({ queryKey: ['tournament', primaryTournamentId] });
  });
  const liveFixtures = useMemo(
    () => (primaryTournament?.fixtures ?? []).filter((f) => f.status === 'LIVE'),
    [primaryTournament]
  );

  const activeAlertZoneIds = useMemo(() => new Set(alerts.map((a) => a.zoneId).filter(Boolean)), [alerts]);
  const allZoneTypes = useMemo(() => new Set(snapshot?.zones.map((z) => z.type) ?? []), [snapshot]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Command Center</h1>
          <p className="text-sm text-muted-foreground">Mission-control view for stadium operators &mdash; live, all-in-one.</p>
        </div>
        <Badge variant="success" className="gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-foreground/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success-foreground" />
          </span>
          Live
        </Badge>
      </div>

      {kpisLoading || !kpis ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Crowd Level" value={`${kpis.crowd.averageCapacityPct}%`} icon={Activity} accent="warning" />
          <StatCard label="Parking Occupancy" value={`${kpis.parking.occupancyPct}%`} icon={ParkingSquare} accent="primary" />
          <StatCard label="Security Alerts" value={String(kpis.security.openIncidents)} icon={ShieldAlert} accent={kpis.security.openIncidents > 0 ? 'destructive' : 'success'} />
          <StatCard label="Emergency Alerts" value={String(kpis.emergency.openAlerts)} icon={Siren} accent={kpis.emergency.openAlerts > 0 ? 'destructive' : 'success'} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-sm">Live Stadium Overview</CardTitle>
          </CardHeader>
          <div className="h-[420px] w-full">
            {stadium && snapshot ? (
              <StadiumMap
                mapWidth={stadium.mapWidth}
                mapHeight={stadium.mapHeight}
                zones={snapshot.zones}
                crowdOverrides={crowdOverrides}
                equipmentOverrides={equipmentOverrides}
                activeAlertZoneIds={activeAlertZoneIds as Set<string>}
                visibleTypes={allZoneTypes}
                showHeatmap
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-destructive" /> Live Alert Feed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts</p>}
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                  <p className="font-medium text-destructive">{alert.type}</p>
                  <p className="text-muted-foreground">
                    {alert.zoneName ?? 'Stadium-wide'} &middot; {formatDateTime(alert.createdAt)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Trophy className="h-4 w-4 text-primary" /> Match Ticker
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {liveFixtures.length === 0 && upcomingMatches.length === 0 && (
                <p className="text-xs text-muted-foreground">No matches scheduled</p>
              )}
              {liveFixtures.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border border-success/30 bg-success/5 p-2 text-xs">
                  <span className="font-medium">
                    {f.homeTeam.name} {f.match?.homeScore ?? 0} - {f.match?.awayScore ?? 0} {f.awayTeam.name}
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    {f.match?.status.replaceAll('_', ' ')}
                  </Badge>
                </div>
              ))}
              {upcomingMatches.slice(0, 3).map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border border-border p-2 text-xs">
                  <span>
                    {f.homeTeam.name} vs {f.awayTeam.name}
                  </span>
                  <span className="text-muted-foreground">{formatDateTime(f.scheduledAt)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <AIInsightsPanel />
    </div>
  );
}
