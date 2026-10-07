import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import { cn } from '@/lib/utils';
import type { IDashboardSummary } from '@/types';

interface IStatItem {
  label: string;
  value: number;
  hint: string;
  href: string;
  /** Disorot bila nilainya > 0, karena butuh tindakan. */
  isAttention?: boolean;
}

const getStatItems = ({ stats }: IDashboardSummary): IStatItem[] => [
  { label: 'Case aktif', value: stats.activeCount, hint: 'Sedang berjalan', href: PATHS.myCases },
  {
    label: 'Perlu revisi',
    value: stats.revisionCount,
    hint: 'Dikembalikan reviewer',
    href: `${PATHS.myCases}?status=revision_requested`,
    isAttention: true,
  },
  {
    label: 'Sedang dinilai',
    value: stats.inReviewCount,
    hint: 'Oleh AI atau reviewer',
    href: `${PATHS.myCases}?status=in_review`,
  },
  {
    label: 'Sertifikat',
    value: stats.certificateCount,
    hint: 'Sudah terbit',
    href: PATHS.myCertificates,
  },
];

// Satu panel bersekat garis tipis. Angka besar dengan figur tabular, label kalimat biasa.
export function OverviewStats({ summary }: { summary: IDashboardSummary }) {
  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {getStatItems(summary).map((stat) => {
        const isHighlighted = stat.isAttention && stat.value > 0;
        return (
          <li key={stat.label} className="bg-white">
            <Link
              href={stat.href}
              className="group flex h-full flex-col p-5 transition-colors duration-200 outline-none hover:bg-surface-soft/70 focus-visible:bg-surface-soft"
            >
              <span className="flex items-center justify-between gap-2 text-[0.8125rem] text-ink-muted">
                {stat.label}
                <ArrowUpRight className="size-3.5 text-ink-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
              </span>
              <span
                className={cn(
                  'mt-5 text-[2rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
                  isHighlighted ? 'text-brand' : 'text-ink'
                )}
              >
                {stat.value}
              </span>
              <span
                className={cn(
                  'mt-2 text-xs',
                  isHighlighted ? 'font-medium text-brand' : 'text-ink-subtle'
                )}
              >
                {isHighlighted ? 'Butuh tindakanmu' : stat.hint}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
