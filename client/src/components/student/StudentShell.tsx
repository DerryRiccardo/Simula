'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  LifeBuoy,
  Mail,
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from 'lucide-react';

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { STUDENT_NAV } from '@/constants/studentNav';
import { cn } from '@/lib/utils';
import { CommandSearch } from './CommandSearch';
import { StudentSidebar } from './StudentSidebar';

const COLLAPSE_STORAGE_KEY = 'ws-sidebar-collapsed';

function readIsCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// Shell hanya dirender di client (di balik RequireAuth), jadi aman membaca navigator.
const getSearchShortcut = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K';

// Label halaman turunan case (/cases/[slug]/<segmen>); tanpa segmen berarti halaman detail.
const CASE_SUBPAGE_LABEL: Record<string, string> = {
  checkout: 'Checkout',
  work: 'Pengerjaan',
  status: 'Status penilaian',
  result: 'Hasil',
};

/** "Belajar / Case Saya", ditambah nama halaman turunan (Detail, Checkout, dst.). */
function getBreadcrumb(pathname: string) {
  if (pathname === PATHS.profile) return ['Akun', 'Profil'];
  for (const section of STUDENT_NAV) {
    for (const item of section.items) {
      if (pathname === item.href) return [section.title, item.label];
      if (pathname.startsWith(`${item.href}/`)) {
        const subpage = pathname.split('/')[3];
        return [section.title, item.label, CASE_SUBPAGE_LABEL[subpage ?? ''] ?? 'Detail'];
      }
    }
  }
  return [];
}

function HelpButton() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="fixed right-5 bottom-5 z-40 flex items-center gap-2 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform hover:-translate-y-0.5"
        >
          <LifeBuoy className="size-5" />
          <span className="hidden sm:inline">Bantuan</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" side="top" className="w-72 p-2">
        <p className="px-3 pt-2 pb-1 text-sm font-semibold text-ink">Butuh bantuan?</p>
        <p className="px-3 pb-2 text-xs text-ink-subtle">Tim kami siap membantu di jam kerja.</p>
        <a
          href={`mailto:${SITE.supportEmail}`}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-soft"
        >
          <Mail className="size-4 text-brand" />
          Hubungi IT Support
        </a>
        <a
          href={SITE.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink transition-colors hover:bg-surface-soft"
        >
          <MessageCircle className="size-4 text-brand" />
          Konsultasi via WhatsApp
        </a>
      </PopoverContent>
    </Popover>
  );
}

export function StudentShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(readIsCollapsed);
  const searchShortcut = getSearchShortcut();
  const breadcrumb = getBreadcrumb(pathname);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setIsSearchOpen((isOpen) => !isOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCollapsed = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Abaikan: pilihan tetap berlaku selama tab terbuka.
    }
  };

  const openSearch = () => setIsSearchOpen(true);
  const sidebar = (onNavigate?: () => void) => (
    // useSearchParams di sidebar butuh Suspense agar halaman statis tetap bisa di-prerender.
    <Suspense fallback={null}>
      <StudentSidebar
        onOpenSearch={openSearch}
        searchShortcut={searchShortcut}
        onNavigate={onNavigate}
      />
    </Suspense>
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

            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-1.5 text-sm">
                {breadcrumb.map((crumb, index) => {
                  const isLast = index === breadcrumb.length - 1;
                  return (
                    <li
                      key={crumb}
                      className={cn(
                        'flex min-w-0 items-center gap-1.5',
                        !isLast && 'hidden sm:flex'
                      )}
                    >
                      <span
                        className={cn(
                          'truncate',
                          isLast ? 'font-semibold text-ink' : 'text-ink-subtle'
                        )}
                        aria-current={isLast ? 'page' : undefined}
                      >
                        {crumb}
                      </span>
                      {!isLast && <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" />}
                    </li>
                  );
                })}
              </ol>
            </nav>

            <button
              type="button"
              onClick={openSearch}
              className="hidden h-10 w-72 items-center gap-2.5 rounded-xl border border-line bg-surface-soft px-3 text-sm text-ink-subtle transition-colors outline-none hover:border-brand-muted hover:bg-white focus-visible:ring-3 focus-visible:ring-brand/30 md:flex"
            >
              <Search className="size-4" />
              <span className="flex-1 text-left">Cari case atau halaman</span>
              <kbd className="rounded border border-line bg-white px-1.5 py-0.5 font-sans text-[0.625rem] font-semibold">
                {searchShortcut}
              </kbd>
            </button>
            <Button
              variant="ghost"
              size="icon-lg"
              className="text-ink-muted md:hidden"
              aria-label="Cari case atau halaman"
              onClick={openSearch}
            >
              <Search className="size-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 pb-24 sm:px-6 lg:px-8">{children}</main>
      </div>

      <CommandSearch isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
      <HelpButton />
    </div>
  );
}
