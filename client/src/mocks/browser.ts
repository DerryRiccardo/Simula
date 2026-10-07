import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

const worker = setupWorker(...handlers);

// Disimpan per modul agar worker hanya di-start sekali, termasuk saat React Strict Mode
// menjalankan efek dua kali di development.
let startPromise: Promise<unknown> | undefined;

export function startMockWorker() {
  startPromise ??= worker.start({ onUnhandledFrame: 'bypass', quiet: true });
  return startPromise;
}
