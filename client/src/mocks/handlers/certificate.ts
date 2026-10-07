import { http } from 'msw/http';

import { certificateApi } from '@/mocks/certificateApi';
import { apiPath, fail, networkDelay, ok } from '@/mocks/utils';

// Kontrak endpoint verifikasi sertifikat. Publik: tidak butuh sesi.

export const certificateHandlers = [
  http.get(apiPath('/certificates/:id'), async ({ params }) => {
    await networkDelay();
    const verification = certificateApi.verify(String(params.id));
    return verification ? ok(verification) : fail(404, 'Sertifikat tidak ditemukan.');
  }),
];
