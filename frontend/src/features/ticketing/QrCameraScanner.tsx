import { useEffect, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScannerState } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QrCameraScannerProps {
  onScan: (code: string) => void;
}

const ELEMENT_ID = 'qr-camera-scanner-region';

export function QrCameraScanner({ onScan }: QrCameraScannerProps) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!active) return;

    const scanner = new Html5Qrcode(ELEMENT_ID);
    let cancelled = false;

    const startPromise = scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          if (!cancelled) onScan(decodedText);
        },
        () => {
          // ignore per-frame decode misses
        }
      )
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to access camera');
          setActive(false);
        }
      });

    return () => {
      cancelled = true;
      // html5-qrcode throws synchronously if stop() is called before start()
      // has finished initializing the camera — wait for it to settle and
      // check the actual scanner state first, so toggling the camera off
      // quickly can't crash the page.
      startPromise
        .then(() => {
          const state = scanner.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            return scanner.stop().then(() => scanner.clear());
          }
          return undefined;
        })
        .catch(() => undefined);
    };
  }, [active, onScan]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Camera scanner</p>
        <Button type="button" size="sm" variant="outline" onClick={() => setActive((v) => !v)}>
          {active ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {active ? 'Stop camera' : 'Start camera'}
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div id={ELEMENT_ID} className={active ? 'mx-auto max-w-xs overflow-hidden rounded-lg border border-border' : 'hidden'} />
    </div>
  );
}
