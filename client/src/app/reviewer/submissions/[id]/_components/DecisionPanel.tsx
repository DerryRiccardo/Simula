'use client';

import { useState } from 'react';

import { FilterTabs } from '@/components/student';
import { useSaveReviewDraft } from '@/hooks/useReviewer';
import { cn } from '@/lib/utils';
import type { IReviewSubmissionDetail, TReviewDecision } from '@/types';
import { GradeForm } from './GradeForm';
import { RevisionForm } from './RevisionForm';

// Dua keputusan reviewer (CONTEXT.md 4.10): "Nilai" atau "Kembalikan untuk revisi".
export function DecisionPanel({ detail }: { detail: IReviewSubmissionDetail }) {
  const { item, canRequestRevision, maxRevisions } = detail;
  // Pilihan terakhir ikut tersimpan di draft, jadi reviewer kembali ke form yang sama.
  const [decision, setDecision] = useState<TReviewDecision>(
    canRequestRevision ? (detail.draft?.decision ?? 'grade') : 'grade'
  );
  const saveDraft = useSaveReviewDraft();

  const handleDecisionChange = (value: TReviewDecision) => {
    setDecision(value);
    saveDraft.mutate({ id: item.id, payload: { decision: value } });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <FilterTabs
          ariaLabel="Keputusan"
          options={[
            { value: 'grade', label: 'Nilai' },
            ...(canRequestRevision
              ? [{ value: 'revision' as const, label: 'Kembalikan untuk revisi' }]
              : []),
          ]}
          value={decision}
          onChange={handleDecisionChange}
          className="w-fit"
        />
        {!canRequestRevision && (
          <p className="text-xs text-ink-subtle">
            Batas revisi ({maxRevisions} kali) sudah habis, jadi submission ini dinilai apa adanya.
          </p>
        )}
      </div>
      {/* Keduanya tetap terpasang agar isian tidak hilang saat berpindah pilihan. */}
      <div className={cn(decision !== 'grade' && 'hidden')}>
        <GradeForm detail={detail} />
      </div>
      {canRequestRevision && (
        <div className={cn(decision !== 'revision' && 'hidden')}>
          <RevisionForm detail={detail} />
        </div>
      )}
    </div>
  );
}
