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
  /** Portal reviewer dan panel admin memakai bentuk data yang sama untuk bagian ini. */
  detail: Pick<IReviewSubmissionDetail, 'brief' | 'submission' | 'caseInfo'>;
  /** Catatan di atas isi submission, misalnya permintaan revisi sebelumnya. */
  notice?: ReactNode;
}

// Jawaban kandidat dan soalnya dalam satu tempat (halaman review reviewer dan detail penilaian
// admin). Brief yang tampil sama persis dengan yang dibaca kandidat; rubrik ada di panel kanan.
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
