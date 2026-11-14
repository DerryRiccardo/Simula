import api from './api';
import type { IApiResponse, IPlatformSettings } from '@/types';

export interface IPublicField {
  key: string;
  label: string;
  description: string;
}

export async function getPublicFields(): Promise<IPublicField[]> {
  const response = await api.get<IApiResponse<IPublicField[]>>('/fields');
  return response.data.data;
}

export async function getPublicSettings(): Promise<IPlatformSettings> {
  const response = await api.get<IApiResponse<IPlatformSettings>>('/settings');
  return response.data.data;
}
