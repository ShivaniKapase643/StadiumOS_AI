import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ambulance, DoorOpen, Loader2, MapPinned, Siren, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDateTime } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { useSocketEvent } from '@/hooks/useSocket';
import * as emergencyService from '@/services/emergency.service';
import * as twinService from '@/services/twin.service';
import { useStadiumOverview } from '@/features/digital-twin/useTwinData';
import { IncidentActionPlanDialog } from './IncidentActionPlanDialog';

function EvacuationSimulator() {
  const { data: stadium } = useStadiumOverview();
  const { data: zones = [] } = useQuery({
    queryKey: ['twin', 'zones', stadium?.id],
    queryFn: () => twinService.listZones(stadium!.id),
    enabled: Boolean(stadium?.id),
  });
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');

  const { data: result, isFetching } = useQuery({
    queryKey: ['emergency', 'evacuation-simulate', selectedZoneId],
    queryFn: () => emergencyService.simulateEvacuation(selectedZoneId),
    enabled: Boolean(selectedZoneId),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4 text-primary" /> Smart Evacuation Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedZoneId} onValueChange={setSelectedZoneId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a zone to evacuate from" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFetching && <p className="text-sm text-muted-foreground">Calculating routes…</p>}

        {result && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-success/40 bg-success/5 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-success">Fastest Exit</p>
              <p className="text-lg font-semibold">{result.fastest.gateName}</p>
              <p className="text-sm text-muted-foreground">
                {result.fastest.etaMinutes} min &middot; {result.fastest.distanceMeters}m
              </p>
            </div>
            {result.alternative ? (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Recommended Alternative</p>
                <p className="text-lg font-semibold">{result.alternative.gateName}</p>
                <p className="text-sm text-muted-foreground">
                  {result.alternative.etaMinutes} min &middot; {result.alternative.distanceMeters}m
                </p>
                {result.reason && <p className="mt-1 text-xs text-muted-foreground">{result.reason}</p>}
              </div>
            ) : (
              <div className="rounded-md border border-border p-3 text-sm text-muted-foreground">
                No congestion detected — the fastest route is also the least crowded.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'destructive' | 'success'> = {
  OPEN: 'destructive',
  DISPATCHED: 'warning',
  RESOLVED: 'success',
  CANCELLED: 'default',
};

export default function EmergencyResponsePage() {
  const queryClient = useQueryClient();
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const { data: alerts = [], isLoading } = useQuery({ queryKey: ['emergency', 'sos'], queryFn: emergencyService.listSosAlerts, refetchInterval: 15_000 });
  const { data: plans = [] } = useQuery({ queryKey: ['emergency', 'plans'], queryFn: emergencyService.listEvacuationPlans });

  useSocketEvent('alert:new', () => queryClient.invalidateQueries({ queryKey: ['emergency', 'sos'] }));

  const dispatchMutation = useMutation({
    mutationFn: (id: string) => emergencyService.dispatchAmbulance(id),
    onSuccess: () => {
      toast.success('Ambulance dispatched');
      queryClient.invalidateQueries({ queryKey: ['emergency', 'sos'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => emergencyService.resolveSosAlert(id),
    onSuccess: () => {
      toast.success('Alert resolved');
      queryClient.invalidateQueries({ queryKey: ['emergency', 'sos'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Emergency Response</h1>
        <p className="text-sm text-muted-foreground">SOS alerts, ambulance dispatch, and evacuation planning.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading alerts...</p>}
        {alerts.map((alert) => (
          <Card key={alert.id} className={alert.status === 'OPEN' ? 'border-destructive/50' : undefined}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Siren className="h-4 w-4 text-destructive" /> {alert.type}
              </CardTitle>
              <Badge variant={STATUS_VARIANT[alert.status]}>{alert.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Reported by {alert.user.name}</p>
              {alert.zone && (
                <p className="flex items-center gap-1">
                  <MapPinned className="h-3 w-3" /> {alert.zone.name}
                </p>
              )}
              <p>{formatDateTime(alert.createdAt)}</p>
              {alert.ambulanceDispatch && (
                <p className="flex items-center gap-1 text-primary">
                  <Ambulance className="h-3 w-3" /> Dispatched at {formatDateTime(alert.ambulanceDispatch.dispatchedAt)}
                </p>
              )}
              {alert.status === 'OPEN' && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={() => dispatchMutation.mutate(alert.id)}
                    disabled={dispatchMutation.isPending && dispatchMutation.variables === alert.id}
                  >
                    {dispatchMutation.isPending && dispatchMutation.variables === alert.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Dispatch
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resolveMutation.mutate(alert.id)}
                    disabled={resolveMutation.isPending && resolveMutation.variables === alert.id}
                  >
                    Resolve
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => setSelectedAlertId(alert.id)}>
                    <Sparkles className="h-3.5 w-3.5" /> AI Response
                  </Button>
                </div>
              )}
              {alert.status === 'DISPATCHED' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => resolveMutation.mutate(alert.id)}
                  disabled={resolveMutation.isPending && resolveMutation.variables === alert.id}
                >
                  Mark resolved
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {!isLoading && alerts.length === 0 && <p className="text-sm text-muted-foreground">No SOS alerts.</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Evacuation Plans</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {plans.length === 0 && <p className="text-sm text-muted-foreground">No evacuation plans on file.</p>}
          {plans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <span className="font-medium">{plan.name}</span>
              <Badge variant="outline">{plan.status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <EvacuationSimulator />

      <IncidentActionPlanDialog alertId={selectedAlertId} onClose={() => setSelectedAlertId(null)} />
    </div>
  );
}
