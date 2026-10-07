'use client';

import { useEffect } from 'react';

import { startMockWorker } from './browser';

interface MockWorkerStarterProps {
  onReady: () => void;
}

// Hanya dimuat di browser (lewat next/dynamic dengan ssr: false), karena msw/browser tidak tersedia di server.
export default function MockWorkerStarter({ onReady }: MockWorkerStarterProps) {
  useEffect(() => {
    let isCancelled = false;

    startMockWorker().finally(() => {
      if (!isCancelled) onReady();
    });

    return () => {
      isCancelled = true;
    };
  }, [onReady]);

  return null;
}
