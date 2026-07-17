import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ambulance, Loader2, MapPinned, Siren } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { useSocketEvent } from '@/hooks/useSocket';
import * as emergencyService from '@/services/emergency.service';

const STATUS_VARIANT: Record<string, 'default' | 'warning' | 'destructive' | 'success'> = {
  OPEN: 'destructive',
  DISPATCHED: 'warning',
  RESOLVED: 'success',
  CANCELLED: 'default',
};

export default function EmergencyResponsePage() {
  const queryClient = useQueryClient();
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
                <div className="flex gap-2 pt-2">
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
    </div>
  );
}
