import axios from 'axios';

import api from './api';
import { shouldMockService } from '@/lib/env';
import type {
  IApiResponse,
  ICaseWorkspace,
  IEnrollment,
  IFileMeta,
  ISubmissionContent,
  ISubmissionDraft,
  IUploadTicket,
} from '@/types';

// Mode mock: data dibaca langsung dari browser, sama seperti services/learning.ts.
const loadMockApi = async () => (await import('@/mocks/workspaceApi')).workspaceApi;

const isMocked = () => shouldMockService('workspace');

export const workspaceService = {
  /** null jika case tidak ditemukan (404). */
  get: async (slug: string): Promise<ICaseWorkspace | null> => {
    if (isMocked()) return (await loadMockApi()).getWorkspace(slug);
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
    if (isMocked()) return (await loadMockApi()).startWork(enrollmentId);
    return (await api.post<IApiResponse<IEnrollment>>(`/me/enrollments/${enrollmentId}/start`)).data
      .data;
  },
  saveDraft: async ({ enrollmentId, content }: ISubmissionPayload) => {
    if (isMocked()) return (await loadMockApi()).saveDraft(enrollmentId, content);
    return (
      await api.put<IApiResponse<ISubmissionDraft>>(
        `/me/enrollments/${enrollmentId}/draft`,
        content
      )
    ).data.data;
  },
  submit: async ({ enrollmentId, content }: ISubmissionPayload) => {
    if (isMocked()) return (await loadMockApi()).submitWork(enrollmentId, content);
    return (
      await api.post<IApiResponse<IEnrollment>>(`/me/enrollments/${enrollmentId}/submit`, content)
    ).data.data;
  },
  /**
   * Unggah berkas untuk satu slot: minta URL ke backend, lalu kirim langsung ke penyimpanan
   * (bukan lewat server). Mode mock tidak mengunggah apa pun.
   */
  uploadFile: async ({
    enrollmentId,
    slotId,
    file,
    onProgress,
  }: IUploadPayload): Promise<IFileMeta> => {
    if (isMocked()) return (await loadMockApi()).uploadFile(file);
    const ticket = (
      await api.post<IApiResponse<IUploadTicket>>('/uploads', {
        enrollmentId,
        slotId,
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

export interface IUploadPayload {
  enrollmentId: string;
  slotId: string;
  file: File;
  /** Persentase 0-100. */
  onProgress?: (percent: number) => void;
}

export interface ISubmissionPayload {
  enrollmentId: string;
  content: ISubmissionContent;
}
