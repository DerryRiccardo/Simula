import type { IReviewFeedback, IReviewResult } from '@/types';

const GROUPS: { key: keyof IReviewFeedback; label: string }[] = [
  { key: 'strengths', label: 'Kekuatan' },
  { key: 'improvements', label: 'Yang perlu ditingkatkan' },
  { key: 'nextSteps', label: 'Langkah berikutnya' },
];

// Feedback keseluruhan tiga bagian (CONTEXT.md 4.8), label di kiri dan isi di kanan.
export function FeedbackSection({ review }: { review: IReviewResult }) {
  return (
    <section aria-labelledby="feedback-title" className="border-t border-line pt-8">
      <h2 id="feedback-title" className="text-[0.9375rem] md:text-[0.9375rem]">
        Feedback keseluruhan
      </h2>
      <p className="mt-1 text-sm text-ink-muted">Dari {review.reviewerRole}.</p>

      <dl className="mt-6 grid gap-6">
        {GROUPS.map((group) => (
          <div key={group.key} className="grid gap-2 md:grid-cols-[13rem_minmax(0,1fr)] md:gap-6">
            <dt className="text-sm font-medium text-ink">{group.label}</dt>
            <dd>
              <ul className="grid gap-2">
                {review.feedback[group.key].map((item) => (
                  <li key={item} className="flex gap-3 text-sm leading-relaxed text-ink-muted">
                    <span
                      className="mt-[0.5625rem] h-px w-2.5 shrink-0 bg-ink/30"
                      aria-hidden="true"
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
