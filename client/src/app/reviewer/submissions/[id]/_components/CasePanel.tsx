'use client';

import { useState, type ReactNode } from 'react';

import {
  BriefContext,
  BriefMaterials,
  BriefRequirements,
  BriefTasks,
  FilterTabs,
  SubmittedSummary,
} from '@/components/student';
import type { IReviewSubmissionDetail } from '@/types';

type TPanelTab = 'submission' | 'context' | 'tasks' | 'requirements' | 'materials';

interface CasePanelProps {
  detail: IReviewSubmissionDetail;
  /** Catatan di atas isi submission, misalnya permintaan revisi sebelumnya. */
  notice?: ReactNode;
}

// Panel kiri halaman review: jawaban kandidat dan soalnya dalam satu tempat. Brief yang tampil
// sama persis dengan yang dibaca kandidat; rubrik ada di form penilaian di sebelah kanan.
export function CasePanel({ detail, notice }: CasePanelProps) {
  const [tab, setTab] = useState<TPanelTab>('submission');
  const { brief, submission, caseInfo } = detail;

  const tabs: { value: TPanelTab; label: string; count?: number }[] = [
    { value: 'submission', label: 'Submission' },
    { value: 'context', label: 'Konteks' },
    { value: 'tasks', label: 'Tugas', count: brief.tasks.length },
    { value: 'requirements', label: 'Ketentuan', count: brief.slots.length },
    { value: 'materials', label: 'Materi', count: brief.materials.length },
  ];

  return (
    <section aria-label="Submission dan brief case" className="grid gap-4">
      <FilterTabs ariaLabel="Submission dan brief" options={tabs} value={tab} onChange={setTab} />
      <div role="tabpanel">
        {tab === 'submission' ? (
          <SubmittedSummary submission={submission} slots={brief.slots} notice={notice} />
        ) : (
          <div className="rounded-card border border-line bg-white p-5">
            {tab === 'context' && <BriefContext brief={brief} partner={caseInfo.partner} />}
            {tab === 'tasks' && <BriefTasks brief={brief} />}
            {tab === 'requirements' && <BriefRequirements brief={brief} />}
            {tab === 'materials' && <BriefMaterials brief={brief} />}
          </div>
        )}
      </div>
    </section>
  );
}
