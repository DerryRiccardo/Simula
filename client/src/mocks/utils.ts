import { delay } from 'msw';
import { HttpResponse } from 'msw/http';

import { env } from '@/lib/env';
import type { IFieldError } from '@/types';

export const apiPath = (path: string) => `${env.apiUrl}${path}`;

// Jeda kecil agar state loading terlihat seperti saat memanggil backend sungguhan.
export const networkDelay = () => delay(450);

export const ok = <T>(data: T, message = 'OK', status = 200) =>
  HttpResponse.json({ success: true, message, data }, { status });

export const fail = (status: number, message: string, errors?: IFieldError[]) =>
  HttpResponse.json({ success: false, message, data: null, errors }, { status });
