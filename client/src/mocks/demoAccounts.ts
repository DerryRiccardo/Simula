import type { TRole } from '@/types';

// Akun demo untuk presentasi. Hanya berlaku di mode mock (NEXT_PUBLIC_API_MOCKING=enabled).
export const DEMO_PASSWORD = 'demo1234';

export const DEMO_EMAILS: Record<TRole, string> = {
  student: 'mahasiswa@demo.id',
  reviewer: 'reviewer@demo.id',
  admin: 'admin@demo.id',
};
