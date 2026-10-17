import type { HttpHandler } from 'msw/http';

import { shouldMockService, type TApiService } from '@/lib/env';
import { adminHandlers } from './admin';
import { authHandlers } from './auth';
import { certificateHandlers } from './certificate';
import { checkoutHandlers } from './checkout';
import { learningHandlers } from './learning';
import { profileHandlers } from './profile';
import { resultHandlers } from './result';
import { reviewerHandlers } from './reviewer';
import { reviewStatusHandlers } from './reviewStatus';
import { workspaceHandlers } from './workspace';

// Handler per layanan. Path harus sama persis dengan kontrak API backend Go.
const HANDLERS_BY_SERVICE: Record<TApiService, HttpHandler[]> = {
  auth: authHandlers,
  learning: learningHandlers,
  workspace: workspaceHandlers,
  checkout: checkoutHandlers,
  reviewStatus: reviewStatusHandlers,
  result: resultHandlers,
  certificate: certificateHandlers,
  profile: profileHandlers,
  reviewer: reviewerHandlers,
  admin: adminHandlers,
};

// Mode campuran: layanan yang sudah memakai backend tidak didaftarkan, agar service worker tidak
// mencegat request ke API asli.
export const handlers: HttpHandler[] = (Object.keys(HANDLERS_BY_SERVICE) as TApiService[])
  .filter(shouldMockService)
  .flatMap((service) => HANDLERS_BY_SERVICE[service]);
