import { CircleCheck, CircleDot, RotateCcw } from 'lucide-react';

import { formatPoints, getCriterionPoints, MAX_LEVEL } from '@/lib/score';
import { formatDate } from '@/lib/formatters';
import type { IReviewQueueItem, IReviewResult, IRevisionRequest } from '@/types';

function FeedbackList({ title, points }: { title: string; points: string[] }) {
  if (points.length === 0) return null;
  return (
    <div>
      <p className="text-xs text-ink-subtle">{title}</p>
      <ul className="mt-1.5 grid gap-1.5">
        {points.map((point) => (
          <li key={point} className="text-sm leading-relaxed text-ink-muted">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface DecisionSummaryProps {
  item: Pick<IReviewQueueItem, 'status' | 'score' | 'decidedAt'>;
  review: IReviewResult | null;
  lastRevision: IRevisionRequest | null;
  /** Keterangan di bawah catatan revisi, berbeda untuk reviewer dan admin. */
  revisionFootnote: string;
}

// Keputusan yang sudah dikirim, baca saja (riwayat reviewer dan detail penilaian admin).
export function DecisionSummary({
  item,
  review,
  lastRevision,
  revisionFootnote,
}: DecisionSummaryProps) {
  if (item.status === 'revision_requested') {
    return (
      <section className="rounded-card border border-line bg-white p-5">
        <p className="flex items-center gap-2 text-sm font-medium text-ink">
          <RotateCcw className="size-4 text-ink-subtle" />
          Dikembalikan untuk revisi
          {item.decidedAt && (
            <span className="font-mono text-xs font-normal text-ink-subtle tabular-nums">
              {formatDate(item.decidedAt)}
            </span>
          )}
        </p>
        {lastRevision && (
          <>
            <p className="mt-4 text-xs text-ink-subtle">Alasan</p>
            <p className="mt-0.5 text-sm text-ink">{lastRevision.reason}</p>
            <p className="mt-3 text-xs text-ink-subtle">Catatan untuk kandidat</p>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{lastRevision.note}</p>
          </>
        )}
        <p className="mt-4 border-t border-line pt-4 text-xs text-ink-subtle">{revisionFootnote}</p>
      </section>
    );
  }

  const isPassed = item.status === 'passed';
  const Icon = isPassed ? CircleCheck : CircleDot;

  return (
    <section className="grid gap-6 rounded-card border border-line bg-white p-5">
      <div>
        <p
          className={
            isPassed
              ? 'flex items-center gap-2 text-sm font-medium text-ai'
              : 'flex items-center gap-2 text-sm font-medium text-ink-muted'
          }
        >
          <Icon className="size-4" strokeWidth={2} />
          {isPassed ? 'Lulus' : 'Belum lulus'}
          {review?.isRecommended && (
            <span className="font-normal text-ink-muted">, direkomendasikan interview</span>
          )}
        </p>
        <p className="mt-3 flex items-baseline gap-2">
          <span className="text-[2.75rem] leading-none font-semibold tracking-[-0.04em] text-ink tabular-nums">
            {item.score ?? '-'}
          </span>
          <span className="font-mono text-sm text-ink-subtle">/ 100</span>
        </p>
        {item.decidedAt && (
          <p className="mt-2 font-mono text-xs text-ink-subtle tabular-nums">
            Dinilai {formatDate(item.decidedAt)}
          </p>
        )}
      </div>

      {review ? (
        <>
          <ul className="grid gap-4 border-t border-line pt-5">
            {review.criteria.map((criterion) => (
              <li key={criterion.name}>
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-medium text-ink">{criterion.name}</p>
                  <span className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
                    Level {criterion.level}/{MAX_LEVEL},{' '}
                    {formatPoints(getCriterionPoints(criterion))}/{criterion.weight}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-ink-muted">{criterion.reason}</p>
              </li>
            ))}
          </ul>
          <div className="grid gap-4 border-t border-line pt-5">
            <FeedbackList title="Kekuatan" points={review.feedback.strengths} />
            <FeedbackList title="Yang perlu ditingkatkan" points={review.feedback.improvements} />
            <FeedbackList title="Saran langkah berikutnya" points={review.feedback.nextSteps} />
          </div>
        </>
      ) : (
        <p className="border-t border-line pt-5 text-sm text-ink-muted">
          Rincian penilaian contoh ini tidak tersimpan di prototype.
        </p>
      )}
    </section>
  );
}
