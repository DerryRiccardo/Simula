import { Award, RotateCcw, type LucideIcon } from 'lucide-react';

import type { ICaseStatus } from '@/types';

interface IOutcome {
  icon: LucideIcon;
  title: string;
  body: string;
}

// Dua kemungkinan hasil AI case (CONTEXT.md 4.5). Tidak ada revisi: satu submit per percobaan.
export function AiGradingOutcomes({ status }: { status: ICaseStatus }) {
  const outcomes: IOutcome[] = [
    {
      icon: Award,
      title: `Lulus, skor ${status.passingScore} ke atas`,
      body: 'Sertifikat platform langsung terbit di Sertifikat Saya, lengkap dengan tautan verifikasi untuk recruiter.',
    },
    {
      icon: RotateCcw,
      title: 'Belum lulus',
      body: 'Feedback tetap lengkap per kriteria. Kamu boleh mencoba lagi tanpa batas, isian sebelumnya ikut terisi.',
    },
  ];

  return (
    <section aria-labelledby="ai-outcomes-title" className="border-t border-line pt-8">
      <h2 id="ai-outcomes-title" className="text-[0.9375rem] md:text-[0.9375rem]">
        Setelah penilaian selesai
      </h2>
      <p className="mt-1 text-sm text-ink-muted">
        Hasil berisi skor total, skor dan alasan per kriteria, serta ringkasan skill gap.
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
        Boleh tinggalkan halaman ini. Penilaian tetap berjalan, dan hasilnya muncul di Case Saya
        begitu selesai.
      </p>
    </section>
  );
}
