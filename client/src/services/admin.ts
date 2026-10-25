import axios from 'axios';

import api from './api';
import { env } from '@/lib/env';
import type {
  IAdminCase,
  IAdminCaseSavePayload,
  IAdminCaseSummary,
  IAdminField,
  IAdminFieldInput,
  IAdminFlagPayload,
  IAdminSettings,
  IPlatformSettings,
  ITalentCandidate,
  IAdminMemberDetail,
  IAdminMemberSummary,
  IAdminOrder,
  IAdminOverview,
  IAdminPartnerDirectory,
  IAdminPartnerInput,
  IAdminReassignPayload,
  IAdminReviewDetail,
  IAdminReviewer,
  IAdminReviewerAssignmentPayload,
  IAdminReviewerInput,
  IAdminReviewerStatusPayload,
  IAdminReviewList,
  IApiResponse,
  IPartner,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/reviewer.ts.
const loadMockApi = async () => (await import('@/mocks/adminApi')).adminApi;

const reviewPath = (id: string) => `/admin/reviews/${encodeURIComponent(id)}`;
const fieldPath = (key: string) => `/admin/fields/${encodeURIComponent(key)}`;
const reviewerPath = (id: string) => `/admin/reviewers/${encodeURIComponent(id)}`;

export const adminService = {
  listTalentPool: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listTalentPool();
    return (await api.get<IApiResponse<ITalentCandidate[]>>('/admin/talent-pool')).data.data;
  },
  shareTalent: async (id: string) => {
    if (env.isApiMocking) return (await loadMockApi()).shareTalent(id);
    return (
      await api.post<IApiResponse<ITalentCandidate>>(
        `/admin/talent-pool/${encodeURIComponent(id)}/share`
      )
    ).data.data;
  },
  listFields: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listFields();
    return (await api.get<IApiResponse<IAdminField[]>>('/admin/fields')).data.data;
  },
  createField: async (payload: IAdminFieldInput) => {
    if (env.isApiMocking) return (await loadMockApi()).createField(payload);
    return (await api.post<IApiResponse<IAdminField>>('/admin/fields', payload)).data.data;
  },
  updateField: async ({ key, payload }: { key: string; payload: IAdminFieldInput }) => {
    if (env.isApiMocking) return (await loadMockApi()).updateField(key, payload);
    return (await api.put<IApiResponse<IAdminField[]>>(fieldPath(key), payload)).data.data;
  },
  setFieldActive: async ({ key, isActive }: { key: string; isActive: boolean }) => {
    if (env.isApiMocking) return (await loadMockApi()).setFieldActive(key, isActive);
    return (await api.put<IApiResponse<IAdminField[]>>(`${fieldPath(key)}/status`, { isActive }))
      .data.data;
  },
  moveField: async ({ key, direction }: { key: string; direction: -1 | 1 }) => {
    if (env.isApiMocking) return (await loadMockApi()).moveField(key, direction);
    return (await api.post<IApiResponse<IAdminField[]>>(`${fieldPath(key)}/move`, { direction }))
      .data.data;
  },
  getSettings: async () => {
    if (env.isApiMocking) return (await loadMockApi()).getSettings();
    return (await api.get<IApiResponse<IAdminSettings>>('/admin/settings')).data.data;
  },
  saveSettings: async (payload: IPlatformSettings) => {
    if (env.isApiMocking) return (await loadMockApi()).saveSettings(payload);
    return (await api.put<IApiResponse<IAdminSettings>>('/admin/settings', payload)).data.data;
  },
  listMembers: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listMembers();
    return (await api.get<IApiResponse<IAdminMemberSummary[]>>('/admin/members')).data.data;
  },
  /** null jika member tidak ditemukan (404). */
  getMember: async (id: string): Promise<IAdminMemberDetail | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getMember(id);
    try {
      return (
        await api.get<IApiResponse<IAdminMemberDetail>>(`/admin/members/${encodeURIComponent(id)}`)
      ).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  listOrders: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listOrders();
    return (await api.get<IApiResponse<IAdminOrder[]>>('/admin/orders')).data.data;
  },
  getPartnerDirectory: async () => {
    if (env.isApiMocking) return (await loadMockApi()).getDirectory();
    return (await api.get<IApiResponse<IAdminPartnerDirectory>>('/admin/partners')).data.data;
  },
  /** id null = mitra baru. */
  savePartner: async ({ id, payload }: { id: string | null; payload: IAdminPartnerInput }) => {
    if (env.isApiMocking) {
      const mockApi = await loadMockApi();
      return id ? mockApi.updatePartner(id, payload) : mockApi.createPartner(payload);
    }
    const response = id
      ? await api.put<IApiResponse<IPartner>>(`/admin/partners/${encodeURIComponent(id)}`, payload)
      : await api.post<IApiResponse<IPartner>>('/admin/partners', payload);
    return response.data.data;
  },
  createReviewer: async (payload: IAdminReviewerInput) => {
    if (env.isApiMocking) return (await loadMockApi()).createReviewer(payload);
    return (await api.post<IApiResponse<IAdminReviewer>>('/admin/reviewers', payload)).data.data;
  },
  setReviewerCases: async ({
    id,
    payload,
  }: {
    id: string;
    payload: IAdminReviewerAssignmentPayload;
  }) => {
    if (env.isApiMocking) return (await loadMockApi()).setReviewerCases(id, payload);
    return (await api.put<IApiResponse<IAdminReviewer>>(`${reviewerPath(id)}/assignments`, payload))
      .data.data;
  },
  setReviewerStatus: async ({
    id,
    payload,
  }: {
    id: string;
    payload: IAdminReviewerStatusPayload;
  }) => {
    if (env.isApiMocking) return (await loadMockApi()).setReviewerStatus(id, payload);
    return (await api.put<IApiResponse<IAdminReviewer>>(`${reviewerPath(id)}/status`, payload)).data
      .data;
  },
  reassignReviewer: async ({ id, payload }: { id: string; payload: IAdminReassignPayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).reassignReviewer(id, payload);
    return (await api.post<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/reassign`, payload))
      .data.data;
  },
  getOverview: async () => {
    if (env.isApiMocking) return (await loadMockApi()).getOverview();
    return (await api.get<IApiResponse<IAdminOverview>>('/admin/overview')).data.data;
  },
  listReviews: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listReviews();
    return (await api.get<IApiResponse<IAdminReviewList>>('/admin/reviews')).data.data;
  },
  /** null jika penilaian tidak ditemukan (404). */
  getReview: async (id: string): Promise<IAdminReviewDetail | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getReview(id);
    try {
      return (await api.get<IApiResponse<IAdminReviewDetail>>(reviewPath(id))).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  regrade: async (id: string) => {
    if (env.isApiMocking) return (await loadMockApi()).regrade(id);
    return (await api.post<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/regrade`)).data
      .data;
  },
  setFlag: async ({ id, payload }: { id: string; payload: IAdminFlagPayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).setFlag(id, payload);
    return (await api.put<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/flag`, payload)).data
      .data;
  },
  remindReviewer: async (id: string) => {
    if (env.isApiMocking) return (await loadMockApi()).remindReviewer(id);
    return (await api.post<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/remind`)).data.data;
  },
  listCases: async () => {
    if (env.isApiMocking) return (await loadMockApi()).listCases();
    return (await api.get<IApiResponse<IAdminCaseSummary[]>>('/admin/cases')).data.data;
  },
  /** null jika case tidak ditemukan (404). */
  getCase: async (id: string): Promise<IAdminCase | null> => {
    if (env.isApiMocking) return (await loadMockApi()).getCase(id);
    try {
      return (await api.get<IApiResponse<IAdminCase>>(`/admin/cases/${encodeURIComponent(id)}`))
        .data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  /** id null = buat case baru. */
  saveCase: async ({ id, payload }: { id: string | null; payload: IAdminCaseSavePayload }) => {
    if (env.isApiMocking) return (await loadMockApi()).saveCase(id, payload);
    const response = id
      ? await api.put<IApiResponse<IAdminCase>>(`/admin/cases/${encodeURIComponent(id)}`, payload)
      : await api.post<IApiResponse<IAdminCase>>('/admin/cases', payload);
    return response.data.data;
  },
};
