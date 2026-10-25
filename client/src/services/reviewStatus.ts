import axios from 'axios';

import api from './api';
import { shouldMockService } from '@/lib/env';
import type { IApiResponse, ICaseStatus, IEnrollment, TReviewSimulation } from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/workspace.ts.
const loadMockApi = async () => (await import('@/mocks/reviewStatusApi')).reviewStatusApi;

/** Simulasi keputusan reviewer hanya ada di mode mock; backend memakai portal reviewer. */
export const canSimulateReview = () => shouldMockService('reviewStatus');

export const reviewStatusService = {
  /** null jika case tidak ditemukan (404). */
  get: async (slug: string): Promise<ICaseStatus | null> => {
    if (canSimulateReview()) return (await loadMockApi()).getStatus(slug);
    try {
      return (await api.get<IApiResponse<ICaseStatus>>(`/cases/${encodeURIComponent(slug)}/status`))
        .data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  /** Prototype saja: keputusan reviewer tiruan dari panel demo. */
  simulate: async ({ enrollmentId, outcome }: IReviewSimulationPayload) => {
    if (canSimulateReview()) return (await loadMockApi()).simulateReview(enrollmentId, outcome);
    return (
      await api.post<IApiResponse<IEnrollment>>(`/me/enrollments/${enrollmentId}/simulate-review`, {
        outcome,
      })
    ).data.data;
  },
};

export interface IReviewSimulationPayload {
  enrollmentId: string;
  outcome: TReviewSimulation;
}
