import type { ReactNode } from 'react';

import { Logo } from '@/components/layout/Logo';
import { PortalMenu } from './PortalMenu';

interface PortalShellProps {
  /** Nama portal di header, misalnya "Portal reviewer". */
  label: string;
  /** Peran di menu akun, misalnya "Reviewer mitra". */
  roleLabel: string;
  /** Jejak halaman di header, mis. ReviewerBreadcrumb. */
  breadcrumb?: ReactNode;
  children: ReactNode;
}

// Shell portal reviewer dan admin: halamannya sedikit, jadi tanpa sidebar. Header tipis berisi
// logo, nama portal, dan menu akun.
export function PortalShell({ label, roleLabel, breadcrumb, children }: PortalShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white">
      <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Logo />
          <span className="h-5 w-px bg-line" aria-hidden="true" />
          <span className="hidden shrink-0 text-sm font-medium text-ink-muted md:inline">
            {label}
          </span>
          {breadcrumb && (
            <>
              <span className="hidden h-5 w-px bg-line md:block" aria-hidden="true" />
              {breadcrumb}
            </>
          )}
          <div className="ml-auto shrink-0">
            <PortalMenu roleLabel={roleLabel} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 pb-20 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
