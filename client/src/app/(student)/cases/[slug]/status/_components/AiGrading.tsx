import { Reveal } from '@/components/animated';
import { CaseProgressHeader, SubmittedSummary } from '@/components/student';
import type { IAiGradingProgress, ICaseStatus, IEnrollment } from '@/types';
import { AiGradingOutcomes } from './AiGradingOutcomes';
import { AiGradingProgress } from './AiGradingProgress';
import { ReviewDemoPanel } from './ReviewDemoPanel';
import { STATUS_GRID } from './ReviewWaiting';

interface AiGradingProps {
  status: ICaseStatus;
  enrollment: IEnrollment;
  progress: IAiGradingProgress;
}

// "Sedang dinilai AI" (CONTEXT.md 4.5): progres per kriteria, lalu otomatis ke halaman hasil.
export function AiGrading({ status, enrollment, progress }: AiGradingProps) {
  const { caseInfo, submission, slots } = status;

  return (
    <>
      <CaseProgressHeader caseInfo={caseInfo} enrollment={enrollment} />

      <div className={STATUS_GRID}>
        <div className="grid min-w-0 content-start gap-10">
          <Reveal offset={12}>
            <AiGradingProgress status={status} progress={progress} />
          </Reveal>
          <Reveal offset={12} delay={0.06}>
            <AiGradingOutcomes status={status} />
          </Reveal>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-28 lg:self-start">
          <SubmittedSummary submission={submission} slots={slots} />
          <ReviewDemoPanel slug={caseInfo.slug} enrollmentId={enrollment.id} tier="ai" />
        </aside>
      </div>
    </>
  );
}
