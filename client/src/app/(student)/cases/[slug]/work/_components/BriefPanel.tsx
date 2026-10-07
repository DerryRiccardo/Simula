'use client';

import { useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { toast } from 'sonner';

import { FilterTabs } from '@/components/student';
import type { ICaseBrief, ICaseWorkspace } from '@/types';

type TBriefTab = 'context' | 'tasks' | 'materials' | 'rubric';

function BriefContext({ workspace }: { workspace: ICaseWorkspace }) {
  const { brief, caseInfo } = workspace;
  return (
    <div className="grid max-w-[68ch] gap-4">
      {brief.context.map((paragraph) => (
        <p key={paragraph} className="text-[0.9375rem] leading-[1.75] text-pretty text-ink-muted">
          {paragraph}
        </p>
      ))}
      {caseInfo.partner && (
        <p className="mt-2 border-l-2 border-line pl-4 text-sm text-ink-muted">
          <span className="font-medium text-ink">{caseInfo.partner.name}</span>.{' '}
          {caseInfo.partner.about}
        </p>
      )}
    </div>
  );
}

function BriefTasks({ brief }: { brief: ICaseBrief }) {
  return (
    <ol className="grid gap-6">
      {brief.tasks.map((task, index) => (
        <li key={task.title} className="flex gap-4">
          <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-ink-subtle tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="max-w-[65ch]">
            <p className="text-[0.9375rem] font-medium text-ink">{task.title}</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-muted">
              {task.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function BriefMaterials({ brief }: { brief: ICaseBrief }) {
  // Prototype: berkas materi belum tersedia. Backend nanti mengirim URL unduhan per materi.
  const handleDownload = (name: string) =>
    toast.info('Materi belum tersedia di prototype', { description: name });

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
      {brief.materials.map((material) => (
        <li key={material.id} className="flex items-center gap-4 px-4 py-3.5">
          <FileText className="size-5 shrink-0 text-ink-subtle" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{material.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{material.description}</p>
          </div>
          <span className="hidden shrink-0 font-mono text-xs text-ink-subtle tabular-nums sm:block">
            {material.format}, {material.sizeLabel}
          </span>
          <button
            type="button"
            onClick={() => handleDownload(material.name)}
            aria-label={`Unduh ${material.name}`}
            className="grid size-9 shrink-0 place-items-center rounded-control border border-line text-ink-muted transition-colors outline-none hover:border-ink/25 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.97]"
          >
            <Download className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function BriefRubric({ brief }: { brief: ICaseBrief }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-muted">
        Lulus jika skor akhir minimal{' '}
        <span className="font-mono font-semibold text-ink tabular-nums">{brief.passingScore}</span>{' '}
        dari 100. Setiap kriteria dinilai 1 sampai 5, lalu dikalikan bobotnya.
      </p>
      <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
        {brief.rubric.map((criterion) => (
          <li key={criterion.name} className="flex items-start gap-4 bg-white px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{criterion.name}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                {criterion.description}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm text-ink tabular-nums">
              {criterion.weight}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function BriefPanel({ workspace }: { workspace: ICaseWorkspace }) {
  const [tab, setTab] = useState<TBriefTab>('context');
  const { brief } = workspace;

  const tabs: { value: TBriefTab; label: string; count?: number }[] = [
    { value: 'context', label: 'Konteks' },
    { value: 'tasks', label: 'Tugas', count: brief.tasks.length },
    { value: 'materials', label: 'Materi', count: brief.materials.length },
    { value: 'rubric', label: 'Rubrik' },
  ];

  return (
    <section aria-label="Brief" className="grid gap-6">
      <FilterTabs ariaLabel="Bagian brief" options={tabs} value={tab} onChange={setTab} />
      <div role="tabpanel" className="min-h-48">
        {tab === 'context' && <BriefContext workspace={workspace} />}
        {tab === 'tasks' && <BriefTasks brief={brief} />}
        {tab === 'materials' && <BriefMaterials brief={brief} />}
        {tab === 'rubric' && <BriefRubric brief={brief} />}
      </div>
    </section>
  );
}
