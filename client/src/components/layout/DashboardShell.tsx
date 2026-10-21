'use client';

import { Suspense, useState, type ReactNode } from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Button, Sheet, SheetContent, SheetTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import { Breadcrumb, type IBreadcrumbItem } from './Breadcrumb';

const COLLAPSE_STORAGE_KEY = 'ws-sidebar-collapsed';

function readIsCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

interface DashboardShellProps {
  /** Isi sidebar; onNavigate menutup panel menu di ponsel setelah item dipilih. */
  renderSidebar: (onNavigate?: () => void) => ReactNode;
  breadcrumb: IBreadcrumbItem[];
  /** Kontrol di kanan header, misalnya kotak pencarian. */
  headerEnd?: ReactNode;
  /** Elemen melayang di luar alur halaman, misalnya dialog pencarian atau tombol bantuan. */
  overlays?: ReactNode;
  children: ReactNode;
}

// Kerangka dashboard mahasiswa dan admin: sidebar yang bisa disembunyikan (layar lebar) atau
// dibuka sebagai panel (ponsel), header berisi breadcrumb, lalu konten halaman.
export function DashboardShell({
  renderSidebar,
  breadcrumb,
  headerEnd,
  overlays,
  children,
}: DashboardShellProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readIsCollapsed);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Abaikan: pilihan tetap berlaku selama tab terbuka.
    }
  };

  // useSearchParams di sidebar butuh Suspense agar halaman statis tetap bisa di-prerender.
  const sidebar = (onNavigate?: () => void) => (
    <Suspense fallback={null}>{renderSidebar(onNavigate)}</Suspense>
  );

  return (
    <div className="flex min-h-dvh flex-1 bg-white">
      <aside
        inert={isCollapsed}
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-line bg-white transition-transform duration-300 ease-out lg:block',
          isCollapsed && '-translate-x-full'
        )}
      >
        {sidebar()}
      </aside>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="w-[280px] gap-0 p-0" showCloseButton={false}>
          <SheetTitle className="sr-only">Menu dashboard</SheetTitle>
          {sidebar(() => setIsMenuOpen(false))}
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col transition-[padding] duration-300 ease-out',
          isCollapsed ? 'lg:pl-0' : 'lg:pl-[260px]'
        )}
      >
        <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:h-20 lg:px-8">
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-ink-muted lg:hidden"
              aria-label="Buka menu"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="hidden text-ink-muted lg:inline-flex"
              aria-label={isCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
              aria-pressed={isCollapsed}
              onClick={toggleCollapsed}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="size-5" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="size-5" strokeWidth={1.75} />
              )}
            </Button>
            <Breadcrumb items={breadcrumb} />
            {headerEnd}
          </div>
        </header>

        <main className="flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">{children}</main>
      </div>

      {overlays}
    </div>
  );
}
