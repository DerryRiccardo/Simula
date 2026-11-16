'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { LifeBuoy, Mail, MessageCircle, Search } from 'lucide-react';

import type { IBreadcrumbItem } from '@/components/layout/Breadcrumb';
import { DashboardShell } from '@/components/layout/DashboardShell';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { STUDENT_NAV } from '@/constants/studentNav';
import { useWhatsappUrl } from '@/hooks/usePlatform';
import { matchesNavHref } from '@/lib/navigation';
import { CommandSearch } from './CommandSearch';
import { StudentOnboardingTour } from './StudentOnboardingTour';
import { StudentSidebar } from './StudentSidebar';

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

const NAV_ORIGIN_KEY = 'simula_student_nav_origin';
const CASE_ORIGIN_PATHS = new Set<string>([PATHS.dashboard, PATHS.cases, PATHS.myCases]);

function findNavEntry(href: string) {
  for (const section of STUDENT_NAV) {
    const item = section.items.find((entry) => entry.href === href);
    if (item) return { section, item };
  }
  return null;
}

/**
 * "Belajar / Jelajahi Case / Detail case / Pengerjaan" (atau "Case Saya" / "Dashboard" sesuai menu
 * asal pengguna). Grup menu hanya judul; menu dan halaman detail case bisa diklik untuk kembali.
 */
function getBreadcrumb(
  pathname: string,
  searchParams: URLSearchParams,
  caseOriginHref: string | null
): IBreadcrumbItem[] {
  if (pathname === PATHS.profile) return [{ label: 'Akun' }, { label: 'Profil' }];
  if (pathname.startsWith('/certificates/')) {
    return [
      { label: 'Belajar' },
      { label: 'Sertifikat Saya', href: PATHS.myCertificates },
      { label: 'Sertifikat' },
    ];
  }

  for (const section of STUDENT_NAV) {
    for (const item of section.items) {
      if (pathname === item.href) {
        // Sub-menu memakai filter di URL (?tier, ?status), mis. "Case Saya / Perlu revisi".
        const child = item.children?.find((entry) =>
          matchesNavHref(entry.href, pathname, searchParams, false)
        );
        return child
          ? [
              { label: section.title },
              { label: item.label, href: item.href },
              { label: child.label },
            ]
          : [{ label: section.title }, { label: item.label }];
      }
      if (pathname.startsWith(`${item.href}/`)) {
        const [, , slug, subpage] = pathname.split('/');
        const origin =
          item.href === PATHS.cases && caseOriginHref ? findNavEntry(caseOriginHref) : null;
        const rootSection = origin?.section ?? section;
        const rootItem = origin?.item ?? item;
        const trail = [
          { label: rootSection.title },
          { label: rootItem.label, href: rootItem.href },
        ];
        const subpageLabel = CASE_SUBPAGE_LABEL[subpage ?? ''];
        // Halaman turunan case (checkout, pengerjaan, dst.) bisa kembali ke detail case-nya.
        return subpageLabel && slug
          ? [
              ...trail,
              { label: 'Detail case', href: PATHS.caseDetail(slug) },
              { label: subpageLabel },
            ]
          : [...trail, { label: 'Detail' }];
      }
    }
  }
  return [];
}

function HelpButton() {
  const whatsappUrl = useWhatsappUrl();
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
          href={whatsappUrl}
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
  const searchParams = useSearchParams();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchShortcut = getSearchShortcut();

  useEffect(() => {
    if (CASE_ORIGIN_PATHS.has(pathname)) {
      window.sessionStorage.setItem(NAV_ORIGIN_KEY, pathname);
    }
  }, [pathname]);

  const caseOriginHref =
    typeof window !== 'undefined' ? window.sessionStorage.getItem(NAV_ORIGIN_KEY) : null;

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

  const openSearch = () => setIsSearchOpen(true);

  return (
    <DashboardShell
      breadcrumb={getBreadcrumb(pathname, searchParams, caseOriginHref)}
      renderSidebar={(onNavigate) => (
        <StudentSidebar
          onOpenSearch={openSearch}
          searchShortcut={searchShortcut}
          caseOriginHref={caseOriginHref}
          onNavigate={onNavigate}
        />
      )}
      headerEnd={
        <>
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
        </>
      }
      overlays={
        <>
          <CommandSearch isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
          <HelpButton />
          <StudentOnboardingTour />
        </>
      }
    >
      {children}
    </DashboardShell>
  );
}
