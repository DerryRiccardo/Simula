import { Award, UserCheck } from 'lucide-react';

import { Float, GrowBar, ScoreRing } from '@/components/animated';

// Contoh tampilan hasil case (ilustrasi produk, bukan data nyata).
const SAMPLE_CRITERIA = [
  { label: 'Pemahaman masalah', value: 90 },
  { label: 'Kualitas solusi', value: 84 },
  { label: 'Eksekusi', value: 80 },
  { label: 'Komunikasi', value: 88 },
];

export function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-hidden="true">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-linear-to-br from-brand-soft via-white to-ai-soft" />

      <Float distance={6} duration={6}>
        <div className="rounded-3xl border border-line bg-white p-6 shadow-[0_24px_60px_-24px_rgb(29_78_216/0.25)]">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-ai-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-ai">
              AI Case Study
            </span>
          </div>
          <p className="mt-4 text-base font-semibold text-ink">
            Optimasi API Endpoint Produk yang Lambat
          </p>
          <p className="mt-1 text-xs text-ink-subtle">Back-End Developer</p>

          <div className="mt-5 flex items-center gap-5 rounded-2xl bg-surface-soft p-4">
            <ScoreRing score={86} />
            <div>
              <p className="text-sm font-semibold text-ink">Lulus</p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                Solusi caching tepat. Perjelas alasan pemilihan index database.
              </p>
            </div>
          </div>

          <ul className="mt-5 grid gap-3.5">
            {SAMPLE_CRITERIA.map((criterion, index) => (
              <li key={criterion.label} className="grid gap-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-ink-muted">{criterion.label}</span>
                  <span className="font-medium text-ink">{criterion.value}</span>
                </div>
                <GrowBar value={criterion.value} delay={0.5 + index * 0.1} />
              </li>
            ))}
          </ul>
        </div>
      </Float>

      <Float
        className="absolute -top-9 -right-2 sm:-right-8"
        distance={10}
        duration={5}
        delay={0.3}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-lg shadow-ink/5">
          <span className="grid size-9 place-items-center rounded-xl bg-ai-soft text-ai">
            <Award className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">Sertifikat terbit</p>
            <p className="text-[0.6875rem] text-ink-subtle">Bisa diverifikasi</p>
          </div>
        </div>
      </Float>

      <Float
        className="absolute -bottom-9 -left-2 sm:-left-10"
        distance={9}
        duration={5.5}
        delay={0.5}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-lg shadow-ink/5">
          <span className="grid size-9 place-items-center rounded-xl bg-b2b-soft text-b2b">
            <UserCheck className="size-4" />
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">Direview praktisi</p>
            <p className="text-[0.6875rem] text-ink-subtle">B2B Case Study</p>
          </div>
        </div>
      </Float>
    </div>
  );
}
