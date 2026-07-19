import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Ambulance, Check, Loader2, Radio, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { extractErrorMessage } from '@/services/api';
import * as emergencyService from '@/services/emergency.service';
import * as securityService from '@/services/security.service';
import type { ActionPlanStepDto } from '@/services/emergency.service';

const STEP_ICON: Record<string, typeof ShieldAlert> = {
  'dispatch-security': ShieldAlert,
  'dispatch-medical': Ambulance,
  broadcast: Radio,
};

interface IncidentActionPlanDialogProps {
  alertId: string | null;
  onClose: () => void;
}

export function IncidentActionPlanDialog({ alertId, onClose }: IncidentActionPlanDialogProps) {
  const queryClient = useQueryClient();

  const { data: plan, isLoading } = useQuery({
    queryKey: ['emergency', 'action-plan', alertId],
    queryFn: () => emergencyService.getIncidentActionPlan(alertId!),
    enabled: Boolean(alertId),
  });

  const dispatchMutation = useMutation({
    mutationFn: () => emergencyService.dispatchAmbulance(alertId!),
    onSuccess: () => {
      toast.success('Ambulance dispatched');
      queryClient.invalidateQueries({ queryKey: ['emergency', 'sos'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const broadcastMutation = useMutation({
    mutationFn: (message: string) =>
      securityService.sendBroadcast({ message, severity: 'HIGH', audienceRoles: ['FAN', 'VOLUNTEER', 'SECURITY_OFFICER', 'MEDICAL_TEAM', 'STADIUM_ADMIN'] }),
    onSuccess: () => toast.success('Broadcast sent'),
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const handleApply = (step: ActionPlanStepDto) => {
    if (!step.apply) return;
    if (step.apply.kind === 'dispatchAmbulance') dispatchMutation.mutate();
    if (step.apply.kind === 'broadcast' && step.apply.suggestedMessage) broadcastMutation.mutate(step.apply.suggestedMessage);
    // 'closeZone' intentionally has no one-click apply here — closing a
    // section is consequential enough that it should go through the
    // Digital Twin's own zone-status control, not a single dialog click.
  };

  const isApplying = dispatchMutation.isPending || broadcastMutation.isPending;

  return (
    <Dialog open={alertId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" /> AI Incident Commander
          </DialogTitle>
          <DialogDescription>
            {plan ? `Recommended response for the alert near ${plan.zoneName ?? 'the stadium'}` : 'Generating a response plan…'}
          </DialogDescription>
        </DialogHeader>

        {isLoading || !plan ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <Badge variant="warning" className="w-fit">
              ETA {plan.overallEtaMinutes} min
            </Badge>
            <div className="space-y-2">
              {plan.steps.map((step) => {
                const Icon = STEP_ICON[step.id] ?? Check;
                return (
                  <div key={step.id} className="flex items-start gap-3 rounded-md border border-border p-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="flex-1 space-y-0.5">
                      <p className="text-sm font-medium">{step.action}</p>
                      <p className="text-xs text-muted-foreground">{step.detail}</p>
                    </div>
                    {step.apply && (step.apply.kind === 'dispatchAmbulance' || step.apply.kind === 'broadcast') && (
                      <Button size="sm" variant="outline" onClick={() => handleApply(step)} disabled={isApplying}>
                        {isApplying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
