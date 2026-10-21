import { getReviewUrgency } from '@/lib/review';
import { cn } from '@/lib/utils';
import type { TAdminReviewTier } from '@/hooks/useAdminReviewFilters';
import type { IAdminReviewItem } from '@/types';

interface IStat {
  label: string;
  value: string;
  /** Biru: ada yang perlu ditindaklanjuti admin. */
  isHighlighted?: boolean;
}

const isGraded = (item: IAdminReviewItem) => item.status === 'passed' || item.status === 'failed';

function getAiStats(items: IAdminReviewItem[]): IStat[] {
  const graded = items.filter(isGraded);
  const scores = graded.flatMap((item) => (item.score === null ? [] : [item.score]));
  const flagged = items.filter((item) => item.isFlagged).length;
  return [
    { label: 'Sudah dinilai', value: String(graded.length) },
    {
      label: 'Persentase lulus',
      value:
        graded.length > 0
          ? `${Math.round((graded.filter((item) => item.status === 'passed').length / graded.length) * 100)}%`
          : '-',
    },
    {
      label: 'Rata-rata skor',
      value:
        scores.length > 0
          ? String(Math.round(scores.reduce((total, score) => total + score, 0) / scores.length))
          : '-',
    },
    { label: 'Ditandai bermasalah', value: String(flagged), isHighlighted: flagged > 0 },
  ];
}

function getB2bStats(items: IAdminReviewItem[]): IStat[] {
  const pending = items.filter((item) => item.status === 'in_review');
  const overdue = pending.filter(
    (item) => item.reviewDueAt && getReviewUrgency(item.reviewDueAt) === 'overdue'
  ).length;
  return [
    { label: 'Menunggu review', value: String(pending.length) },
    { label: 'Melewati SLA', value: String(overdue), isHighlighted: overdue > 0 },
    {
      label: 'Perlu revisi',
      value: String(items.filter((item) => item.status === 'revision_requested').length),
    },
    { label: 'Sudah dinilai', value: String(items.filter(isGraded).length) },
  ];
}

function getAllStats(items: IAdminReviewItem[]): IStat[] {
  const [pending, overdue] = getB2bStats(items.filter((item) => item.tier === 'b2b'));
  const ai = items.filter((item) => item.tier === 'ai');
  const flagged = ai.filter((item) => item.isFlagged).length;
  return [
    { ...pending, label: 'Menunggu review B2B' },
    overdue,
    {
      label: 'Sedang dinilai AI',
      value: String(ai.filter((item) => item.status === 'ai_grading').length),
    },
    { label: 'AI ditandai bermasalah', value: String(flagged), isHighlighted: flagged > 0 },
  ];
}

const GET_STATS: Record<TAdminReviewTier, (items: IAdminReviewItem[]) => IStat[]> = {
  all: getAllStats,
  ai: getAiStats,
  b2b: getB2bStats,
};

// Angka ringkas di atas daftar, mengikuti tier yang dibuka (sama dengan ringkasan daftar case).
export function ReviewStats({
  tier,
  items,
}: {
  tier: TAdminReviewTier;
  items: IAdminReviewItem[];
}) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {GET_STATS[tier](items).map((stat) => (
        <div key={stat.label} className="bg-white px-5 py-4">
          <dt className="text-xs text-ink-subtle">{stat.label}</dt>
          <dd
            className={cn(
              'mt-1 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
              stat.isHighlighted ? 'text-brand' : 'text-ink'
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
