'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { Search, UserRound } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import { SidebarUserCard } from '@/components/layout/SidebarUserCard';
import { DashboardSidebar, type ISidebarGroup, type ISidebarItem } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { STUDENT_NAV, type INavItem } from '@/constants/studentNav';
import { useCurrentUser } from '@/hooks/useAuth';
import { useDashboardSummary } from '@/hooks/useLearning';
import { matchesNavHref } from '@/lib/navigation';

const PROFILE_LINK = [{ href: PATHS.profile, label: 'Profil dan pengaturan', icon: UserRound }];

const toBadge = (count: number | undefined) => (count ? count : undefined);

interface StudentSidebarProps {
  onOpenSearch: () => void;
  searchShortcut: string;
  onNavigate?: () => void;
}

export function StudentSidebar({ onOpenSearch, searchShortcut, onNavigate }: StudentSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: summary } = useDashboardSummary();
  const { user } = useCurrentUser();
  const userSubtitle = `${user?.studentStatus === 'fresh_graduate' ? 'Fresh graduate' : 'Mahasiswa'}${user?.major ? ` · ${user.major}` : ''}`;

  // Angka sama dengan jumlah di halaman Case Saya (tab Semua dan filter status). Hanya yang
  // menunggu tindakan pengguna (perlu revisi) diberi warna biru; sisanya sekadar jumlah.
  const counts = summary?.stats.statusCounts;
  const badges: Record<string, { count?: number; tone: ISidebarItem['badgeTone'] }> = {
    'my-cases': { count: summary?.stats.totalCount, tone: 'muted' },
    'my-cases-revision': { count: counts?.revision_requested, tone: 'attention' },
    'my-cases-review': { count: counts?.in_review, tone: 'muted' },
    'my-cases-passed': { count: counts?.passed, tone: 'muted' },
  };

  const toSidebarItem = (item: INavItem, isChild: boolean): ISidebarItem => ({
    id: item.id,
    label: item.label,
    icon: item.icon,
    href: item.href,
    badge: toBadge(badges[item.id]?.count),
    badgeTone: badges[item.id]?.tone,
    isActive: matchesNavHref(item.href, pathname, searchParams, !isChild),
    children: item.children?.map((child) => toSidebarItem(child, true)),
  });

  const groups: ISidebarGroup[] = [
    {
      id: 'search',
      items: [
        {
          id: 'search',
          label: 'Cari',
          icon: Search,
          shortcut: searchShortcut,
          onSelect: onOpenSearch,
        },
      ],
    },
    ...STUDENT_NAV.map((section) => ({
      id: section.id,
      heading: section.title,
      items: section.items.map((item) => toSidebarItem(item, false)),
    })),
  ];

  return (
    <DashboardSidebar
      ariaLabel="Menu dashboard"
      groups={groups}
      onNavigate={onNavigate}
      header={
        <div className="flex h-16 shrink-0 items-center px-5 lg:h-20">
          <Logo />
        </div>
      }
      footer={<SidebarUserCard subtitle={userSubtitle} links={PROFILE_LINK} />}
    />
  );
}
