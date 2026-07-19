import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../config/env';

// A ticket's QR code is just its (ticketId, matchId, seatId) plus an HMAC
// signature, base64url-encoded — not an opaque reference to a server-side
// record. That means a scanner can verify it's genuine (and unmodified)
// entirely offline, without a round-trip, and a forged or tampered code
// (e.g. someone editing the seatId to claim a better seat) fails signature
// verification instead of silently succeeding.
interface TicketPayload {
  ticketId: string;
  matchId: string;
  seatId: string;
}

function sign(payload: TicketPayload): string {
  const data = `${payload.ticketId}.${payload.matchId}.${payload.seatId}`;
  return crypto.createHmac('sha256', env.qrSigningSecret).update(data).digest('hex');
}

/** Constant-time string comparison — a plain `===` leaks timing information
 * proportional to how many leading characters match, which is exactly the
 * kind of side channel HMAC verification is supposed to be immune to. */
function timingSafeEqualStrings(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function buildSignedTicketCode(payload: TicketPayload): string {
  const signature = sign(payload);
  const raw = Buffer.from(
    JSON.stringify({ ...payload, sig: signature })
  ).toString('base64url');
  return raw;
}

export function verifySignedTicketCode(code: string): TicketPayload | null {
  try {
    const decoded = JSON.parse(Buffer.from(code, 'base64url').toString('utf-8'));
    const { sig, ...payload } = decoded;
    if (typeof sig !== 'string' || !timingSafeEqualStrings(sig, sign(payload))) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function generateQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(code, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}
