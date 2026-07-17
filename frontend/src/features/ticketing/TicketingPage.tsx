import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Ticket as TicketIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import * as dashboardService from '@/services/dashboard.service';
import * as ticketingService from '@/services/ticketing.service';
import type { PaymentMethod, Seat } from '@/types';
import { SeatMap } from './SeatMap';

const PAYMENT_METHODS: PaymentMethod[] = ['CARD', 'UPI', 'NET_BANKING', 'WALLET'];

export default function TicketingPage() {
  const queryClient = useQueryClient();
  const { data: fixtures = [], isLoading: fixturesLoading } = useQuery({
    queryKey: ['ticketing', 'fixtures'],
    queryFn: dashboardService.getUpcomingMatches,
  });

  const [selectedFixtureId, setSelectedFixtureId] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<Map<string, Seat>>(new Map());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CARD');

  const { data: seatData, isLoading: seatsLoading } = useQuery({
    queryKey: ['ticketing', 'seats', selectedFixtureId],
    queryFn: () => ticketingService.getSeatsForFixture(selectedFixtureId),
    enabled: Boolean(selectedFixtureId),
  });

  const ticketTypeByTier = useMemo(() => {
    const map = new Map<string, string>();
    for (const tt of seatData?.ticketTypes ?? []) map.set(tt.tier, tt.id);
    return map;
  }, [seatData]);

  const totalAmount = useMemo(() => {
    let total = 0;
    for (const seat of selectedSeats.values()) {
      const tt = seatData?.ticketTypes.find((t) => t.tier === seat.tier);
      total += tt ? Number(tt.price) : 0;
    }
    return total;
  }, [selectedSeats, seatData]);

  const bookingMutation = useMutation({
    mutationFn: () =>
      ticketingService.createBooking({
        fixtureId: selectedFixtureId,
        seatSelections: Array.from(selectedSeats.values()).map((seat) => ({
          seatId: seat.id,
          ticketTypeId: ticketTypeByTier.get(seat.tier)!,
        })),
        paymentMethod,
      }),
    onSuccess: (result) => {
      toast.success(`Booking confirmed — ${result.tickets.length} ticket(s) issued`);
      setSelectedSeats(new Map());
      queryClient.invalidateQueries({ queryKey: ['ticketing', 'seats', selectedFixtureId] });
      queryClient.invalidateQueries({ queryKey: ['ticketing', 'my-tickets'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  const toggleSeat = (seat: Seat) => {
    setSelectedSeats((prev) => {
      const next = new Map(prev);
      if (next.has(seat.id)) next.delete(seat.id);
      else if (ticketTypeByTier.has(seat.tier)) next.set(seat.id, seat);
      else toast.error('No ticket type configured for this tier yet');
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Smart Ticketing</h1>
        <p className="text-sm text-muted-foreground">Select a match, pick your seats, and check out securely.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Choose a match</CardTitle>
        </CardHeader>
        <CardContent>
          {fixturesLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedFixtureId}
              onValueChange={(v) => {
                setSelectedFixtureId(v);
                setSelectedSeats(new Map());
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an upcoming fixture" />
              </SelectTrigger>
              <SelectContent>
                {fixtures.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.homeTeam.name} vs {f.awayTeam.name} &middot; {formatDateTime(f.scheduledAt)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedFixtureId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Select your seats</CardTitle>
          </CardHeader>
          <CardContent>
            {seatsLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : !seatData || seatData.seats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No seat map configured for this fixture yet.</p>
            ) : seatData.ticketTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Tickets are not yet on sale for this fixture.</p>
            ) : (
              <SeatMap seats={seatData.seats} selectedSeatIds={new Set(selectedSeats.keys())} onToggleSeat={toggleSeat} maxSelectable={8} />
            )}
          </CardContent>
        </Card>
      )}

      {selectedSeats.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">3. Review &amp; pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              {Array.from(selectedSeats.values()).map((seat) => (
                <div key={seat.id} className="flex items-center justify-between text-sm">
                  <span>
                    Seat {seat.section}-{seat.row}
                    {seat.number} <Badge variant="outline">{seat.tier}</Badge>
                  </span>
                  <span>{formatCurrency(Number(seatData?.ticketTypes.find((t) => t.tier === seat.tier)?.price ?? 0))}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3 font-semibold">
              <span>Total</span>
              <span>{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m.replaceAll('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => bookingMutation.mutate()} disabled={bookingMutation.isPending}>
                {bookingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TicketIcon className="h-4 w-4" />}
                Pay &amp; Book
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Payments are processed through a sandbox mock gateway for this preview build — no real charge occurs.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
