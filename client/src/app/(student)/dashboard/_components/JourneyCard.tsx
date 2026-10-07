import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { cn } from '@/lib/utils';
import type { IDashboardSummary } from '@/types';

interface IJourneyStep {
  title: string;
  description: string;
  isDone: boolean;
  cta?: { label: string; href: string };
  extra?: ReactNode;
}

function FieldChips({ fieldKeys }: { fieldKeys: string[] }) {
  return (
    <ul className="mt-2.5 flex flex-wrap gap-1.5">
      {fieldKeys.map((key) => {
        const field = FIELD_BY_KEY[key];
        if (!field) return null;
        return (
          <li key={key}>
            <Link
              href={`${PATHS.cases}?field=${key}`}
              className="block rounded-tag border border-line px-2 py-0.5 text-xs font-medium text-ink-muted transition-colors hover:border-ink/30 hover:text-ink"
            >
              {field.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

interface JourneyCardProps {
  summary: IDashboardSummary;
  fieldKeys: string[];
}

// Jembatan funnel AI → B2B (CONTEXT.md 4.4), ditampilkan sebagai progres tiga tahap.
export function JourneyCard({ summary, fieldKeys }: JourneyCardProps) {
  const steps: IJourneyStep[] = [
    {
      title: 'Pilih bidang',
      description: 'Rekomendasi case menyesuaikan bidang ini.',
      isDone: fieldKeys.length > 0,
      extra: fieldKeys.length > 0 && <FieldChips fieldKeys={fieldKeys} />,
    },
    {
      title: 'Lulus AI Case Study',
      description: 'Gratis, 2-4 jam. Dapatkan skor dan peta skill gap-mu.',
      isDone: summary.hasPassedAiCase,
      cta: { label: 'Pilih AI Case', href: `${PATHS.cases}?tier=ai` },
    },
    {
      title: 'Lulus B2B Case Study',
      description: 'Brief nyata dari perusahaan mitra, direview praktisinya.',
      isDone: summary.hasPassedB2bCase,
      cta: { label: 'Lihat B2B Case', href: `${PATHS.cases}?tier=b2b` },
    },
  ];
  const doneCount = steps.filter((step) => step.isDone).length;
  const currentIndex = steps.findIndex((step) => !step.isDone);

  return (
    <section className="rounded-card border border-line bg-white p-5" aria-labelledby="journey">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="journey" className="text-[0.9375rem] md:text-[0.9375rem]">
          Perjalananmu
        </h2>
        <span className="font-mono text-xs text-ink-subtle tabular-nums">
          {doneCount}/{steps.length}
        </span>
      </div>
      {/* Tiga segmen, satu per tahap, tanpa track abu-abu yang terisi sebagian. */}
      <div className="mt-3 grid grid-cols-3 gap-1" aria-hidden="true">
        {steps.map((step) => (
          <span
            key={step.title}
            className={cn('h-1 rounded-full', step.isDone ? 'bg-brand' : 'bg-line')}
          />
        ))}
      </div>

      <ol className="mt-5 grid">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isLast = index === steps.length - 1;
          return (
            <li key={step.title} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!isLast && (
                <span
                  className="absolute top-6 bottom-0 left-[0.6875rem] w-px bg-line"
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  'relative grid size-6 shrink-0 place-items-center rounded-full font-mono text-[0.6875rem] font-medium tabular-nums',
                  step.isDone && 'bg-ink text-white',
                  isCurrent && 'bg-white text-brand ring-[1.5px] ring-brand',
                  !step.isDone && !isCurrent && 'bg-white text-ink-subtle ring-1 ring-line'
                )}
              >
                {step.isDone ? <Check className="size-3.5" strokeWidth={2.5} /> : index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.isDone || isCurrent ? 'text-ink' : 'text-ink-subtle'
                  )}
                >
                  {step.title}
                  {step.isDone && <span className="sr-only"> (selesai)</span>}
                </p>
                <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-ink-muted">
                  {step.description}
                </p>
                {step.extra}
                {isCurrent && step.cta && (
                  <Link
                    href={step.cta.href}
                    className="group mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-brand"
                  >
                    {step.cta.label}
                    <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {currentIndex === -1 && (
        <p className="mt-5 border-t border-line pt-4 text-[0.8125rem] text-ink-muted">
          Semua tahap selesai. Tambah portofoliomu dengan case lain di bidangmu.
        </p>
      )}
    </section>
  );
}
