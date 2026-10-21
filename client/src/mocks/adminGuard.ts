import { ApiResponseError } from '@/lib/apiError';
import { mockDb } from '@/mocks/db';

/** Semua endpoint panel admin: 401 bila belum masuk, 403 untuk peran lain. */
export function requireAdmin() {
  const user = mockDb.getSessionUser();
  if (!user) throw new ApiResponseError(401, 'Silakan masuk terlebih dahulu.');
  if (user.role !== 'admin') throw new ApiResponseError(403, 'Halaman ini khusus admin.');
  return user;
}
