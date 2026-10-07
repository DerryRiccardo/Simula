import { getCriterionPoints, MAX_LEVEL } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { ICriterionScore, IReviewResult } from '@/types';

// Lima kotak kecil = level 1-5 yang dipilih penilai.
function LevelPips({ level }: { level: number }) {
  return (
    <span className="flex gap-1" aria-label={`Level ${level} dari ${MAX_LEVEL}`}>
      {Array.from({ length: MAX_LEVEL }, (_, index) => (
        <span
          key={index}
          className={cn('size-2 rounded-[2px]', index < level ? 'bg-brand' : 'bg-line')}
        />
      ))}
    </span>
  );
}

const formatPoints = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 1 });

function CriterionRow({ criterion, isFocus }: { criterion: ICriterionScore; isFocus: boolean }) {
  return (
    <li className="grid gap-2 border-t border-line py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="text-sm font-medium md:text-sm">{criterion.name}</h3>
          <span className="font-mono text-xs text-ink-subtle tabular-nums">
            Bobot {criterion.weight}%
          </span>
          {isFocus && (
            <span className="rounded-tag bg-white px-2 py-0.5 text-[0.6875rem] font-semibold text-brand ring-1 ring-brand/50 ring-inset">
              Fokus perbaikan
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <LevelPips level={criterion.level} />
          <span className="font-mono text-sm text-ink tabular-nums">
            {formatPoints(getCriterionPoints(criterion))}
            <span className="text-ink-subtle">/{criterion.weight}</span>
          </span>
        </div>
      </div>
      <p className="max-w-[68ch] text-sm leading-relaxed text-ink-muted">{criterion.reason}</p>
    </li>
  );
}

export function CriteriaBreakdown({ review }: { review: IReviewResult }) {
  // Belum lulus: tandai kriteria dengan rasio poin terendah sebagai fokus perbaikan.
  const focusName = review.isPassed
    ? null
    : [...review.criteria].sort((a, b) => a.level - b.level || b.weight - a.weight)[0]?.name;

  return (
    <section aria-labelledby="criteria-title" className="border-t border-line pt-8">
      <h2 id="criteria-title" className="text-[0.9375rem] md:text-[0.9375rem]">
        Skor per kriteria
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Poin = level ÷ 5 × bobot. Setiap skor disertai alasan dari penilai.
      </p>
      <ul className="mt-6">
        {review.criteria.map((criterion) => (
          <CriterionRow
            key={criterion.name}
            criterion={criterion}
            isFocus={criterion.name === focusName}
          />
        ))}
      </ul>
    </section>
  );
}
