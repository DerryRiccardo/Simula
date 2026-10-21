import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import { formatCompactPrice, formatNumber, formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminOverviewStats } from '@/types';

interface IStatTile {
  label: string;
  value: string;
  /** Nilai lengkap bila value diringkas, mis. "Rp 888.000" untuk "Rp 888 rb". */
  fullValue?: string;
  hint: string;
  href: string;
  /** Angka dan keterangan berwarna biru: ada yang perlu ditindaklanjuti admin. */
  isAttention: boolean;
}

function getTiles(stats: IAdminOverviewStats): IStatTile[] {
  const passRate =
    stats.aiGradedCount > 0 ? Math.round((stats.aiPassedCount / stats.aiGradedCount) * 100) : null;
  return [
    {
      label: 'Menunggu review B2B',
      value: formatNumber(stats.pendingReviewCount),
      hint:
        stats.overdueReviewCount > 0
          ? `${stats.overdueReviewCount} melewati SLA`
          : stats.pendingReviewCount > 0
            ? 'Semua masih dalam SLA'
            : 'Antrean kosong',
      href: `${PATHS.adminReviews}?tier=b2b`,
      isAttention: stats.overdueReviewCount > 0,
    },
    {
      label: 'Dinilai AI',
      value: formatNumber(stats.aiGradedCount),
      hint: passRate === null ? 'Belum ada percobaan' : `${passRate}% lulus`,
      href: `${PATHS.adminReviews}?tier=ai`,
      isAttention: false,
    },
    {
      label: 'Pendapatan 30 hari',
      value: formatCompactPrice(stats.revenueLast30Days),
      fullValue: formatPrice(stats.revenueLast30Days),
      hint: `${formatNumber(stats.paidOrderCountLast30Days)} order berhasil`,
      href: PATHS.adminOrders,
      isAttention: false,
    },
    {
      label: 'Member',
      value: formatNumber(stats.memberCount),
      hint: `${formatNumber(stats.activeMemberCount)} sedang mengerjakan case`,
      href: PATHS.adminMembers,
      isAttention: false,
    },
  ];
}

// Satu panel bersekat garis tipis, sama dengan ringkasan dashboard mahasiswa.
export function OverviewStats({ stats }: { stats: IAdminOverviewStats }) {
  return (
    // Empat kolom saat kolom utama lebar; 2×2 di ponsel dan saat rel kanan tampil (xl).
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-4 xl:grid-cols-2">
      {getTiles(stats).map((tile) => (
        <li key={tile.label} className="min-w-0 bg-white">
          <Link
            href={tile.href}
            className="group flex h-full flex-col p-4 transition-colors duration-200 outline-none hover:bg-surface-soft/70 focus-visible:bg-surface-soft xl:p-5"
          >
            <span className="flex items-center justify-between gap-2 text-[0.8125rem] text-ink-muted">
              {tile.label}
              <ArrowUpRight className="size-3.5 shrink-0 text-ink-subtle opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-focus-visible:opacity-100" />
            </span>
            <span
              title={tile.fullValue}
              className={cn(
                'mt-5 truncate text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
                tile.isAttention ? 'text-brand' : 'text-ink'
              )}
            >
              <span aria-hidden={tile.fullValue ? true : undefined}>{tile.value}</span>
              {tile.fullValue && <span className="sr-only">{tile.fullValue}</span>}
            </span>
            <span
              className={cn(
                'mt-2 text-xs',
                tile.isAttention ? 'font-medium text-brand' : 'text-ink-subtle'
              )}
            >
              {tile.hint}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
