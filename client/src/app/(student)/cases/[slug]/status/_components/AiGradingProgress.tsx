'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { CircleCheck, LoaderCircle } from 'lucide-react';

import { formatTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAiGradingProgress, ICaseStatus } from '@/types';

type TStepState = 'done' | 'active' | 'pending';

/** Lama penilaian berjalan; berhenti di 0 bila jam perangkat mundur. */
function formatElapsed(fromIso: string, now: number) {
  const seconds = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return minutes > 0 ? `${minutes} mnt ${seconds % 60} dtk` : `${seconds} detik`;
}

/** Waktu sekarang yang diperbarui tiap detik, untuk penghitung waktu berjalan. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function Fact({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="min-w-0 bg-white p-3 sm:p-4">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="mt-1 font-mono text-[0.8125rem] font-medium text-ink tabular-nums sm:text-sm">
        {value}
      </dd>
      {hint && <dd className="mt-0.5 text-xs text-ink-muted">{hint}</dd>}
    </div>
  );
}

function StepIcon({ state }: { state: TStepState }) {
  if (state === 'done') return <CircleCheck className="size-4 text-ai" strokeWidth={2} />;
  if (state === 'active') {
    return (
      <LoaderCircle
        className="size-4 text-ai motion-safe:animate-spin motion-reduce:opacity-70"
        strokeWidth={2}
      />
    );
  }
  return <span className="mx-[0.1875rem] block size-2.5 rounded-full border border-ink/20" />;
}

interface StepRowProps {
  state: TStepState;
  title: string;
  meta?: string;
  activeNote: string;
}

function StepRow({ state, title, meta, activeNote }: StepRowProps) {
  return (
    <li
      className={cn(
        'grid grid-cols-[1rem_minmax(0,1fr)] gap-x-3 px-5 py-3.5 transition-colors duration-300',
        state === 'active' && 'bg-ai-soft/50'
      )}
    >
      <span className="mt-0.5 grid h-4 place-items-center">
        <StepIcon state={state} />
      </span>
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <p
            className={cn(
              'text-sm',
              state === 'pending' ? 'text-ink-subtle' : 'font-medium text-ink'
            )}
          >
            {title}
          </p>
          {meta && (
            <span className="shrink-0 font-mono text-xs text-ink-subtle tabular-nums">{meta}</span>
          )}
        </div>
        {state === 'active' && (
          <p className="mt-1 text-xs leading-relaxed text-ink-muted">{activeNote}</p>
        )}
      </div>
    </li>
  );
}

const getStepState = (index: number, checked: number): TStepState =>
  index < checked ? 'done' : index === checked ? 'active' : 'pending';

interface AiGradingProgressProps {
  status: ICaseStatus;
  progress: IAiGradingProgress;
}

// Penilaian AI per kriteria rubrik (CONTEXT.md 4.5): bukan spinner kosong, tapi langkah yang
// sedang diperiksa, supaya peserta tahu penilaian mengikuti rubrik yang sama dengan brief.
export function AiGradingProgress({ status, progress }: AiGradingProgressProps) {
  const now = useNow();
  const { rubric } = status;
  const totalSteps = rubric.length + 1;
  const isOverdue = now > new Date(progress.estimatedDoneAt).getTime();

  return (
    <section aria-labelledby="grading-title">
      <h2
        id="grading-title"
        className="text-[1.375rem] leading-tight tracking-[-0.02em] md:text-[1.5rem]"
      >
        AI sedang menilai submission-mu
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
        Penilaian memakai rubrik yang sama dengan di brief, satu kriteria demi satu kriteria.
        Halaman ini pindah otomatis ke hasil begitu selesai.
      </p>

      <dl className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line">
        <Fact
          label="Dikirim"
          value={formatTime(progress.startedAt)}
          hint={status.submission && `Percobaan ${status.submission.attempt}`}
        />
        <Fact
          label="Berjalan"
          value={formatElapsed(progress.startedAt, now)}
          hint={`${Math.min(progress.checkedCriteria + 1, totalSteps)} dari ${totalSteps} tahap`}
        />
        <Fact
          label="Selesai sekitar"
          value={formatTime(progress.estimatedDoneAt)}
          hint={isOverdue ? 'Sedikit lebih lama' : 'Di bawah 1 menit'}
        />
      </dl>

      <div className="relative mt-6 overflow-hidden rounded-card border border-line bg-white">
        <div className="absolute inset-x-0 top-0 h-0.5" aria-hidden="true">
          <div
            className="h-full origin-left bg-ai transition-transform duration-700 ease-out"
            style={{ transform: `scaleX(${(progress.checkedCriteria + 0.5) / totalSteps})` }}
          />
        </div>

        <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
          <h3 className="text-[0.9375rem] md:text-[0.9375rem]">Pemeriksaan rubrik</h3>
          <span
            className="font-mono text-xs text-ink-subtle tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {Math.min(progress.checkedCriteria, rubric.length)} dari {rubric.length} kriteria
          </span>
        </div>

        <ol className="divide-y divide-line">
          {rubric.map((criterion, index) => (
            <StepRow
              key={criterion.name}
              state={getStepState(index, progress.checkedCriteria)}
              title={criterion.name}
              meta={`Bobot ${criterion.weight}%`}
              activeNote={`Memeriksa: ${criterion.description}`}
            />
          ))}
          <StepRow
            state={getStepState(rubric.length, progress.checkedCriteria)}
            title="Menyusun skor dan feedback"
            activeNote="Menghitung skor akhir dari bobot rubrik, lalu menulis kekuatan, yang perlu ditingkatkan, dan ringkasan skill gap."
          />
        </ol>
      </div>
    </section>
  );
}
