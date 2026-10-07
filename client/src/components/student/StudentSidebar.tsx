'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronsUpDown, Globe, LogOut, Search, UserRound } from 'lucide-react';

import { Logo } from '@/components/layout/Logo';
import {
  DashboardSidebar,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  type ISidebarGroup,
  type ISidebarItem,
} from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { STUDENT_NAV, type INavItem } from '@/constants/studentNav';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { useDashboardSummary } from '@/hooks/useLearning';
import { getInitials } from '@/lib/formatters';

/** Path cocok persis (atau sebagai induk bila isPrefix) dan semua query di href ikut cocok. */
export function matchesNavHref(
  href: string,
  pathname: string,
  searchParams: URLSearchParams,
  isPrefix: boolean
) {
  const [path, query] = href.split('?');
  const isPathMatch = pathname === path || (isPrefix && pathname.startsWith(`${path}/`));
  if (!isPathMatch || !query) return isPathMatch;
  return [...new URLSearchParams(query)].every(([key, value]) => searchParams.get(key) === value);
}

const toBadge = (count: number | undefined) => (count ? count : undefined);

function UserCard() {
  const { user } = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="border-t border-line p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors outline-none hover:bg-surface-soft focus-visible:ring-3 focus-visible:ring-brand/30 data-[state=open]:bg-surface-soft"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand text-[0.8125rem] font-semibold text-white">
              {getInitials(user.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.8125rem] font-semibold text-ink">
                {user.name}
              </span>
              <span className="block truncate text-xs text-ink-subtle">
                {user.studentStatus === 'fresh_graduate' ? 'Fresh graduate' : 'Mahasiswa'}
                {user.major ? ` · ${user.major}` : ''}
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="top"
          align="start"
          className="w-(--radix-dropdown-menu-trigger-width)"
        >
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-subtle">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={PATHS.profile}>
              <UserRound />
              Profil dan pengaturan
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={PATHS.home}>
              <Globe />
              Beranda website
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={logout.isPending}
            onSelect={() => logout.mutate()}
          >
            <LogOut />
            Keluar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface StudentSidebarProps {
  onOpenSearch: () => void;
  searchShortcut: string;
  onNavigate?: () => void;
}

export function StudentSidebar({ onOpenSearch, searchShortcut, onNavigate }: StudentSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: summary } = useDashboardSummary();

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
      footer={<UserCard />}
    />
  );
}
