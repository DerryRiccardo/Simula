import Link from 'next/link';
import { Building2, ChevronRight, FilePen, Sparkles, type LucideIcon } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import { cn } from '@/lib/utils';
import type { IAdminOverviewStats } from '@/types';

interface ICatalogRow {
  label: string;
  value: number;
  href: string;
  icon: LucideIcon;
  /** Kotak ikon berwarna tier, sama dengan sub-menu Case di sidebar. */
  tone: 'ai' | 'brand' | 'neutral';
}

const TONE_CLASS: Record<ICatalogRow['tone'], string> = {
  ai: 'bg-ai-soft text-ai',
  brand: 'bg-brand-soft text-brand',
  neutral: 'bg-surface-soft text-ink-muted',
};

// Jumlah case per tier, sebagai pintasan ke daftar case yang sudah difilter.
export function CatalogSummary({ stats }: { stats: IAdminOverviewStats }) {
  const rows: ICatalogRow[] = [
    {
      label: 'AI Case Study terbit',
      value: stats.aiCaseCount,
      href: `${PATHS.adminCases}?tier=ai`,
      icon: Sparkles,
      tone: 'ai',
    },
    {
      label: 'B2B Case Study terbit',
      value: stats.b2bCaseCount,
      href: `${PATHS.adminCases}?tier=b2b`,
      icon: Building2,
      tone: 'brand',
    },
    {
      label: 'Draft',
      value: stats.draftCaseCount,
      href: `${PATHS.adminCases}?status=draft`,
      icon: FilePen,
      tone: 'neutral',
    },
  ];

  return (
    <ul className="grid gap-0.5 p-2">
      {rows.map((row) => {
        const Icon = row.icon;
        return (
          <li key={row.label}>
            <Link
              href={row.href}
              className="group flex items-center gap-3 rounded-control px-3 py-2.5 transition-colors duration-200 outline-none hover:bg-surface-soft focus-visible:bg-surface-soft"
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-md',
                  TONE_CLASS[row.tone]
                )}
                aria-hidden="true"
              >
                <Icon className="size-3.5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-ink-muted group-hover:text-ink">
                {row.label}
              </span>
              <span className="text-sm font-semibold text-ink tabular-nums">{row.value}</span>
              <ChevronRight className="size-3.5 shrink-0 text-ink-subtle" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
