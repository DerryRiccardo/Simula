import { ClipboardCheck, RotateCcw, type LucideIcon } from 'lucide-react';

import type { ICaseStatus } from '@/types';

interface IOutcome {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Dua kemungkinan keputusan reviewer, dibedakan dengan jelas (CONTEXT.md 4.8).
function buildOutcomes({ caseInfo, passingScore }: ICaseStatus): IOutcome[] {
  const partner = caseInfo.partner?.name ?? 'perusahaan mitra';
  return [
    {
      icon: ClipboardCheck,
      title: 'Dinilai',
      body: `Kamu menerima skor 0 sampai 100, alasan per kriteria, dan feedback keseluruhan. Skor ${passingScore} ke atas berarti lulus, dan sertifikat berlogo ${partner} langsung terbit.`,
    },
    {
      icon: RotateCcw,
      title: 'Dikembalikan untuk revisi',
      body: 'Terjadi bila deliverable belum lengkap atau tautan tidak bisa dibuka. Submission belum dinilai, jadi skormu tidak berkurang, dan kamu mendapat tambahan 3 hari untuk memperbaikinya.',
    },
  ];
}

export function ReviewOutcomes({ status }: { status: ICaseStatus }) {
  const outcomes = buildOutcomes(status);

  return (
    <section aria-labelledby="outcomes-title" className="border-t border-line pt-8">
      <h2 id="outcomes-title" className="text-[0.9375rem] md:text-[0.9375rem]">
        Setelah review selesai
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Kami kirim notifikasi lewat email dan dashboard begitu keputusan reviewer masuk.
      </p>

      <ul className="mt-5 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-line bg-line md:grid-cols-2">
        {outcomes.map((outcome) => (
          <li key={outcome.title} className="bg-white p-5">
            <span className="grid size-8 place-items-center rounded-control bg-surface-soft text-ink-muted">
              <outcome.icon className="size-4" strokeWidth={1.75} />
            </span>
            <p className="mt-4 text-sm font-medium text-ink">{outcome.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-muted">{outcome.body}</p>
          </li>
        ))}
      </ul>

      <p className="mt-4 max-w-[70ch] text-xs leading-relaxed text-ink-subtle">
        Reviewer juga bisa merekomendasikanmu ke daftar prioritas interview mitra. Rekomendasi ini
        keputusan reviewer berdasarkan hasil kerjamu, bukan otomatis dari pembelian case.
      </p>
    </section>
  );
}
