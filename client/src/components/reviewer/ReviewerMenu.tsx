'use client';

import Link from 'next/link';
import { ChevronDown, Globe, LogOut, MessageCircle } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import { getInitials } from '@/lib/formatters';

// Menu akun reviewer: satu-satunya bagian interaktif di header portal.
export function ReviewerMenu() {
  const { user } = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-1.5 text-left transition-colors outline-none hover:bg-surface-soft focus-visible:ring-3 focus-visible:ring-brand/30 data-[state=open]:bg-surface-soft"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ink text-xs font-semibold text-white">
            {getInitials(user.name)}
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-[0.8125rem] font-semibold text-ink">
              {user.name}
            </span>
            <span className="block text-xs text-ink-subtle">Reviewer mitra</span>
          </span>
          <ChevronDown className="size-4 text-ink-subtle" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-semibold text-ink">{user.name}</p>
          <p className="truncate text-xs text-ink-subtle">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={SITE.whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle />
            Hubungi tim platform
          </a>
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
  );
}
