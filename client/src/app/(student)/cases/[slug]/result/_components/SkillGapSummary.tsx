import { CircleCheck, Target } from 'lucide-react';

import { getCriterionPoints, MAX_LEVEL } from '@/lib/score';
import { cn } from '@/lib/utils';
import type { ICriterionScore, IReviewResult } from '@/types';

/** Level 4 ke atas dianggap sudah kuat; di bawahnya masih ada celah yang perlu dilatih. */
const STRONG_LEVEL = 4;

const formatPoints = (value: number) => value.toLocaleString('id-ID', { maximumFractionDigits: 1 });

const getLostPoints = (criterion: ICriterionScore) =>
  Math.round((criterion.weight - getCriterionPoints(criterion)) * 10) / 10;

interface GapGroupProps {
  title: string;
  description: string;
  items: ICriterionScore[];
  isGap: boolean;
}

function GapGroup({ title, description, items, isGap }: GapGroupProps) {
  const Icon = isGap ? Target : CircleCheck;
  return (
    <div className="bg-white p-5">
      <p className="flex items-center gap-2 text-sm font-medium text-ink">
        <Icon className={isGap ? 'size-4 text-ink-muted' : 'size-4 text-ai'} strokeWidth={2} />
        {title}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
      <ul className="mt-4 grid gap-2.5">
        {items.map((criterion) => (
          <li key={criterion.name} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 text-ink">{criterion.name}</span>
            <span className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
              {isGap
                ? `-${formatPoints(getLostPoints(criterion))} poin`
                : `Level ${criterion.level}/${MAX_LEVEL}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ringkasan skill gap khusus AI case (CONTEXT.md 4.5): dari skor per kriteria, mana yang perlu
// dilatih lebih dulu (paling banyak kehilangan poin) dan mana yang sudah kuat.
export function SkillGapSummary({ review }: { review: IReviewResult }) {
  const byLostPoints = [...review.criteria].sort((a, b) => getLostPoints(b) - getLostPoints(a));
  const gaps = byLostPoints.filter((criterion) => criterion.level < STRONG_LEVEL);
  const strengths = byLostPoints.filter((criterion) => criterion.level >= STRONG_LEVEL).reverse();
  // Semua sudah kuat: tetap tunjukkan satu kriteria yang paling bisa ditingkatkan.
  const focus = gaps.length > 0 ? gaps : byLostPoints.slice(0, 1);
  const rest = gaps.length > 0 ? strengths : strengths.filter((item) => !focus.includes(item));
  const lostTotal = Math.max(0, 100 - review.totalScore);

  return (
    <section aria-labelledby="gap-title" className="border-t border-line pt-8">
      <h2 id="gap-title" className="text-[0.9375rem] md:text-[0.9375rem]">
        Ringkasan skill gap
      </h2>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-muted">
        {lostTotal > 0 ? (
          <>
            Kamu kehilangan <span className="font-mono text-ink tabular-nums">{lostTotal}</span>{' '}
            poin. Kriteria diurutkan dari yang paling banyak mengurangi skor, jadi latih bagian atas
            lebih dulu.
          </>
        ) : (
          'Skor penuh di semua kriteria.'
        )}
      </p>

      <div
        className={cn(
          'mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line',
          rest.length > 0 && 'md:grid-cols-2'
        )}
      >
        <GapGroup
          title={gaps.length > 0 ? 'Perlu dilatih' : 'Paling bisa ditingkatkan'}
          description={
            gaps.length > 0
              ? `Level di bawah ${STRONG_LEVEL}. Baca alasan penilai di bawah untuk tahu bagian yang kurang.`
              : 'Semua kriteria sudah kuat. Ini yang masih menyisakan poin terbanyak.'
          }
          items={focus}
          isGap
        />
        {rest.length > 0 && (
          <GapGroup
            title="Sudah kuat"
            description={`Level ${STRONG_LEVEL} ke atas. Pertahankan cara kerja ini di case berikutnya.`}
            items={rest}
            isGap={false}
          />
        )}
      </div>
    </section>
  );
}
