import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { toast } from 'sonner';
import { Activity, ParkingSquare, ShieldAlert, Siren, Radio, Trophy, Volume2, VolumeX, Gauge, Mic, MicOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatCard } from '@/components/shared/StatCard';
import { StadiumHealthGauge } from '@/components/shared/StadiumHealthGauge';
import { formatDateTime } from '@/lib/utils';
import { useKpis, useUpcomingMatches } from '@/features/dashboard/useDashboardData';
import { useLiveSnapshot, useStadiumOverview } from '@/features/digital-twin/useTwinData';
import { StadiumMap } from '@/features/digital-twin/StadiumMap';
import { AIInsightsPanel } from '@/features/ai/AIInsightsPanel';
import { IncidentActionPlanDialog } from '@/features/emergency/IncidentActionPlanDialog';
import { useSocketEvent } from '@/hooks/useSocket';
import { useVoiceCommand } from '@/hooks/useVoiceCommand';
import * as tournamentService from '@/services/tournament.service';
import * as dashboardService from '@/services/dashboard.service';

const VOICE_COMMANDS: Array<{ pattern: RegExp; path: string; label: string }> = [
  { pattern: /digital twin/, path: '/digital-twin', label: 'Digital Twin' },
  { pattern: /parking/, path: '/parking', label: 'Parking' },
  { pattern: /emergenc|ambulance|evacuat/, path: '/emergency', label: 'Emergency Response' },
  { pattern: /security/, path: '/security', label: 'Security Center' },
  { pattern: /crowd/, path: '/crowd-intelligence', label: 'Crowd Intelligence' },
  { pattern: /seat|ticket/, path: '/ticketing', label: 'Ticketing' },
  { pattern: /tournament|match|score/, path: '/tournaments', label: 'Tournaments' },
  { pattern: /report/, path: '/reports', label: 'Reports' },
  { pattern: /dashboard/, path: '/dashboard', label: 'Dashboard' },
];

function playAlertChime() {
  try {
    const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.32);
    osc.onended = () => ctx.close();
  } catch {
    // Web Audio unavailable or blocked by the browser — fail silently.
  }
}

export default function CommandCenterPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useKpis();
  const { data: stadium } = useStadiumOverview();
  const { data: snapshot, crowdOverrides, equipmentOverrides, alerts } = useLiveSnapshot(stadium?.id);
  const { data: upcomingMatches = [] } = useUpcomingMatches();

  const { data: tournamentsResult } = useQuery({ queryKey: ['tournaments', 1], queryFn: () => tournamentService.listTournaments(1) });
  const primaryTournamentId = tournamentsResult?.data[0]?.id;
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

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('cc-alert-sound') === '1');
  const [flashAlertId, setFlashAlertId] = useState<string | null>(null);
  const seenNewestId = useRef<string | null>(null);
  const isFirstAlertsRun = useRef(true);

  useEffect(() => {
    const newest = alerts[0];
    if (!newest) return;
    if (isFirstAlertsRun.current) {
      isFirstAlertsRun.current = false;
      seenNewestId.current = newest.id;
      return;
    }
    if (newest.id === seenNewestId.current) return;
    seenNewestId.current = newest.id;
    setFlashAlertId(newest.id);
    if (soundEnabled) playAlertChime();
    const timer = setTimeout(() => setFlashAlertId(null), 5000);
    return () => clearTimeout(timer);
  }, [alerts, soundEnabled]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('cc-alert-sound', next ? '1' : '0');
      return next;
    });
  };

  const { data: health } = useQuery({
    queryKey: ['dashboard', 'health-score'],
    queryFn: dashboardService.getHealthScore,
    refetchInterval: 30000,
  });

  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);

  const voice = useVoiceCommand((transcript) => {
    const match = VOICE_COMMANDS.find((c) => c.pattern.test(transcript.toLowerCase()));
    if (match) {
      toast.success(`"${transcript}" → Opening ${match.label}`);
      navigate(match.path);
    } else {
      toast.info(`Didn't recognize "${transcript}" — try "show parking" or "open digital twin".`);
    }
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Command Center</h1>
          <p className="text-sm text-muted-foreground">Mission-control view for stadium operators &mdash; live, all-in-one.</p>
        </div>
        <div className="flex items-center gap-2">
          {voice.isSupported && (
            <Button
              variant={voice.isListening ? 'destructive' : 'outline'}
              size="sm"
              className="gap-1.5"
              onClick={() => (voice.isListening ? voice.stop() : voice.start())}
              title="Voice command — try 'show parking' or 'open digital twin'"
            >
              {voice.isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {voice.isListening ? 'Listening…' : 'Voice'}
            </Button>
          )}
          <Badge variant="success" className="gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-foreground/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success-foreground" />
            </span>
            Live
          </Badge>
        </div>
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

      {health && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Gauge className="h-4 w-4 text-primary" /> Mission Control &mdash; Stadium Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StadiumHealthGauge health={health} />
          </CardContent>
        </Card>
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
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-destructive" /> Live Alert Feed
              </CardTitle>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={toggleSound}
                title={soundEnabled ? 'Mute alert sound' : 'Play a chime on new alerts'}
                aria-label={soundEnabled ? 'Mute alert sound' : 'Play a chime on new alerts'}
              >
                {soundEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.length === 0 && <p className="text-xs text-muted-foreground">No active alerts</p>}
              <AnimatePresence initial={false}>
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    layout
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="relative rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs"
                  >
                    {flashAlertId === alert.id && (
                      <Badge variant="destructive" className="absolute -right-1.5 -top-1.5 animate-pulse px-1.5 py-0 text-[9px]">
                        NEW
                      </Badge>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-destructive">{alert.type}</p>
                        <p className="text-muted-foreground">
                          {alert.zoneName ?? 'Stadium-wide'} &middot; {formatDateTime(alert.createdAt)}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" className="h-6 shrink-0 px-2 text-[10px]" onClick={() => setSelectedAlertId(alert.id)}>
                        AI Response
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
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

      <IncidentActionPlanDialog alertId={selectedAlertId} onClose={() => setSelectedAlertId(null)} />
    </div>
  );
}
