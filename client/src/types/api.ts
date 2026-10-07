export interface IApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data: T;
}

export interface IPaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface IPaginatedResponse<T> {
  data: T[];
  metadata: IPaginationMeta;
}

export interface IPaginationParams {
  page?: number;
  limit?: number;
  search?: string;
}
