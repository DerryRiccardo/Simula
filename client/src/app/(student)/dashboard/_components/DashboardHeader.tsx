import Link from 'next/link';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { formatLongDate, getFirstName } from '@/lib/formatters';
import type { IDashboardSummary, TEnrollmentStatus } from '@/types';

const URGENT_STATUSES: TEnrollmentStatus[] = ['revision_requested', 'pending_payment'];

// Satu kalimat ringkas tentang apa yang perlu dilakukan hari ini.
function getSummaryLine(summary: IDashboardSummary) {
  const { actionItems, stats } = summary;
  if (actionItems.length === 0 && stats.inReviewCount === 0) {
    return 'Belum ada case yang berjalan. Mulai dari AI Case Study gratis untuk mengenali skill gap-mu.';
  }
  const urgentCount = actionItems.filter((item) => URGENT_STATUSES.includes(item.status)).length;
  const reviewLine =
    stats.inReviewCount > 0 ? ` ${stats.inReviewCount} lainnya sedang dinilai.` : '';
  if (urgentCount > 0) return `${urgentCount} case butuh perhatianmu segera.${reviewLine}`;
  if (actionItems.length > 0) return `${actionItems.length} case siap kamu lanjutkan.${reviewLine}`;
  return `Semua case sudah kamu kirim.${reviewLine}`;
}

interface DashboardHeaderProps {
  name: string;
  summary?: IDashboardSummary;
}

export function DashboardHeader({ name, summary }: DashboardHeaderProps) {
  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="font-mono text-xs text-ink-subtle">{formatLongDate(new Date())}</p>
        <h1 className="mt-2 text-page-title">Halo, {getFirstName(name)}</h1>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
          {summary ? getSummaryLine(summary) : ' '}
        </p>
      </div>
      <Button asChild size="pill" className="shrink-0 self-start active:scale-[0.98] sm:self-auto">
        <Link href={PATHS.cases}>
          <Search />
          Jelajahi Case
        </Link>
      </Button>
    </header>
  );
}
