'use client';

import { usePathname, useSearchParams } from 'next/navigation';

import { Logo } from '@/components/layout/Logo';
import { SidebarUserCard } from '@/components/layout/SidebarUserCard';
import { DashboardSidebar, type ISidebarGroup, type ISidebarItem } from '@/components/ui';
import { ADMIN_EXACT_NAV_IDS, ADMIN_NAV } from '@/constants/adminNav';
import type { INavItem } from '@/constants/studentNav';
import { useAdminCases, useAdminOverview } from '@/hooks/useAdmin';
import { matchesNavHref } from '@/lib/navigation';

const toBadge = (count: number | undefined) => (count ? count : undefined);

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: cases } = useAdminCases();
  const { data: overview } = useAdminOverview();

  // Jumlah case sekadar informasi (abu-abu); draft dan review B2B menunggu tindakan (biru).
  const badges: Record<string, { count?: number; tone: ISidebarItem['badgeTone'] }> = {
    cases: { count: cases?.length, tone: 'muted' },
    'cases-ai': { count: cases?.filter((item) => item.tier === 'ai').length, tone: 'muted' },
    'cases-b2b': { count: cases?.filter((item) => item.tier === 'b2b').length, tone: 'muted' },
    'cases-draft': {
      count: cases?.filter((item) => item.status === 'draft').length,
      tone: 'attention',
    },
    'reviews-b2b': { count: overview?.stats.pendingReviewCount, tone: 'attention' },
  };

  // Menu induk ikut aktif di halaman turunannya (Case tetap aktif di pembuat case).
  const isActive = (item: INavItem, isChild: boolean) =>
    matchesNavHref(
      item.href,
      pathname,
      searchParams,
      !isChild && !ADMIN_EXACT_NAV_IDS.includes(item.id)
    );

  const toSidebarItem = (item: INavItem, isChild: boolean): ISidebarItem => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    iconTone: item.iconTone,
    href: item.href,
    badge: toBadge(badges[item.id]?.count),
    badgeTone: badges[item.id]?.tone,
    isActive: isActive(item, isChild),
    children: item.children?.map((child) => toSidebarItem(child, true)),
  });

  const groups: ISidebarGroup[] = ADMIN_NAV.map((section) => ({
    id: section.id,
    heading: section.title,
    items: section.items.map((item) => toSidebarItem(item, false)),
  }));

  return (
    <DashboardSidebar
      ariaLabel="Menu panel admin"
      groups={groups}
      onNavigate={onNavigate}
      header={
        <div className="flex h-16 shrink-0 items-center gap-3 px-5 lg:h-20">
          <Logo />
          <span className="rounded-tag bg-surface-soft px-2 py-0.5 text-[0.6875rem] font-medium text-ink-muted">
            Admin
          </span>
        </div>
      }
      footer={<SidebarUserCard subtitle="Tim platform" />}
    />
  );
}
