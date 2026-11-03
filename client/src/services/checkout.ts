import axios from 'axios';

import api from './api';
import { shouldMockService } from '@/lib/env';
import type {
  IApiResponse,
  ICheckoutSummary,
  ICreateOrderPayload,
  IOrder,
  TPaymentOutcome,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/learning.ts.
const loadMockApi = async () => (await import('@/mocks/checkoutApi')).checkoutApi;
const isMocked = () => shouldMockService('checkout');

export const checkoutService = {
  /** null jika case tidak ditemukan (404). */
  get: async (slug: string): Promise<ICheckoutSummary | null> => {
    if (isMocked()) return (await loadMockApi()).getCheckout(slug);
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
    if (isMocked()) return (await loadMockApi()).createOrder(payload);
    return (await api.post<IApiResponse<IOrder>>('/orders', payload)).data.data;
  },
  cancelOrder: async (orderId: string) => {
    if (isMocked()) return (await loadMockApi()).cancelOrder(orderId);
    return (await api.post<IApiResponse<IOrder>>(`/orders/${orderId}/cancel`)).data.data;
  },
  /**
   * Panel demo. Backend hanya melayaninya dengan gateway palsu (PAYMENT_PROVIDER=fake) dan
   * memprosesnya lewat jalur webhook yang sama; di produksi status order datang dari webhook.
   */
  simulatePayment: async ({ orderId, outcome }: { orderId: string; outcome: TPaymentOutcome }) => {
    if (isMocked()) return (await loadMockApi()).simulatePayment(orderId, outcome);
    return (await api.post<IApiResponse<IOrder>>(`/orders/${orderId}/simulate`, { outcome })).data
      .data;
  },
};
