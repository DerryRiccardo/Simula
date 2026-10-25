'use client';

import { useState } from 'react';

import {
  BriefContext,
  BriefMaterials,
  BriefRubric,
  BriefTasks,
  FilterTabs,
} from '@/components/student';
import type { IUnlockedWorkspace } from '@/types';

type TBriefTab = 'context' | 'tasks' | 'materials' | 'rubric';

export function BriefPanel({ workspace }: { workspace: IUnlockedWorkspace }) {
  const [tab, setTab] = useState<TBriefTab>('context');
  const { brief, caseInfo } = workspace;

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
        {tab === 'context' && <BriefContext brief={brief} partner={caseInfo.partner} />}
        {tab === 'tasks' && <BriefTasks brief={brief} />}
        {tab === 'materials' && <BriefMaterials brief={brief} />}
        {tab === 'rubric' && <BriefRubric brief={brief} />}
      </div>
    </section>
  );
}
