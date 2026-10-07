import { Award, CircleCheck, UserCheck } from 'lucide-react';

import { Float } from '@/components/animated';
import { BrandLogo } from '@/components/layout';
import { AuthShader } from './AuthShader';

const POINTS = [
  'Case study dari kebutuhan industri Indonesia',
  'Skor & feedback per kriteria, bukan sekadar angka',
  'Sertifikat yang bisa diverifikasi recruiter',
];

// Panel brand di sisi kanan halaman auth (mulai lebar tablet). Kartu melayang baru muncul di
// layar lebar yang cukup tinggi agar tidak menabrak teks.
export function AuthShowcase() {
  return (
    <div
      className="relative isolate hidden h-full overflow-hidden rounded-3xl bg-brand-deep p-8 text-white md:flex md:flex-col md:justify-between lg:p-10 xl:p-12"
      aria-hidden="true"
    >
      <AuthShader />

      <div className="relative pt-4 xl:pt-10">
        <BrandLogo isInverted className="h-7" />
        <p className="mt-5 text-[2rem] leading-[1.08] font-semibold tracking-[-0.035em] text-balance lg:text-[2.5rem] xl:text-[3rem]">
          Bangun bukti kemampuan kerja, mulai hari ini.
        </p>
        <ul className="mt-8 grid gap-3.5">
          {POINTS.map((point) => (
            <li key={point} className="flex items-center gap-3 text-[0.9375rem] text-white/85">
              <CircleCheck className="size-5 shrink-0 text-white/70" />
              {point}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative mt-10 hidden h-64 shrink-0 lg:[@media(min-height:42rem)]:block">
        <Float className="absolute top-0 left-0" distance={8} duration={5.5}>
          <div className="w-72 rounded-2xl bg-white p-5 text-ink shadow-2xl shadow-brand-deep/30">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-ai-soft px-2.5 py-1 text-[0.6875rem] font-semibold text-ai">
                AI Case Study
              </span>
              <span className="text-xs text-ink-subtle">Skor</span>
            </div>
            <p className="mt-3 text-sm font-semibold">Dashboard Retensi Pelanggan</p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-3xl font-semibold text-brand">88</p>
              <p className="text-xs font-medium text-ai">Lulus</p>
            </div>
          </div>
        </Float>
        <Float className="absolute top-6 right-0" distance={10} duration={6} delay={0.3}>
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-2xl shadow-brand-deep/30">
            <span className="grid size-9 place-items-center rounded-xl bg-ai-soft text-ai">
              <Award className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold">Sertifikat terbit</p>
              <p className="text-[0.6875rem] text-ink-subtle">Bisa diverifikasi</p>
            </div>
          </div>
        </Float>
        <Float className="absolute bottom-10 left-[42%]" distance={7} duration={5} delay={0.6}>
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 text-ink shadow-2xl shadow-brand-deep/30">
            <span className="grid size-9 place-items-center rounded-xl bg-brand-soft text-brand">
              <UserCheck className="size-4" />
            </span>
            <div>
              <p className="text-xs font-semibold">Direview praktisi</p>
              <p className="text-[0.6875rem] text-ink-subtle">B2B Case Study</p>
            </div>
          </div>
        </Float>
      </div>
    </div>
  );
}
