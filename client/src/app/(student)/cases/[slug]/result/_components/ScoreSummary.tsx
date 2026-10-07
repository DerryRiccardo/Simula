import { CircleCheck, CircleDot } from 'lucide-react';

import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICaseResult, IReviewResult } from '@/types';

// Skala 0-100 tanpa trek terisi: garis tipis, penanda ambang lulus, dan penanda skor.
function ScoreScale({ totalScore, passingScore, isPassed }: IReviewResult) {
  return (
    <div className="relative mt-8 h-10" aria-hidden="true">
      <div className="absolute inset-x-0 top-5 h-px bg-line" />
      <div
        className="absolute top-3 flex -translate-x-1/2 flex-col items-center"
        style={{ left: `${passingScore}%` }}
      >
        <span className="h-4 w-px bg-ink/30" />
        <span className="mt-1 font-mono text-[0.6875rem] whitespace-nowrap text-ink-subtle">
          Lulus {passingScore}
        </span>
      </div>
      <span
        className={cn(
          'absolute top-[0.875rem] size-3 -translate-x-1/2 rounded-full ring-4 ring-white',
          isPassed ? 'bg-ai' : 'bg-ink'
        )}
        style={{ left: `${totalScore}%` }}
      />
      <span className="absolute top-7 left-0 font-mono text-[0.6875rem] text-ink-subtle">0</span>
      <span className="absolute top-7 right-0 font-mono text-[0.6875rem] text-ink-subtle">100</span>
    </div>
  );
}

interface ScoreSummaryProps {
  result: ICaseResult;
  review: IReviewResult;
}

export function ScoreSummary({ result, review }: ScoreSummaryProps) {
  const { caseInfo, submission } = result;
  const isB2b = caseInfo.tier === 'b2b';
  const reviewer =
    isB2b && caseInfo.partner
      ? `${review.reviewerRole}, ${caseInfo.partner.name}`
      : review.reviewerRole;

  const verdict = review.isPassed
    ? {
        icon: CircleCheck,
        title: 'Kamu lulus case ini',
        body: isB2b
          ? `Sertifikat berlogo ${caseInfo.partner?.name ?? 'mitra'} sudah terbit di Sertifikat Saya.`
          : 'Sertifikat platform sudah terbit di Sertifikat Saya.',
      }
    : {
        icon: CircleDot,
        title: 'Belum lulus kali ini',
        body: `Skormu ${review.passingScore - review.totalScore} poin di bawah ambang lulus. Feedback per kriteria di bawah menunjukkan bagian yang perlu diperbaiki.`,
      };

  return (
    <section aria-labelledby="score-title">
      <p
        className={cn(
          'flex items-center gap-2 text-sm font-medium',
          review.isPassed ? 'text-ai' : 'text-ink-muted'
        )}
      >
        <verdict.icon className="size-4" strokeWidth={2} />
        <span id="score-title">{verdict.title}</span>
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-4">
        <p className="flex items-baseline gap-2">
          <span className="text-[4rem] leading-none font-semibold tracking-[-0.045em] text-ink tabular-nums md:text-[4.5rem]">
            {review.totalScore}
          </span>
          <span className="font-mono text-sm text-ink-subtle">/ 100</span>
        </p>
        <p className="max-w-[44ch] pb-1.5 text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
          {verdict.body}
        </p>
      </div>

      <ScoreScale {...review} />

      <p className="mt-4 text-xs text-ink-subtle">
        Dinilai oleh <span className="text-ink-muted">{reviewer}</span>,{' '}
        <span className="font-mono tabular-nums">{formatDate(review.reviewedAt)}</span>
        {submission && (
          <>
            , percobaan <span className="font-mono tabular-nums">{submission.attempt}</span>
          </>
        )}
      </p>
    </section>
  );
}
