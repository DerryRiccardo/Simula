import { Check } from 'lucide-react';

import { formatDate, formatTime } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICaseStatus, IStatusEvent } from '@/types';

type TStepState = 'done' | 'current' | 'upcoming';

interface ITimelineStep {
  key: string;
  title: string;
  detail?: string;
  at?: string;
  state: TStepState;
}

function describeEvent(event: IStatusEvent): Pick<ITimelineStep, 'title' | 'detail'> {
  switch (event.type) {
    case 'paid':
      return { title: 'Pembayaran terkonfirmasi' };
    case 'started':
      return { title: 'Mulai mengerjakan', detail: 'Tenggat pengerjaan mulai dihitung.' };
    case 'submitted':
      return (event.attempt ?? 1) > 1
        ? { title: 'Submission dikirim ulang', detail: `Percobaan ${event.attempt}` }
        : { title: 'Submission dikirim' };
    case 'revision_requested':
      return { title: 'Dikembalikan untuk revisi', detail: 'Belum dinilai, skor tidak berkurang.' };
    case 'reviewed':
      return { title: 'Hasil review keluar' };
    case 'retried':
      return { title: 'Mengerjakan ulang', detail: 'Kesempatan submit ulang setelah belum lulus.' };
  }
}

// Riwayat yang sudah terjadi, lalu langkah aktif (review) dan langkah berikutnya (hasil).
function buildSteps({ events, submission, caseInfo, reviewDueAt }: ICaseStatus): ITimelineStep[] {
  // Data lama tanpa riwayat: minimal tampilkan saat submission dikirim.
  const history: IStatusEvent[] =
    events.length > 0
      ? events
      : submission
        ? [{ type: 'submitted', at: submission.submittedAt, attempt: submission.attempt }]
        : [];

  return [
    ...history.map((event, index) => ({
      key: `${event.type}-${index}`,
      at: event.at,
      state: 'done' as const,
      ...describeEvent(event),
    })),
    {
      key: 'review',
      title: `Direview ${caseInfo.reviewerRole ?? 'reviewer mitra'}`,
      detail: reviewDueAt
        ? `Perkiraan selesai paling lambat ${formatDate(reviewDueAt)}.`
        : undefined,
      state: 'current',
    },
    {
      key: 'result',
      title: 'Hasil keluar',
      detail: 'Skor, feedback per kriteria, dan sertifikat bila lulus.',
      state: 'upcoming',
    },
  ];
}

function StepMarker({ state }: { state: TStepState }) {
  if (state === 'done') {
    return (
      <span className="grid size-5 place-items-center rounded-full bg-brand text-white">
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className="grid size-5 place-items-center rounded-full border-2 border-brand bg-white">
        <span className="size-2 rounded-full bg-brand motion-safe:animate-pulse" />
      </span>
    );
  }
  return <span className="block size-5 rounded-full border border-ink/20 bg-white" />;
}

export function ReviewTimeline({ status }: { status: ICaseStatus }) {
  const steps = buildSteps(status);

  return (
    <section aria-labelledby="timeline-title" className="border-t border-line pt-8">
      <h2 id="timeline-title" className="text-[0.9375rem] md:text-[0.9375rem]">
        Progres
      </h2>

      <ol className="mt-5">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <li
              key={step.key}
              className="relative flex gap-4 pb-6 last:pb-0"
              aria-current={step.state === 'current' ? 'step' : undefined}
            >
              {!isLast && (
                <span
                  className={cn(
                    'absolute top-6 bottom-1 left-[9.5px] w-px',
                    step.state === 'done' ? 'bg-brand/40' : 'bg-line'
                  )}
                  aria-hidden="true"
                />
              )}
              <span className="relative mt-px block shrink-0" aria-hidden="true">
                <StepMarker state={step.state} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-x-6 gap-y-0.5 sm:flex-row sm:items-baseline sm:justify-between">
                <div className="min-w-0">
                  <p
                    className={cn(
                      'text-sm',
                      step.state === 'upcoming' ? 'text-ink-subtle' : 'font-medium text-ink'
                    )}
                  >
                    {step.title}
                    {step.state === 'current' && (
                      <span className="ml-2 text-xs font-medium text-brand">Berlangsung</span>
                    )}
                  </p>
                  {step.detail && <p className="mt-0.5 text-sm text-ink-muted">{step.detail}</p>}
                </div>
                {step.at && (
                  <p className="shrink-0 font-mono text-xs text-ink-subtle tabular-nums">
                    {formatDate(step.at)}, {formatTime(step.at)}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
