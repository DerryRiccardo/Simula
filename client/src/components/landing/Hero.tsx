import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';

import { HERO_TRUST_POINTS } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { PATHS } from '@/constants/paths';
import { HeroVisual } from './HeroVisual';

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 pb-14 sm:pt-32 lg:pt-40 lg:pb-20">
      <div
        className="absolute inset-0 -z-10 bg-grid mask-fade-radial opacity-70"
        aria-hidden="true"
      />
      <div
        className="absolute -top-40 left-1/2 -z-10 size-[36rem] -translate-x-1/2 rounded-full bg-brand-soft blur-3xl"
        aria-hidden="true"
      />

      <Container className="grid items-center gap-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
        <div className="flex flex-col items-start">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60 motion-reduce:hidden" />
                <span className="relative inline-flex size-2 rounded-full bg-brand" />
              </span>
              Simulasi kerja untuk mahasiswa &amp; fresh graduate
            </span>
          </Reveal>

          <Reveal delay={0.08}>
            <h1 className="mt-6 max-w-xl lg:text-[3.75rem]">
              Pengalaman kerja nyata,{' '}
              <span className="text-brand">sebelum pekerjaan pertamamu.</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="mt-6 max-w-lg text-body-lg leading-relaxed text-ink-muted">
              Kerjakan case study yang dirancang dari kebutuhan industri Indonesia. Mulai gratis
              dengan penilaian AI, lalu buktikan kemampuanmu di hadapan praktisi perusahaan mitra.
            </p>
          </Reveal>

          <Reveal delay={0.24} className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="pill-lg" className="group">
              <Link href={PATHS.register}>
                Coba Case Gratis
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="pill-lg">
              <Link href={`#${LANDING_SECTIONS.products}`}>Lihat Products</Link>
            </Button>
          </Reveal>

          <Reveal delay={0.32}>
            <ul className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              {HERO_TRUST_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-ink-muted">
                  <span className="grid size-5 place-items-center rounded-full bg-brand-soft text-brand">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <div className="px-4 sm:px-10 lg:px-6">
          <HeroVisual />
        </div>
      </Container>
    </section>
  );
}
