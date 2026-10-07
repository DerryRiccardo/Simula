import type { HttpHandler } from 'msw/http';

import { authHandlers } from './auth';
import { certificateHandlers } from './certificate';
import { checkoutHandlers } from './checkout';
import { learningHandlers } from './learning';
import { profileHandlers } from './profile';
import { resultHandlers } from './result';
import { reviewerHandlers } from './reviewer';
import { reviewStatusHandlers } from './reviewStatus';
import { workspaceHandlers } from './workspace';

// Handler per fitur didaftarkan di sini. Path harus sama persis dengan kontrak API backend Go.
export const handlers: HttpHandler[] = [
  ...authHandlers,
  ...learningHandlers,
  ...workspaceHandlers,
  ...checkoutHandlers,
  ...reviewStatusHandlers,
  ...resultHandlers,
  ...certificateHandlers,
  ...profileHandlers,
  ...reviewerHandlers,
];
