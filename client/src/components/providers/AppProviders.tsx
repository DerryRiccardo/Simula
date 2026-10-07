'use client';

import { useState, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';

import { createQueryClient } from '@/lib/queryClient';
import { MockProvider } from './MockProvider';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  // useState memastikan satu QueryClient per sesi browser, tidak dibuat ulang tiap render.
  const [queryClient] = useState(createQueryClient);

  return (
    <MockProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        {/* Pojok kanan bawah, diangkat 80px agar tidak menutupi tombol "Bantuan" yang melayang. */}
        <Toaster
          position="bottom-right"
          offset={{ bottom: 80, right: 20 }}
          mobileOffset={{ bottom: 80, right: 16, left: 16 }}
          richColors
          closeButton
        />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </MockProvider>
  );
}
