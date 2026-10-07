import type { ReactNode } from 'react';

import { Logo } from '@/components/layout/Logo';
import { ReviewerMenu } from './ReviewerMenu';

// Portal reviewer cukup dua halaman (antrean dan halaman review), jadi tanpa sidebar:
// header tipis dengan logo, penanda portal, dan menu akun.
export function ReviewerShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <span className="h-5 w-px bg-line" aria-hidden="true" />
          <span className="text-sm font-medium text-ink-muted">Portal reviewer</span>
          <div className="ml-auto">
            <ReviewerMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
