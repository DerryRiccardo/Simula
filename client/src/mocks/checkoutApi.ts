import { PAYMENT_METHOD_BY_VALUE, PAYMENT_WINDOW_HOURS } from '@/constants/payment';
import { findCaseById } from '@/mocks/data/cases';
import { mockDb, type IMockOrderRecord } from '@/mocks/db';
import { learningApi } from '@/mocks/learningApi';
import type {
  ICheckoutSummary,
  ICreateOrderPayload,
  IEnrollment,
  IOrder,
  TPaymentOutcome,
} from '@/types';

// Logika checkout untuk mode mock. Payment gateway disimulasikan (CONTEXT.md 4.6).

function requireUser() {
  const user = mockDb.getSessionUser();
  if (!user) throw new Error('Silakan masuk terlebih dahulu.');
  return user;
}

const toOrder = ({ userId: _userId, ...order }: IMockOrderRecord): IOrder => order;

const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

// Nomor acak untuk prototype; backend memakai nomor dari payment gateway.
const randomDigits = (length: number) =>
  Array.from({ length }, () => Math.floor(Math.random() * 10)).join('');

const formatVaNumber = (digits: string) => digits.replace(/(\d{4})(?=\d)/g, '$1 ');

function findUserEnrollment(userId: string, caseId: string) {
  return mockDb.listEnrollments(userId).find((record) => record.caseId === caseId);
}

function toEnrollmentOrNull(userId: string, caseId: string): IEnrollment | null {
  const record = findUserEnrollment(userId, caseId);
  const caseSummary = findCaseById(caseId);
  if (!record || !caseSummary) return null;
  const { id, status, deadlineAt, updatedAt, score, certificateId } = record;
  return { id, caseSummary, status, deadlineAt, updatedAt, score, certificateId };
}

/** Order yang lewat batas bayar otomatis kedaluwarsa, seperti yang dilakukan backend. */
function expireIfOverdue(order: IMockOrderRecord) {
  if (order.status !== 'awaiting_payment' || new Date(order.expiresAt) > new Date()) return order;
  settle(order, 'expired');
  return order;
}

function settle(order: IMockOrderRecord, outcome: TPaymentOutcome) {
  const enrollment = findUserEnrollment(order.userId, order.caseId);
  if (outcome === 'paid') {
    mockDb.updateOrder(order.id, { status: 'paid', paidAt: new Date().toISOString() });
    // Berhasil → "Belum dimulai"; tenggat baru dihitung saat klik "Mulai mengerjakan".
    const target =
      enrollment ??
      mockDb.addEnrollment({ userId: order.userId, caseId: order.caseId, status: 'not_started' });
    mockDb.updateEnrollment(target.id, { status: 'not_started', deadlineAt: null });
    mockDb.addEnrollmentEvent(target.id, { type: 'paid' });
    return;
  }
  mockDb.updateOrder(order.id, { status: outcome });
  // Gagal/kedaluwarsa: case belum dimiliki, jadi enrollment "Menunggu pembayaran" dilepas.
  if (enrollment?.status === 'pending_payment') mockDb.removeEnrollment(enrollment.id);
}

function getOwnedOrder(orderId: string) {
  const user = requireUser();
  const order = mockDb.listOrders(user.id).find((item) => item.id === orderId);
  if (!order) throw new Error('Order tidak ditemukan.');
  return order;
}

export const checkoutApi = {
  /** null jika slug tidak ditemukan. */
  getCheckout: (slug: string): ICheckoutSummary | null => {
    const caseInfo = learningApi.getCaseBySlug(slug);
    if (!caseInfo) return null;
    const user = requireUser();
    const latest = mockDb
      .listOrders(user.id)
      .filter((order) => order.caseId === caseInfo.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const order = latest ? expireIfOverdue(latest) : undefined;
    return {
      caseInfo,
      enrollment: toEnrollmentOrNull(user.id, caseInfo.id),
      // Order lunas tidak ditampilkan lagi; halaman cukup memakai status enrollment.
      order: order && order.status !== 'paid' ? toOrder(order) : null,
    };
  },

  createOrder: ({ caseId, method }: ICreateOrderPayload): IOrder => {
    const user = requireUser();
    const caseSummary = findCaseById(caseId);
    if (!caseSummary || caseSummary.tier !== 'b2b' || caseSummary.price === null) {
      throw new Error('Case ini tidak memerlukan pembayaran.');
    }
    const enrollment = findUserEnrollment(user.id, caseId);
    if (enrollment && enrollment.status !== 'pending_payment') {
      throw new Error('Kamu sudah memiliki case ini.');
    }

    // Satu order aktif per case: order lama yang masih menunggu dibatalkan.
    mockDb
      .listOrders(user.id)
      .filter((order) => order.caseId === caseId && order.status === 'awaiting_payment')
      .forEach((order) => mockDb.updateOrder(order.id, { status: 'failed' }));

    const option = PAYMENT_METHOD_BY_VALUE[method];
    const now = new Date();
    const expiresAt = hoursFromNow(PAYMENT_WINDOW_HOURS);
    const order = mockDb.addOrder({
      id: `o-${crypto.randomUUID()}`,
      userId: user.id,
      invoiceNumber: `INV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomDigits(4)}`,
      caseId,
      method,
      status: 'awaiting_payment',
      subtotal: caseSummary.price,
      adminFee: option.adminFee,
      total: caseSummary.price + option.adminFee,
      createdAt: now.toISOString(),
      expiresAt,
      vaNumber: option.isVirtualAccount ? formatVaNumber(`8277${randomDigits(12)}`) : null,
      paidAt: null,
    });

    // VA: case masuk Case Saya sebagai "Menunggu pembayaran" dengan batas waktu bayar.
    if (option.isVirtualAccount) {
      if (enrollment) {
        mockDb.updateEnrollment(enrollment.id, { deadlineAt: expiresAt });
      } else {
        const created = mockDb.addEnrollment({
          userId: user.id,
          caseId,
          status: 'pending_payment',
        });
        mockDb.updateEnrollment(created.id, { deadlineAt: expiresAt });
      }
    }
    return toOrder(order);
  },

  /** Batalkan order yang masih menunggu, misalnya untuk ganti metode pembayaran. */
  cancelOrder: (orderId: string): IOrder => {
    const order = getOwnedOrder(orderId);
    if (order.status !== 'awaiting_payment') throw new Error('Order ini sudah tidak aktif.');
    settle(order, 'failed');
    return toOrder(order);
  },

  /** Prototype saja: menggantikan callback payment gateway. */
  simulatePayment: (orderId: string, outcome: TPaymentOutcome): IOrder => {
    const order = getOwnedOrder(orderId);
    if (order.status !== 'awaiting_payment') throw new Error('Order ini sudah tidak aktif.');
    settle(order, outcome);
    return toOrder(order);
  },
};
