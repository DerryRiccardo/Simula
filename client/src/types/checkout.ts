import type { ICaseDetail, IEnrollment } from './case';

// Kontrak data checkout B2B (prototype/CONTEXT.md 4.6).

/** va_* = transfer virtual account (menunggu pembayaran); qris/gopay = bayar instan. */
export type TPaymentMethod = 'va_bca' | 'va_mandiri' | 'va_bni' | 'qris' | 'gopay';

export type TOrderStatus = 'awaiting_payment' | 'paid' | 'failed' | 'expired';

export interface IOrder {
  id: string;
  /** Nomor invoice yang ditampilkan ke pengguna, mis. INV/2026/10/0412. */
  invoiceNumber: string;
  caseId: string;
  method: TPaymentMethod;
  status: TOrderStatus;
  subtotal: number;
  adminFee: number;
  total: number;
  createdAt: string;
  /** Batas bayar. Lewat dari ini, order kedaluwarsa. */
  expiresAt: string;
  /** Hanya untuk virtual account. */
  vaNumber: string | null;
  paidAt: string | null;
}

export interface ICheckoutSummary {
  caseInfo: ICaseDetail;
  enrollment: IEnrollment | null;
  /** Order terakhir untuk case ini (menunggu, gagal, atau kedaluwarsa), atau null. */
  order: IOrder | null;
}

export interface ICreateOrderPayload {
  caseId: string;
  method: TPaymentMethod;
}

/** Hanya untuk prototype: menggantikan callback payment gateway. */
export type TPaymentOutcome = 'paid' | 'failed' | 'expired';
