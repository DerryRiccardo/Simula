'use client';

import { useCallback, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';

import { env } from '@/lib/env';

const MockWorkerStarter = dynamic(() => import('@/mocks/MockWorkerStarter'), { ssr: false });

interface MockProviderProps {
  children: ReactNode;
}

// Menahan render sampai service worker MSW aktif, supaya request pertama tidak lolos ke jaringan.
// Saat NEXT_PUBLIC_API_MOCKING tidak 'enabled', komponen ini langsung merender children.
export function MockProvider({ children }: MockProviderProps) {
  const [isReady, setIsReady] = useState(!env.isApiMocking);
  const handleReady = useCallback(() => setIsReady(true), []);

  if (isReady) return <>{children}</>;
  return <MockWorkerStarter onReady={handleReady} />;
}
