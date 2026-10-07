import Link from 'next/link';
import { ArrowRight, MessageCircle } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import type { ICaseStatus } from '@/types';

// Rubrik yang sedang dipakai reviewer, supaya peserta tahu apa yang dinilai selama menunggu.
export function RubricPanel({ status }: { status: ICaseStatus }) {
  const { rubric, passingScore, caseInfo } = status;

  return (
    <section aria-labelledby="rubric-title" className="rounded-card border border-line bg-white">
      <div className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-4">
        <h2 id="rubric-title" className="text-[0.9375rem] md:text-[0.9375rem]">
          Rubrik penilaian
        </h2>
        <span className="font-mono text-xs text-ink-subtle tabular-nums">
          Lulus {passingScore}+
        </span>
      </div>

      <ul className="grid gap-3 px-5 py-4">
        {rubric.map((criterion) => (
          <li key={criterion.name} className="flex items-baseline justify-between gap-4 text-sm">
            <span className="min-w-0 text-ink">{criterion.name}</span>
            <span className="shrink-0 font-mono text-xs text-ink-muted tabular-nums">
              {criterion.weight}%
            </span>
          </li>
        ))}
      </ul>

      <div className="grid gap-2.5 border-t border-line px-5 py-4 text-sm">
        <Link
          href={PATHS.caseWork(caseInfo.slug)}
          className="group flex items-center gap-1.5 font-medium text-brand"
        >
          Baca brief lengkap
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <a
          href={SITE.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 font-medium text-ink-muted transition-colors hover:text-ink"
        >
          <MessageCircle className="size-4" strokeWidth={1.75} />
          Ada kendala? Hubungi via WhatsApp
        </a>
      </div>
    </section>
  );
}
