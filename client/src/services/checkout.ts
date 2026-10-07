import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type {
  IApiResponse,
  ICheckoutSummary,
  ICreateOrderPayload,
  IOrder,
  TPaymentOutcome,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/learning.ts.
const loadMockApi = async () => (await import('@/mocks/checkoutApi')).checkoutApi;

export const checkoutService = {
  /** null jika case tidak ditemukan (404). */
  get: async (slug: string): Promise<ICheckoutSummary | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getCheckout(slug);
    try {
      return (
        await api.get<IApiResponse<ICheckoutSummary>>(`/cases/${encodeURIComponent(slug)}/checkout`)
      ).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  createOrder: async (payload: ICreateOrderPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).createOrder(payload);
    return (await api.post<IApiResponse<IOrder>>('/orders', payload)).data.data;
  },
  cancelOrder: async (orderId: string) => {
    if (env.isApiMocking) return (await loadMockApi()).cancelOrder(orderId);
    return (await api.post<IApiResponse<IOrder>>(`/orders/${orderId}/cancel`)).data.data;
  },
  /** Prototype saja. Di produksi status order diperbarui lewat webhook payment gateway. */
  simulatePayment: async ({ orderId, outcome }: { orderId: string; outcome: TPaymentOutcome }) => {
    if (env.isApiMocking) return (await loadMockApi()).simulatePayment(orderId, outcome);
    return (await api.post<IApiResponse<IOrder>>(`/orders/${orderId}/simulate`, { outcome })).data
      .data;
  },
};
