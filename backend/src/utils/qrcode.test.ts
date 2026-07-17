import { describe, it, expect } from 'vitest';
import { buildSignedTicketCode, verifySignedTicketCode } from './qrcode';

describe('qrcode signing', () => {
  const payload = { ticketId: 'ticket-1', matchId: 'match-1', seatId: 'seat-1' };

  it('round-trips a signed ticket code back to its original payload', () => {
    const code = buildSignedTicketCode(payload);
    const decoded = verifySignedTicketCode(code);
    expect(decoded).toEqual(payload);
  });

  it('rejects a code whose payload has been tampered with', () => {
    const code = buildSignedTicketCode(payload);
    const decoded = JSON.parse(Buffer.from(code, 'base64url').toString('utf-8'));
    const tampered = Buffer.from(JSON.stringify({ ...decoded, seatId: 'seat-2' })).toString('base64url');

    expect(verifySignedTicketCode(tampered)).toBeNull();
  });

  it('rejects a malformed code', () => {
    expect(verifySignedTicketCode('not-a-valid-code')).toBeNull();
  });

  it('produces different signatures for different payloads', () => {
    const codeA = buildSignedTicketCode(payload);
    const codeB = buildSignedTicketCode({ ...payload, seatId: 'seat-2' });
    expect(codeA).not.toEqual(codeB);
  });
});
