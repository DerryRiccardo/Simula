/** Nama layanan di src/services, dipakai untuk mode campuran (sebagian layanan memakai backend). */
export type TApiService =
  | 'auth'
  | 'learning'
  | 'checkout'
  | 'workspace'
  | 'reviewStatus'
  | 'result'
  | 'reviewer'
  | 'admin'
  | 'certificate'
  | 'profile';

// Layanan yang memakai backend asli walau mock aktif, dipisah koma (mis. "auth").
const realServices = (process.env.NEXT_PUBLIC_API_REAL_SERVICES ?? '')
  .split(',')
  .map((service) => service.trim())
  .filter(Boolean);

export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  isApiMocking: process.env.NEXT_PUBLIC_API_MOCKING === 'enabled',
} as const;

/** true bila layanan ini memakai data tiruan: mock aktif dan layanan tidak dipindah ke backend. */
export const shouldMockService = (service: TApiService) =>
  env.isApiMocking && !realServices.includes(service);
