import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type {
  IApiResponse,
  ICaseWorkspace,
  IEnrollment,
  ISubmissionContent,
  ISubmissionDraft,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/learning.ts.
const loadMockApi = async () => (await import('@/mocks/workspaceApi')).workspaceApi;

export const workspaceService = {
  /** null jika case tidak ditemukan (404). */
  get: async (slug: string): Promise<ICaseWorkspace | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getWorkspace(slug);
    try {
      return (
        await api.get<IApiResponse<ICaseWorkspace>>(`/cases/${encodeURIComponent(slug)}/workspace`)
      ).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  start: async (enrollmentId: string) => {
    if (env.isApiMocking) return (await loadMockApi()).startWork(enrollmentId);
    return (await api.post<IApiResponse<IEnrollment>>(`/me/enrollments/${enrollmentId}/start`)).data
      .data;
  },
  saveDraft: async ({ enrollmentId, content }: ISubmissionPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).saveDraft(enrollmentId, content);
    return (
      await api.put<IApiResponse<ISubmissionDraft>>(
        `/me/enrollments/${enrollmentId}/draft`,
        content
      )
    ).data.data;
  },
  submit: async ({ enrollmentId, content }: ISubmissionPayload) => {
    if (env.isApiMocking) return (await loadMockApi()).submitWork(enrollmentId, content);
    return (
      await api.post<IApiResponse<IEnrollment>>(`/me/enrollments/${enrollmentId}/submit`, content)
    ).data.data;
  },
};

export interface ISubmissionPayload {
  enrollmentId: string;
  content: ISubmissionContent;
}
