import { http } from 'msw/http';

import { mockDb } from '@/mocks/db';
import { profileApi } from '@/mocks/profileApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';
import type { IProfileDetailsPayload, TNotificationPreferences, TShareDefault } from '@/types';

// Kontrak endpoint halaman Profil. Backend Go wajib mengikuti path dan bentuk respons ini.

const requireSession = () => (mockDb.getSessionUser() ? null : fail(401, 'Belum masuk.'));

const run = <T>(action: () => T) => {
  try {
    return ok(action());
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : 'Permintaan gagal.');
  }
};

export const profileHandlers = [
  http.get(apiPath('/users/me/profile'), async () => {
    await networkDelay();
    return requireSession() ?? run(() => profileApi.getProfile());
  }),

  // Body: IProfileDetailsPayload (data diri + bidang).
  http.patch(apiPath('/users/me/profile'), async ({ request }) => {
    await networkDelay();
    const payload = (await request.json()) as IProfileDetailsPayload;
    return requireSession() ?? run(() => profileApi.updateDetails(payload));
  }),

  // Body: TNotificationPreferences (per jenis notifikasi × kanal email / dashboard).
  http.put(apiPath('/users/me/notifications'), async ({ request }) => {
    await networkDelay();
    const notifications = (await request.json()) as TNotificationPreferences;
    return requireSession() ?? run(() => profileApi.updateNotifications(notifications));
  }),

  // Body: { shareDefault: 'ask' | 'always' | 'never' }.
  http.put(apiPath('/users/me/data-sharing'), async ({ request }) => {
    await networkDelay();
    const { shareDefault } = (await request.json()) as { shareDefault: TShareDefault };
    return requireSession() ?? run(() => profileApi.updateShareDefault(shareDefault));
  }),
];
