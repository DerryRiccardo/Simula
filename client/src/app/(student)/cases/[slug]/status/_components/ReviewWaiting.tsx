import { Reveal } from '@/components/animated';
import { CaseProgressHeader, SubmittedSummary } from '@/components/student';
import type { ICaseStatus, IEnrollment } from '@/types';
import { ReviewDemoPanel } from './ReviewDemoPanel';
import { ReviewOutcomes } from './ReviewOutcomes';
import { ReviewOverview } from './ReviewOverview';
import { ReviewTimeline } from './ReviewTimeline';
import { RubricPanel } from './RubricPanel';

// Kolom progres fleksibel + panel rubrik di kanan, sama dengan proporsi halaman pengerjaan.
export const STATUS_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12';

interface ReviewWaitingProps {
  status: ICaseStatus;
  enrollment: IEnrollment;
}

// "Menunggu review" (CONTEXT.md 4.8): submission terkunci, reviewer mitra menilai dalam SLA.
export function ReviewWaiting({ status, enrollment }: ReviewWaitingProps) {
  const { caseInfo, submission, slots } = status;

  return (
    <>
      <CaseProgressHeader caseInfo={caseInfo} enrollment={enrollment} />

      <div className={STATUS_GRID}>
        <div className="grid min-w-0 content-start gap-10">
          <Reveal offset={12}>
            <ReviewOverview status={status} />
          </Reveal>
          <Reveal offset={12} delay={0.06}>
            <ReviewTimeline status={status} />
          </Reveal>
          <Reveal offset={12} delay={0.12}>
            <ReviewOutcomes status={status} />
          </Reveal>
        </div>

        <aside className="grid content-start gap-4 lg:sticky lg:top-28 lg:self-start">
          <RubricPanel status={status} />
          <SubmittedSummary submission={submission} slots={slots} />
          <ReviewDemoPanel slug={caseInfo.slug} enrollmentId={enrollment.id} />
        </aside>
      </div>
    </>
  );
}
