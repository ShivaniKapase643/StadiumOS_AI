import crypto from 'crypto';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

export interface ChargeResult {
  status: PaymentStatus;
  transactionRef: string;
}

/**
 * Self-contained mock payment gateway: pending -> success/failed state
 * machine with a realistic ~92% success rate. Swapping in a real gateway
 * (Stripe/Razorpay) later only requires replacing this function's body —
 * callers only depend on ChargeResult.
 */
export async function charge(amount: number, method: PaymentMethod): Promise<ChargeResult> {
  const transactionRef = `MOCK_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  // Simulate gateway latency.
  await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));

  const succeeds = Math.random() < 0.92;
  return { status: succeeds ? PaymentStatus.SUCCESS : PaymentStatus.FAILED, transactionRef };
}

export async function processRefund(amount: number): Promise<{ status: 'PROCESSED' | 'REJECTED' }> {
  await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));
  return { status: Math.random() < 0.97 ? 'PROCESSED' : 'REJECTED' };
}
