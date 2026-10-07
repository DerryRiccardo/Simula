import { http } from 'msw/http';

import { checkoutApi } from '@/mocks/checkoutApi';
import { mockDb } from '@/mocks/db';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type { ICreateOrderPayload, TPaymentOutcome } from '@/types';

// Kontrak endpoint checkout B2B. Backend Go wajib mengikuti path dan bentuk respons ini.

const requireSession = () => (mockDb.getSessionUser() ? null : fail(401, 'Belum masuk.'));

const run = <T>(action: () => T, status = 200) => {
  try {
    return ok(action(), 'OK', status);
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');
  }
};

export const checkoutHandlers = [
  http.get(apiPath('/cases/:slug/checkout'), async ({ params }) => {
    await networkDelay();
    const unauthorized = requireSession();
    if (unauthorized) return unauthorized;
    const summary = checkoutApi.getCheckout(String(params.slug));
    return summary ? ok(summary) : fail(404, 'Case tidak ditemukan.');
  }),

  // Body: { caseId, method }. VA → order menunggu + enrollment "Menunggu pembayaran".
  http.post(apiPath('/orders'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as ICreateOrderPayload;
    return requireSession() ?? run(() => checkoutApi.createOrder(payload), 201);
  }),

  http.post(apiPath('/orders/:id/cancel'), async ({ params }) => {
    await networkDelay();
    return requireSession() ?? run(() => checkoutApi.cancelOrder(String(params.id)));
  }),

  // Khusus prototype: menggantikan webhook payment gateway. Body: { outcome }.
  http.post(apiPath('/orders/:id/simulate'), async ({ params, request }) => {
    await networkDelay();
    const { outcome } = (await request.json()) as { outcome: TPaymentOutcome };
    return requireSession() ?? run(() => checkoutApi.simulatePayment(String(params.id), outcome));
  }),
];
