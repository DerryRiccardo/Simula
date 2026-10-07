import { ApiResponseError } from '@/lib/apiError';
import { mockDb, toPublicUser } from '@/mocks/db';
import type { ILoginPayload, IOnboardingPayload, IRegisterPayload, IUser } from '@/types';

// Logika auth untuk mode mock. Dipakai service saat mock aktif dan oleh handler MSW.
// Sesi di produksi memakai cookie httpOnly; di mock, sesi disimpan di mockDb.

const GOOGLE_DEMO_EMAIL = 'pengguna.google@demo.id';

export const authApi = {
  login: ({ email, password }: ILoginPayload): IUser => {
    const user = mockDb.findUserByEmail(email);
    if (!user || user.password !== password) {
      throw new ApiResponseError(401, 'Email atau kata sandi salah.');
    }
    mockDb.setSession(user.id);
    return toPublicUser(user);
  },

  register: ({ name, email, password }: IRegisterPayload): IUser => {
    if (mockDb.findUserByEmail(email)) {
      throw new ApiResponseError(409, 'Email sudah terdaftar.', [
        { field: 'email', message: 'Email ini sudah terdaftar. Silakan masuk.' },
      ]);
    }
    const user = mockDb.createUser({ name, email, password });
    mockDb.setSession(user.id);
    return toPublicUser(user);
  },

  /** Simulasi Google OAuth: langsung masuk sebagai akun Google tiruan. */
  loginWithGoogle: (): IUser => {
    const user =
      mockDb.findUserByEmail(GOOGLE_DEMO_EMAIL) ??
      mockDb.createUser({
        name: 'Pengguna Google',
        email: GOOGLE_DEMO_EMAIL,
        password: crypto.randomUUID(),
      });
    mockDb.setSession(user.id);
    return toPublicUser(user);
  },

  logout: () => {
    mockDb.setSession(null);
    return null;
  },

  /** 401 bila belum masuk, sama seperti backend. */
  me: (): IUser => {
    const user = mockDb.getSessionUser();
    if (!user) throw new ApiResponseError(401, 'Belum masuk.');
    return toPublicUser(user);
  },

  completeOnboarding: ({ fieldKeys, studentStatus, major }: IOnboardingPayload): IUser => {
    const sessionUser = mockDb.getSessionUser();
    if (!sessionUser) throw new ApiResponseError(401, 'Belum masuk.');
    if (!fieldKeys?.length || fieldKeys.length > 3) {
      throw new ApiResponseError(400, 'Pilih 1 sampai 3 bidang.', [
        { field: 'fieldKeys', message: 'Pilih 1 sampai 3 bidang.' },
      ]);
    }
    const user = mockDb.updateUser(sessionUser.id, {
      fieldKeys,
      studentStatus,
      major: major?.trim() || null,
      isOnboarded: true,
    });
    if (!user) throw new ApiResponseError(404, 'Pengguna tidak ditemukan.');
    return toPublicUser(user);
  },
};
