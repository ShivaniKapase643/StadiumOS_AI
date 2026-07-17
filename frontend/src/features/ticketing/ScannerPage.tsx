import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, ScanLine, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { extractErrorMessage } from '@/services/api';
import * as ticketingService from '@/services/ticketing.service';
import { QrCameraScanner } from './QrCameraScanner';

export default function ScannerPage() {
  const [code, setCode] = useState('');
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);

  const scanMutation = useMutation({
    mutationFn: (qrCode: string) => ticketingService.verifyTicket(qrCode),
    onSuccess: (result) => {
      const seatLabel = `${result.seat.section}-${result.seat.row}${result.seat.number}`;
      setLastResult({ success: true, message: `Checked in — Seat ${seatLabel}` });
      toast.success(`Ticket verified: Seat ${seatLabel}`);
      setCode('');
    },
    onError: (err) => {
      const message = extractErrorMessage(err);
      setLastResult({ success: false, message });
      toast.error(message);
    },
  });

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ticket Scanner</h1>
        <p className="text-sm text-muted-foreground">Verify and check in QR tickets at the gate.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-4 w-4" /> Scan or enter a ticket code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <QrCameraScanner onScan={(scanned) => scanMutation.mutate(scanned)} />

          <div className="space-y-2 border-t border-border pt-4">
            <Label htmlFor="manual-code">Manual code entry</Label>
            <div className="flex gap-2">
              <Input
                id="manual-code"
                placeholder="Paste ticket QR payload"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <Button onClick={() => code && scanMutation.mutate(code)} disabled={!code || scanMutation.isPending}>
                {scanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
              </Button>
            </div>
          </div>

          {lastResult && (
            <div
              className={`flex items-center gap-2 rounded-md border p-3 text-sm ${
                lastResult.success ? 'border-success/30 bg-success/10 text-success' : 'border-destructive/30 bg-destructive/10 text-destructive'
              }`}
            >
              {lastResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {lastResult.message}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
