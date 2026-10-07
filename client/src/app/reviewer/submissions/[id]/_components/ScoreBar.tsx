import type { ReactNode } from 'react';

interface ScoreBarProps {
  totalScore: number;
  passingScore: number;
  scoredCount: number;
  criteriaCount: number;
  /** Penanda draft dan tombol kirim di sisi kanan. */
  children: ReactNode;
}

// Ringkasan skor yang menempel di bawah layar, supaya dampak setiap level langsung terlihat.
export function ScoreBar({
  totalScore,
  passingScore,
  scoredCount,
  criteriaCount,
  children,
}: ScoreBarProps) {
  const isComplete = scoredCount === criteriaCount;
  const isPassed = isComplete && totalScore >= passingScore;

  return (
    <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white/95 px-5 py-4 shadow-lift backdrop-blur-sm">
      <div className="flex items-baseline gap-3" aria-live="polite">
        <p className="flex items-baseline gap-1">
          <span className="text-2xl leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {isComplete ? totalScore : '-'}
          </span>
          <span className="font-mono text-xs text-ink-subtle">/ 100</span>
        </p>
        <p className="text-sm text-ink-muted">
          {isComplete ? (
            <span className={isPassed ? 'font-medium text-ai' : undefined}>
              {isPassed ? 'Lulus' : 'Belum lulus'}
            </span>
          ) : (
            `${scoredCount} dari ${criteriaCount} kriteria dinilai`
          )}
          <span className="text-ink-subtle">, ambang {passingScore}</span>
        </p>
      </div>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  );
}
