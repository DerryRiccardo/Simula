'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';
import { Send } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { useGradeSubmission, useReviewDraftAutosave } from '@/hooks/useReviewer';
import { getApiFieldErrors } from '@/lib/apiError';
import { calculateTotalScore } from '@/lib/score';
import type { IReviewSubmissionDetail } from '@/types';
import { getGradeDefaults, gradeSchema, toGradePayload, type TGradeFormValues } from '../_schema';
import { CriterionField } from './CriterionField';
import { DraftStatus } from './DraftStatus';
import { FeedbackFields } from './FeedbackFields';
import { RecommendationField } from './RecommendationField';
import { ScoreBar } from './ScoreBar';

// Form "Nilai" (CONTEXT.md 4.10): level 1-5 + alasan per kriteria, feedback 3 bagian,
// dan rekomendasi interview yang tetap menjadi keputusan reviewer.
export function GradeForm({ detail }: { detail: IReviewSubmissionDetail }) {
  const { brief, item, caseInfo, recommendationThreshold } = detail;
  const defaultValues = useMemo(
    () => getGradeDefaults(brief.rubric, detail.draft?.grade ?? null),
    [brief.rubric, detail.draft]
  );
  const form = useForm<TGradeFormValues>({ resolver: zodResolver(gradeSchema), defaultValues });
  const { control, handleSubmit, setError, setValue } = form;
  const grade = useGradeSubmission();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const levels = useWatch({ control, name: 'criteria' }).map((criterion) => criterion.level);
  const scoredCount = levels.filter((level) => level > 0).length;
  const totalScore = calculateTotalScore(
    brief.rubric.map((criterion, index) => ({ weight: criterion.weight, level: levels[index] }))
  );
  const isPassed = scoredCount === levels.length && totalScore >= brief.passingScore;
  const isRecommended = useWatch({ control, name: 'isRecommended' });

  // Rekomendasi hanya untuk kandidat yang lulus; batalkan centang bila skor turun.
  useEffect(() => {
    if (!isPassed && isRecommended) setValue('isRecommended', false);
  }, [isPassed, isRecommended, setValue]);

  // Form panjang: isian tersimpan otomatis sebagai draft, aman bila tab tertutup.
  const autosave = useReviewDraftAutosave({
    id: item.id,
    part: 'grade',
    values: useWatch({ control }),
    initialSavedAt: detail.draft?.grade ? detail.draft.savedAt : null,
    isEnabled: !grade.isPending && !grade.isSuccess,
  });

  const handleConfirm = () =>
    grade.mutate(
      { id: item.id, payload: toGradePayload(form.getValues()) },
      {
        onError: (error) => {
          setIsConfirmOpen(false);
          getApiFieldErrors(error).forEach(({ field, message }) =>
            setError(field as FieldPath<TGradeFormValues>, { message })
          );
        },
      }
    );

  return (
    <form onSubmit={handleSubmit(() => setIsConfirmOpen(true))} noValidate className="grid gap-8">
      <section aria-labelledby="criteria-form-title" className="grid gap-3">
        <div>
          <h2 id="criteria-form-title" className="text-[0.9375rem] md:text-[0.9375rem]">
            Skor per kriteria
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Poin = level ÷ 5 × bobot. Skor total dihitung otomatis.
          </p>
        </div>
        {brief.rubric.map((criterion, index) => (
          <CriterionField
            key={criterion.name}
            index={index}
            criterion={criterion}
            control={control}
          />
        ))}
      </section>

      <FeedbackFields control={control} />

      <RecommendationField
        control={control}
        partnerName={caseInfo.partner?.name}
        isEnabled={isPassed}
        threshold={recommendationThreshold}
      />

      <ScoreBar
        totalScore={totalScore}
        passingScore={brief.passingScore}
        scoredCount={scoredCount}
        criteriaCount={levels.length}
      >
        <DraftStatus isSaving={autosave.isSaving} savedAt={autosave.savedAt} />
        <Button type="submit" size="pill" disabled={grade.isPending}>
          <Send className="size-4" />
          Kirim review
        </Button>
      </ScoreBar>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`Kirim review untuk ${item.candidateLabel}?`}
        description={
          <>
            Skor <strong className="font-semibold text-ink">{totalScore}</strong>,{' '}
            {isPassed ? 'lulus. Sertifikat langsung terbit' : 'belum lulus'}
            {isRecommended && ', dan kandidat direkomendasikan ke daftar prioritas interview'}.
            Keputusan tidak bisa diubah setelah dikirim, dan kandidat langsung melihat skor, alasan,
            serta feedback-mu.
          </>
        }
        confirmLabel="Ya, kirim review"
        onConfirm={handleConfirm}
        isPending={grade.isPending}
      />
    </form>
  );
}
