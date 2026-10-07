import Link from 'next/link';
import { ArrowRight, Hourglass, Sparkles, type LucideIcon } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import type { TEnrollmentStatus } from '@/types';

const STATUS_NOTE: Partial<
  Record<TEnrollmentStatus, { icon: LucideIcon; title: string; body: string }>
> = {
  in_review: {
    icon: Hourglass,
    title: 'Menunggu review',
    body: 'Reviewer mitra menilai dalam 5 hari kerja. Kamu akan diberi tahu saat hasilnya keluar.',
  },
  ai_grading: {
    icon: Sparkles,
    title: 'Sedang dinilai AI',
    body: 'Penilaian biasanya selesai dalam kurang dari satu menit.',
  },
};

interface SubmissionStatusNoticeProps {
  slug: string;
  status: TEnrollmentStatus;
}

// Baris atas kartu submission terkirim: isian terkunci sampai ada keputusan penilai.
export function SubmissionStatusNotice({ slug, status }: SubmissionStatusNoticeProps) {
  const note = STATUS_NOTE[status];
  if (!note) return null;

  return (
    <div className="flex gap-3 border-b border-line bg-surface-soft/60 p-5">
      <note.icon className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={1.75} />
      <div>
        <p className="text-sm font-medium text-ink">{note.title}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{note.body}</p>
        <Link
          href={PATHS.caseStatus(slug)}
          className="group mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand"
        >
          Lihat status
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
