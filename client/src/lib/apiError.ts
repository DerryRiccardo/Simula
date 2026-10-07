import axios from 'axios';
import { toast } from 'sonner';

import type { IFieldError } from '@/types';

interface IErrorBody {
  message?: string;
  errors?: IFieldError[];
}

/**
 * Error berbentuk respons API untuk mode mock (service memanggil mock langsung, tanpa HTTP),
 * supaya pesan dan error per field tetap terbaca sama seperti error dari axios.
 */
export class ApiResponseError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly errors?: IFieldError[]
  ) {
    super(message);
    this.name = 'ApiResponseError';
  }
}

function getErrorBody(error: unknown): IErrorBody | undefined {
  if (error instanceof ApiResponseError) return { message: error.message, errors: error.errors };
  return axios.isAxiosError(error) ? (error.response?.data as IErrorBody | undefined) : undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string) {
  const data = getErrorBody(error);
  return data?.message ?? data?.errors?.[0]?.message ?? fallback;
}

/** Error validasi per field dari backend, untuk dipetakan ke form dengan setError. */
export function getApiFieldErrors(error: unknown): IFieldError[] {
  return getErrorBody(error)?.errors ?? [];
}

export function handleApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}
