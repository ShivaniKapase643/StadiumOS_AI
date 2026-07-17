import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, ParkingSquare, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { useSocketEvent } from '@/hooks/useSocket';
import * as parkingService from '@/services/parking.service';

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: 'bg-success/15 border-success/40 text-success',
  OCCUPIED: 'bg-muted border-border text-muted-foreground',
  RESERVED: 'bg-warning/15 border-warning/40 text-warning',
  OUT_OF_SERVICE: 'bg-destructive/10 border-destructive/30 text-destructive',
};

export default function ParkingPage() {
  const queryClient = useQueryClient();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const { data: lots = [], isLoading } = useQuery({ queryKey: ['parking', 'lots'], queryFn: parkingService.getLots, refetchInterval: 10_000 });
  const { data: analytics = [] } = useQuery({ queryKey: ['parking', 'analytics'], queryFn: parkingService.getAnalytics, refetchInterval: 10_000 });
  const { data: myReservations = [] } = useQuery({ queryKey: ['parking', 'my-reservations'], queryFn: parkingService.getMyReservations });

  useSocketEvent('parking:update', () => {
    queryClient.invalidateQueries({ queryKey: ['parking'] });
  });

  const reserveMutation = useMutation({
    mutationFn: () =>
      parkingService.createReservation({
        slotId: selectedSlotId!,
        vehicleNumber,
        startTime: new Date().toISOString(),
      }),
    onSuccess: () => {
      toast.success('Slot reserved');
      setSelectedSlotId(null);
      setVehicleNumber('');
      queryClient.invalidateQueries({ queryKey: ['parking'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => parkingService.cancelReservation(id),
    onSuccess: () => {
      toast.success('Reservation cancelled');
      queryClient.invalidateQueries({ queryKey: ['parking'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Parking</h1>
        <p className="text-sm text-muted-foreground">Live slot availability, EV charging, and reservations.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {analytics.map((lot) => (
          <Card key={lot.lotId}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">{lot.lotName}</p>
              <p className="text-2xl font-semibold">{lot.occupancyPct}%</p>
              <p className="text-xs text-muted-foreground">
                {lot.occupied + lot.reserved}/{lot.total} occupied &middot; {lot.evSlots} EV
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        lots.map((lot) => (
          <Card key={lot.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ParkingSquare className="h-4 w-4" /> {lot.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 pb-3 text-xs">
                {Object.entries(STATUS_COLOR).map(([status, cls]) => (
                  <div key={status} className="flex items-center gap-1.5">
                    <span className={cn('h-3 w-3 rounded-sm border', cls)} />
                    {status.replaceAll('_', ' ')}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
                {lot.slots.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={slot.status !== 'AVAILABLE'}
                    onClick={() => setSelectedSlotId(slot.id)}
                    title={`${slot.code} (${slot.type})`}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-md border text-[10px] font-medium transition-transform disabled:cursor-not-allowed',
                      STATUS_COLOR[slot.status],
                      selectedSlotId === slot.id && 'ring-2 ring-primary ring-offset-1 ring-offset-background'
                    )}
                  >
                    {slot.type === 'EV' ? <Zap className="h-3 w-3" /> : slot.code}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {selectedSlotId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reserve slot</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Input placeholder="Vehicle number" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} />
            <Button onClick={() => reserveMutation.mutate()} disabled={!vehicleNumber || reserveMutation.isPending}>
              {reserveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm reservation
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">My Reservations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {myReservations.length === 0 && <p className="text-sm text-muted-foreground">No reservations yet.</p>}
          {myReservations.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md border border-border p-3 text-sm">
              <div>
                <p className="font-medium">
                  {r.slot.lot.name} &middot; Slot {r.slot.code}
                </p>
                <p className="text-xs text-muted-foreground">{r.vehicleNumber}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{r.status}</Badge>
                {r.status === 'ACTIVE' && (
                  <Button size="sm" variant="outline" onClick={() => cancelMutation.mutate(r.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
