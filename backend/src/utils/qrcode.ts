import QRCode from 'qrcode';
import crypto from 'crypto';
import { env } from '../config/env';

interface TicketPayload {
  ticketId: string;
  matchId: string;
  seatId: string;
}

function sign(payload: TicketPayload): string {
  const data = `${payload.ticketId}.${payload.matchId}.${payload.seatId}`;
  return crypto.createHmac('sha256', env.qrSigningSecret).update(data).digest('hex');
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
    const expectedSig = sign(payload);
    if (sig !== expectedSig) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function generateQrDataUrl(code: string): Promise<string> {
  return QRCode.toDataURL(code, { errorCorrectionLevel: 'M', margin: 1, width: 300 });
}
