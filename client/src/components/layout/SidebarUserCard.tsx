'use client';

import Link from 'next/link';
import { ChevronsUpDown, Globe, LogOut, type LucideIcon } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { getInitials } from '@/lib/formatters';

export interface ISidebarUserLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface SidebarUserCardProps {
  /** Baris kedua di bawah nama, misalnya "Mahasiswa · Sistem Informasi". */
  subtitle: string;
  /** Tautan tambahan sebelum "Beranda website" dan "Keluar". */
  links?: ISidebarUserLink[];
}

// Kartu akun di kaki sidebar dashboard (mahasiswa dan admin): menu akun dan tombol keluar.
export function SidebarUserCard({ subtitle, links = [] }: SidebarUserCardProps) {
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
              <span className="block truncate text-xs text-ink-subtle">{subtitle}</span>
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
          {links.map((link) => (
            <DropdownMenuItem key={link.href} asChild>
              <Link href={link.href}>
                <link.icon />
                {link.label}
              </Link>
            </DropdownMenuItem>
          ))}
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
