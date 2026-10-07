import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type {
  IApiResponse,
  IGradeSubmissionPayload,
  IReviewerQueue,
  IReviewQueueItem,
  IReviewSubmissionDetail,
  IReviewDraft,
  IRevisionRequestPayload,
  TReviewDraftPayload,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/reviewStatus.ts.
const loadMockApi = async () => (await import('@/mocks/reviewerApi')).reviewerApi;

const submissionPath = (id: string) => `/reviewer/submissions/${encodeURIComponent(id)}`;

export const reviewerService = {
  getQueue: async () => {
    if (env.isApiMocking) return (await loadMockApi()).getQueue();
    return (await api.get<IApiResponse<IReviewerQueue>>('/reviewer/queue')).data.data;
  },
  /** null jika submission tidak ada di antrean reviewer ini (404). */
  getSubmission: async (id: string): Promise<IReviewSubmissionDetail | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getSubmission(id);
    try {
      return (await api.get<IApiResponse<IReviewSubmissionDetail>>(submissionPath(id))).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  saveDraft: async ({ id, payload }: { id: string; payload: TReviewDraftPayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).saveDraft(id, payload);
    return (await api.put<IApiResponse<IReviewDraft>>(`${submissionPath(id)}/draft`, payload)).data
      .data;
  },
  grade: async ({ id, payload }: { id: string; payload: IGradeSubmissionPayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).grade(id, payload);
    return (await api.post<IApiResponse<IReviewQueueItem>>(`${submissionPath(id)}/grade`, payload))
      .data.data;
  },
  requestRevision: async ({ id, payload }: { id: string; payload: IRevisionRequestPayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).requestRevision(id, payload);
    return (
      await api.post<IApiResponse<IReviewQueueItem>>(`${submissionPath(id)}/revision`, payload)
    ).data.data;
  },
};
