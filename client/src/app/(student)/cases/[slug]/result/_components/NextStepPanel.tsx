import Link from 'next/link';
import { ArrowRight, Info } from 'lucide-react';

import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { B2B_PURCHASE_DISCLAIMER } from '@/constants/payment';
import type { ICaseDetail, IReviewResult } from '@/types';

interface NextStepPanelProps {
  caseInfo: ICaseDetail;
  review: IReviewResult;
}

// Jembatan funnel (CONTEXT.md 4.4): lulus AI → B2B di bidang yang sama, selain itu case lain.
export function NextStepPanel({ caseInfo, review }: NextStepPanelProps) {
  const field = FIELD_BY_KEY[caseInfo.fieldKey];
  const isAiPassed = caseInfo.tier === 'ai' && review.isPassed;
  const params = new URLSearchParams({ field: caseInfo.fieldKey });
  if (isAiPassed) params.set('tier', 'b2b');

  return (
    <section aria-labelledby="next-title" className="rounded-card border border-line bg-white">
      <div className="p-5">
        <h2 id="next-title" className="text-[0.9375rem] md:text-[0.9375rem]">
          {isAiPassed ? 'Siap divalidasi praktisi?' : 'Lanjutkan latihan'}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          {isAiPassed
            ? `Coba B2B Case Study di bidang ${field?.label ?? 'yang sama'}, direview praktisi perusahaan mitra.`
            : `Case lain di bidang ${field?.label ?? 'yang sama'} untuk mengasah kriteria yang masih lemah.`}
        </p>
        <Link
          href={`${PATHS.cases}?${params.toString()}`}
          className="group mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand"
        >
          {isAiPassed ? 'Lihat B2B Case Study' : 'Jelajahi case'}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {caseInfo.tier === 'b2b' && (
        <p className="flex gap-2.5 border-t border-line bg-surface-soft/60 px-5 py-4 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-px size-3.5 shrink-0 text-ink-subtle" />
          {B2B_PURCHASE_DISCLAIMER}
        </p>
      )}
    </section>
  );
}
