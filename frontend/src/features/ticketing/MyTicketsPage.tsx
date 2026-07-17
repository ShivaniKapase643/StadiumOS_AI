import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import * as ticketingService from '@/services/ticketing.service';

const statusVariant: Record<string, 'default' | 'success' | 'secondary' | 'destructive'> = {
  VALID: 'success',
  USED: 'secondary',
  CANCELLED: 'destructive',
  REFUNDED: 'default',
};

export default function MyTicketsPage() {
  const queryClient = useQueryClient();
  const { data: tickets = [], isLoading } = useQuery({ queryKey: ['ticketing', 'my-tickets'], queryFn: ticketingService.getMyTickets });

  const refundMutation = useMutation({
    mutationFn: (ticketId: string) => ticketingService.requestRefund(ticketId, 'Requested by fan via My Tickets'),
    onSuccess: () => {
      toast.success('Refund processed');
      queryClient.invalidateQueries({ queryKey: ['ticketing', 'my-tickets'] });
    },
    onError: (err) => toast.error(extractErrorMessage(err)),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">My Tickets</h1>
        <p className="text-sm text-muted-foreground">Your booked tickets with scannable QR codes.</p>
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">You haven&apos;t booked any tickets yet.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm">
                  Seat {ticket.seat.section}-{ticket.seat.row}
                  {ticket.seat.number}
                </CardTitle>
                <Badge variant={statusVariant[ticket.status]}>{ticket.status}</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {ticket.qrDataUrl && (
                  <img src={ticket.qrDataUrl} alt="Ticket QR code" className="mx-auto h-40 w-40 rounded-md border border-border bg-white p-2" />
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Tier: {ticket.ticketType.tier}</p>
                  <p>Price: {formatCurrency(Number(ticket.ticketType.price))}</p>
                  <p>Booked: {formatDateTime(ticket.createdAt)}</p>
                  {ticket.checkedInAt && <p>Checked in: {formatDateTime(ticket.checkedInAt)}</p>}
                </div>
                {ticket.status === 'VALID' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => refundMutation.mutate(ticket.id)}
                    disabled={refundMutation.isPending && refundMutation.variables === ticket.id}
                  >
                    {refundMutation.isPending && refundMutation.variables === ticket.id && <Loader2 className="h-4 w-4 animate-spin" />}
                    Request refund
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
