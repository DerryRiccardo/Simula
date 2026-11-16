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

const STAGE_ROTATING_NOTES = (rubricNames: string) => [
  'Memeriksa kelengkapan deliverable terhadap brief case...',
  rubricNames
    ? `Mengevaluasi kriteria rubrik: ${rubricNames}.`
    : 'Mengevaluasi setiap kriteria pada rubrik penilaian...',
  'Menyusun poin kekuatan, area perbaikan, dan langkah berikutnya...',
];

interface AiGradingProgressProps {
  status: ICaseStatus;
  progress: IAiGradingProgress;
}

// Tahapan proses penilaian AI (3 tahap ringkas agar responsif untuk penilaian batch 1-request).
export function AiGradingProgress({ status, progress }: AiGradingProgressProps) {
  const now = useNow();
  const { rubric } = status;
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now - new Date(progress.startedAt).getTime()) / 1000)
  );
  const estimatedMinutes = Math.max(
    1,
    Math.round(
      (new Date(progress.estimatedDoneAt).getTime() - new Date(progress.startedAt).getTime()) /
        60000
    )
  );
  const isOverdue = now > new Date(progress.estimatedDoneAt).getTime();

  const activeStage =
    progress.checkedCriteria >= rubric.length && rubric.length > 0
      ? 2
      : elapsedSeconds < 2 && progress.checkedCriteria === 0
        ? 0
        : 1;

  const rotatingNotes = STAGE_ROTATING_NOTES(rubric.map((item) => item.name).join(', '));
  const stage2Note =
    rotatingNotes[Math.floor(Math.max(0, elapsedSeconds - 2) / 3) % rotatingNotes.length];

  const stages = [
    {
      title: 'Membaca berkas & isi submission',
      meta: 'Tahap 1/3',
      activeNote: 'Mengunduh dan mengekstrak isi berkas, tautan, serta catatan yang kamu kirim.',
    },
    {
      title: 'Menilai rubrik & menyusun feedback AI',
      meta: `${rubric.length} kriteria`,
      activeNote: stage2Note,
    },
    {
      title: 'Menghitung skor & menerbitkan hasil',
      meta: 'Tahap 3/3',
      activeNote: 'Mengakumulasi bobot nilai akhir dan menyiapkan ringkasan hasil penilaian.',
    },
  ];

  const progressRatio =
    activeStage === 0
      ? 0.2
      : activeStage === 1
        ? Math.min(0.85, 0.35 + Math.max(0, elapsedSeconds - 2) * 0.04)
        : 0.95;

  return (
    <section aria-labelledby="grading-title">
      <h2
        id="grading-title"
        className="text-[1.375rem] leading-tight tracking-[-0.02em] md:text-[1.5rem]"
      >
        AI sedang menilai submission-mu
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
        Penilaian mengacu pada seluruh kriteria rubrik di brief. Halaman ini akan pindah otomatis ke
        hasil begitu selesai.
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
          hint={`Tahap ${activeStage + 1} dari ${stages.length}`}
        />
        <Fact
          label="Selesai sekitar"
          value={formatTime(progress.estimatedDoneAt)}
          hint={isOverdue ? 'Sedikit lebih lama' : `Sekitar ${estimatedMinutes} menit`}
        />
      </dl>

      <div className="mt-6 overflow-hidden rounded-card border border-line bg-white">
        {/* Bar progres menggantikan garis bawah header, jadi tidak menempel di sudut kartu. */}
        <div className="relative flex items-baseline justify-between gap-3 px-5 py-4">
          <h3 className="text-[0.9375rem] md:text-[0.9375rem]">Proses penilaian</h3>
          <span
            className="font-mono text-xs text-ink-subtle tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            Tahap {activeStage + 1} dari {stages.length}
          </span>
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-line" aria-hidden="true">
            <div
              className="h-full origin-left bg-ai transition-transform duration-700 ease-out"
              style={{ transform: `scaleX(${progressRatio})` }}
            />
          </div>
        </div>

        <ol className="divide-y divide-line">
          {stages.map((stage, index) => (
            <StepRow
              key={stage.title}
              state={index < activeStage ? 'done' : index === activeStage ? 'active' : 'pending'}
              title={stage.title}
              meta={stage.meta}
              activeNote={stage.activeNote}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}
