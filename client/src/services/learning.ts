import axios from 'axios';

import api from './api';
import { shouldMockService } from '@/lib/env';
import type {
  IApiResponse,
  ICaseDetail,
  ICaseListParams,
  ICaseSummary,
  ICertificate,
  IDashboardSummary,
  IEnrollment,
  IEnrollmentListParams,
  IPaginatedResponse,
  TTier,
} from '@/types';

// Prototype: saat mode mock aktif, data dibaca langsung dari data mockup di browser (tanpa
// jaringan), agar kartu selalu tampil walau service worker belum siap. Saat backend Go siap,
// matikan NEXT_PUBLIC_API_MOCKING dan cabang axios di bawah yang dipakai. Komponen tidak berubah.
const loadMockApi = async () => (await import('@/mocks/learningApi')).learningApi;

const isMocked = () => shouldMockService('learning');

export const caseService = {
  getAll: async (params?: ICaseListParams) => {
    if (isMocked()) return (await loadMockApi()).listCases(params);
    return (await api.get<IApiResponse<IPaginatedResponse<ICaseSummary>>>('/cases', { params }))
      .data.data;
  },
  /** null jika case tidak ditemukan (404). */
  getBySlug: async (slug: string): Promise<ICaseDetail | null> => {
    if (isMocked()) return (await loadMockApi()).getCaseBySlug(slug);
    try {
      return (await api.get<IApiResponse<ICaseDetail>>(`/cases/${encodeURIComponent(slug)}`)).data
        .data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) return null;
      throw error;
    }
  },
};

export const studentService = {
  getDashboard: async () => {
    if (isMocked()) return (await loadMockApi()).getDashboard();
    return (await api.get<IApiResponse<IDashboardSummary>>('/me/dashboard')).data.data;
  },
  getEnrollments: async (params?: IEnrollmentListParams) => {
    if (isMocked()) return (await loadMockApi()).listEnrollments(params);
    return (await api.get<IApiResponse<IEnrollment[]>>('/me/enrollments', { params })).data.data;
  },
  /** Mulai AI case gratis. B2B dibuat lewat checkout. */
  startCase: async (caseId: string) => {
    if (isMocked()) return (await loadMockApi()).startCase(caseId);
    return (await api.post<IApiResponse<IEnrollment>>('/me/enrollments', { caseId })).data.data;
  },
  getCertificates: async (params?: { tier?: TTier }) => {
    if (isMocked()) return (await loadMockApi()).listCertificates(params);
    return (await api.get<IApiResponse<ICertificate[]>>('/me/certificates', { params })).data.data;
  },
};
