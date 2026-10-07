import type { ReactNode } from 'react';
import { Building2, FileText, Lock } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { cn } from '@/lib/utils';
import type { ICaseDetail } from '@/types';
import { CaseAssessment } from './CaseAssessment';

// Bagian dokumen: dipisah garis tipis, bukan dibungkus kartu satu per satu.
function DocSection({
  id,
  title,
  description,
  isFirst = false,
  children,
}: {
  id: string;
  /** Bagian pertama tidak diberi garis atas, karena header sudah ditutup garis. */
  isFirst?: boolean;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Reveal offset={10}>
      <section aria-labelledby={id} className={cn(!isFirst && 'border-t border-line pt-8')}>
        <h2 id={id} className="text-base tracking-[-0.01em] md:text-base">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-ink-subtle">{description}</p>}
        <div className="mt-5">{children}</div>
      </section>
    </Reveal>
  );
}

const LOCKED_ITEMS = [
  'Konteks dan brief lengkap',
  'Materi pendukung (dataset, dokumentasi, template)',
  'Rubrik penilaian rinci per kriteria',
  'Form submission per deliverable',
];

export function CaseOverview({ detail }: { detail: ICaseDetail }) {
  const isAi = detail.tier === 'ai';

  return (
    <div className="grid gap-10">
      <DocSection id="about" title="Tentang case ini" isFirst>
        <p className="max-w-[65ch] text-[0.9375rem] leading-[1.7] text-pretty text-ink-muted">
          {detail.about}
        </p>
      </DocSection>

      <DocSection
        id="activities"
        title="Yang akan kamu kerjakan"
        description="Gambaran alur kerja. Instruksi rinci ada di brief lengkap."
      >
        <ol className="grid gap-3.5">
          {detail.activities.map((activity, index) => (
            <li key={activity} className="flex gap-4 text-[0.9375rem]">
              <span className="w-5 shrink-0 pt-px font-mono text-xs leading-6 text-ink-subtle tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="leading-6 text-ink">{activity}</span>
            </li>
          ))}
        </ol>
      </DocSection>

      <DocSection id="deliverables" title="Deliverable">
        <ul className="grid gap-3 sm:grid-cols-2">
          {detail.deliverables.map((deliverable) => (
            <li
              key={deliverable.title}
              className="flex gap-3 rounded-control border border-line p-4"
            >
              <FileText className="mt-0.5 size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
              <div>
                <p className="text-sm font-medium text-ink">{deliverable.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                  {deliverable.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </DocSection>

      <DocSection id="skills" title="Skill yang dilatih">
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <ul className="flex flex-wrap content-start gap-1.5">
            {detail.skills.map((skill) => (
              <li
                key={skill}
                className="rounded-tag border border-line px-2.5 py-1 text-[0.8125rem] text-ink"
              >
                {skill}
              </li>
            ))}
          </ul>
          <div>
            <p className="text-xs text-ink-subtle">Sebaiknya sudah memahami</p>
            <ul className="mt-2 grid gap-1.5 text-sm text-ink-muted">
              {detail.prerequisites.map((item) => (
                <li key={item} className="flex gap-2.5">
                  <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-subtle" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </DocSection>

      <DocSection id="assessment" title="Cara penilaian">
        <CaseAssessment detail={detail} />
      </DocSection>

      {detail.partner && (
        <DocSection id="partner" title="Tentang mitra">
          <div className="flex gap-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-control border border-line text-ink-muted">
              <Building2 className="size-[1.125rem]" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">
                {detail.partner.name}{' '}
                <span className="font-normal text-ink-subtle">({detail.partner.industry})</span>
              </p>
              <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-ink-muted">
                {detail.partner.about}
              </p>
            </div>
          </div>
        </DocSection>
      )}

      <Reveal offset={10}>
        <section
          aria-labelledby="locked"
          className="rounded-card border border-line bg-surface-soft p-6"
        >
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
            <div>
              <h2 id="locked" className="text-sm md:text-sm">
                {isAi ? 'Terbuka setelah kamu mulai' : 'Terbuka setelah pembayaran'}
              </h2>
              <p className="mt-0.5 text-sm text-ink-muted">
                {isAi
                  ? 'Mulai case ini secara gratis untuk membuka semuanya.'
                  : 'Brief dari mitra hanya untuk peserta yang sudah membeli.'}
              </p>
            </div>
          </div>
          <ul className="mt-5 grid gap-2 pl-7 text-sm text-ink-muted sm:grid-cols-2">
            {LOCKED_ITEMS.map((item) => (
              <li key={item} className="flex gap-2.5">
                <span className="mt-2 size-1 shrink-0 rounded-full bg-ink-subtle" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>
    </div>
  );
}
