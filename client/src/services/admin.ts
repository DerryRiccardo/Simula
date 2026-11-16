import axios from 'axios';

import api from './api';
import { shouldMockService } from '@/lib/env';
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
  IFileMeta,
  IPartner,
  IUploadTicket,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/reviewer.ts.
const loadMockApi = async () => (await import('@/mocks/adminApi')).adminApi;
// Mode campuran per menu: tiap menu admin bisa dipindah ke backend satu per satu.
const isOverviewMocked = () => shouldMockService('adminOverview');
const isMembersMocked = () => shouldMockService('adminMembers');
const isOrdersMocked = () => shouldMockService('adminOrders');
const isTalentPoolMocked = () => shouldMockService('adminTalentPool');
const isFieldsMocked = () => shouldMockService('adminFields');
const isSettingsMocked = () => shouldMockService('adminSettings');
const isPartnersMocked = () => shouldMockService('adminPartners');
const isReviewsMocked = () => shouldMockService('adminReviews');
const isCasesMocked = () => shouldMockService('adminCases');

const reviewPath = (id: string) => `/admin/reviews/${encodeURIComponent(id)}`;
const fieldPath = (key: string) => `/admin/fields/${encodeURIComponent(key)}`;
const reviewerPath = (id: string) => `/admin/reviewers/${encodeURIComponent(id)}`;

export const adminService = {
  listTalentPool: async () => {
    if (isTalentPoolMocked()) return (await loadMockApi()).listTalentPool();
    return (await api.get<IApiResponse<ITalentCandidate[]>>('/admin/talent-pool')).data.data;
  },
  shareTalent: async (id: string) => {
    if (isTalentPoolMocked()) return (await loadMockApi()).shareTalent(id);
    return (
      await api.post<IApiResponse<ITalentCandidate>>(
        `/admin/talent-pool/${encodeURIComponent(id)}/share`
      )
    ).data.data;
  },
  listFields: async () => {
    if (isFieldsMocked()) return (await loadMockApi()).listFields();
    return (await api.get<IApiResponse<IAdminField[]>>('/admin/fields')).data.data;
  },
  createField: async (payload: IAdminFieldInput) => {
    if (isFieldsMocked()) return (await loadMockApi()).createField(payload);
    return (await api.post<IApiResponse<IAdminField>>('/admin/fields', payload)).data.data;
  },
  updateField: async ({ key, payload }: { key: string; payload: IAdminFieldInput }) => {
    if (isFieldsMocked()) return (await loadMockApi()).updateField(key, payload);
    return (await api.put<IApiResponse<IAdminField[]>>(fieldPath(key), payload)).data.data;
  },
  setFieldActive: async ({ key, isActive }: { key: string; isActive: boolean }) => {
    if (isFieldsMocked()) return (await loadMockApi()).setFieldActive(key, isActive);
    return (await api.put<IApiResponse<IAdminField[]>>(`${fieldPath(key)}/status`, { isActive }))
      .data.data;
  },
  moveField: async ({ key, direction }: { key: string; direction: -1 | 1 }) => {
    if (isFieldsMocked()) return (await loadMockApi()).moveField(key, direction);
    return (await api.post<IApiResponse<IAdminField[]>>(`${fieldPath(key)}/move`, { direction }))
      .data.data;
  },
  getSettings: async () => {
    if (isSettingsMocked()) return (await loadMockApi()).getSettings();
    return (await api.get<IApiResponse<IAdminSettings>>('/admin/settings')).data.data;
  },
  saveSettings: async (payload: IPlatformSettings) => {
    if (isSettingsMocked()) return (await loadMockApi()).saveSettings(payload);
    return (await api.put<IApiResponse<IAdminSettings>>('/admin/settings', payload)).data.data;
  },
  listMembers: async () => {
    if (isMembersMocked()) return (await loadMockApi()).listMembers();
    return (await api.get<IApiResponse<IAdminMemberSummary[]>>('/admin/members')).data.data;
  },
  /** null jika member tidak ditemukan (404). */
  getMember: async (id: string): Promise<IAdminMemberDetail | null> => {
    if (isMembersMocked()) return (await loadMockApi()).getMember(id);
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
    if (isOrdersMocked()) return (await loadMockApi()).listOrders();
    return (await api.get<IApiResponse<IAdminOrder[]>>('/admin/orders')).data.data;
  },
  getPartnerDirectory: async () => {
    if (isPartnersMocked()) return (await loadMockApi()).getDirectory();
    return (await api.get<IApiResponse<IAdminPartnerDirectory>>('/admin/partners')).data.data;
  },
  /** id null = mitra baru. */
  savePartner: async ({ id, payload }: { id: string | null; payload: IAdminPartnerInput }) => {
    if (isPartnersMocked()) {
      const mockApi = await loadMockApi();
      return id ? mockApi.updatePartner(id, payload) : mockApi.createPartner(payload);
    }
    const response = id
      ? await api.put<IApiResponse<IPartner>>(`/admin/partners/${encodeURIComponent(id)}`, payload)
      : await api.post<IApiResponse<IPartner>>('/admin/partners', payload);
    return response.data.data;
  },
  setPartnerStatus: async ({ id, isActive }: { id: string; isActive: boolean }) => {
    if (isPartnersMocked()) return (await loadMockApi()).setPartnerStatus(id, isActive);
    return (
      await api.put<IApiResponse<IPartner>>(`/admin/partners/${encodeURIComponent(id)}/status`, {
        isActive,
      })
    ).data.data;
  },
  createReviewer: async (payload: IAdminReviewerInput) => {
    if (isPartnersMocked()) return (await loadMockApi()).createReviewer(payload);
    return (await api.post<IApiResponse<IAdminReviewer>>('/admin/reviewers', payload)).data.data;
  },
  setReviewerCases: async ({
    id,
    payload,
  }: {
    id: string;
    payload: IAdminReviewerAssignmentPayload;
  }) => {
    if (isPartnersMocked()) return (await loadMockApi()).setReviewerCases(id, payload);
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
    if (isPartnersMocked()) return (await loadMockApi()).setReviewerStatus(id, payload);
    return (await api.put<IApiResponse<IAdminReviewer>>(`${reviewerPath(id)}/status`, payload)).data
      .data;
  },
  reassignReviewer: async ({ id, payload }: { id: string; payload: IAdminReassignPayload }) => {
    if (isReviewsMocked()) return (await loadMockApi()).reassignReviewer(id, payload);
    return (await api.post<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/reassign`, payload))
      .data.data;
  },
  getOverview: async () => {
    if (isOverviewMocked()) return (await loadMockApi()).getOverview();
    return (await api.get<IApiResponse<IAdminOverview>>('/admin/overview')).data.data;
  },
  listReviews: async () => {
    if (isReviewsMocked()) return (await loadMockApi()).listReviews();
    return (await api.get<IApiResponse<IAdminReviewList>>('/admin/reviews')).data.data;
  },
  /** null jika penilaian tidak ditemukan (404). */
  getReview: async (id: string): Promise<IAdminReviewDetail | null> => {
    if (isReviewsMocked()) return (await loadMockApi()).getReview(id);
    try {
      return (await api.get<IApiResponse<IAdminReviewDetail>>(reviewPath(id))).data.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
  regrade: async (id: string) => {
    if (isReviewsMocked()) return (await loadMockApi()).regrade(id);
    return (await api.post<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/regrade`)).data
      .data;
  },
  setFlag: async ({ id, payload }: { id: string; payload: IAdminFlagPayload }) => {
    if (isReviewsMocked()) return (await loadMockApi()).setFlag(id, payload);
    return (await api.put<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/flag`, payload)).data
      .data;
  },
  remindReviewer: async (id: string) => {
    if (isReviewsMocked()) return (await loadMockApi()).remindReviewer(id);
    return (await api.post<IApiResponse<IAdminReviewDetail>>(`${reviewPath(id)}/remind`)).data.data;
  },
  listCases: async () => {
    if (isCasesMocked()) return (await loadMockApi()).listCases();
    return (await api.get<IApiResponse<IAdminCaseSummary[]>>('/admin/cases')).data.data;
  },
  /** null jika case tidak ditemukan (404). */
  getCase: async (id: string): Promise<IAdminCase | null> => {
    if (isCasesMocked()) return (await loadMockApi()).getCase(id);
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
    if (isCasesMocked()) return (await loadMockApi()).saveCase(id, payload);
    const response = id
      ? await api.put<IApiResponse<IAdminCase>>(`/admin/cases/${encodeURIComponent(id)}`, payload)
      : await api.post<IApiResponse<IAdminCase>>('/admin/cases', payload);
    return response.data.data;
  },
  setCaseStatus: async ({ id, status }: { id: string; status: 'published' | 'archived' }) => {
    if (isCasesMocked()) return (await loadMockApi()).setCaseStatus(id, status);
    return (
      await api.put<IApiResponse<IAdminCase>>(`/admin/cases/${encodeURIComponent(id)}/status`, {
        status,
      })
    ).data.data;
  },
  /** Unggah satu berkas materi: minta URL bertanda tangan, lalu PUT langsung ke storage. */
  uploadMaterial: async ({
    file,
    onProgress,
  }: {
    file: File;
    onProgress?: (percent: number) => void;
  }): Promise<IFileMeta> => {
    if (isCasesMocked()) return (await loadMockApi()).uploadMaterial(file);
    const ticket = (
      await api.post<IApiResponse<IUploadTicket>>('/admin/uploads', {
        fileName: file.name,
        sizeBytes: file.size,
      })
    ).data.data;
    // axios polos, bukan instance api: URL bertanda tangan tidak boleh membawa cookie sesi.
    await axios.put(ticket.uploadUrl, file, {
      headers: ticket.headers,
      onUploadProgress: (event) => {
        if (event.total) onProgress?.(Math.round((event.loaded / event.total) * 100));
      },
    });
    return { fileId: ticket.fileId, fileName: ticket.fileName, sizeBytes: ticket.sizeBytes };
  },
};
