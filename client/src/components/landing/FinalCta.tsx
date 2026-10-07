import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { PATHS } from '@/constants/paths';

export function FinalCta() {
  return (
    <section className="py-24 lg:py-32">
      <Container>
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-muted bg-linear-to-b from-brand-soft to-white px-6 py-16 text-center sm:px-12 lg:py-24">
            <div className="absolute inset-0 bg-grid mask-fade-radial" aria-hidden="true" />
            <div
              className="absolute -top-40 left-1/2 size-[30rem] -translate-x-1/2 rounded-full bg-brand-muted/60 blur-3xl"
              aria-hidden="true"
            />
            <div className="relative mx-auto flex max-w-2xl flex-col items-center gap-6">
              <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
                Mulai Sekarang
              </p>
              <h2>
                Kerjakan case pertamamu <span className="text-brand">hari ini.</span>
              </h2>
              <p className="text-body-lg leading-relaxed text-ink-muted">
                Pilih bidangmu, kerjakan dalam 2–4 jam, dan dapatkan skor serta feedback langsung.
                Gratis, tanpa kartu kredit.
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <Button asChild size="pill-lg" className="group">
                  <Link href={PATHS.register}>
                    Daftar &amp; Pilih Bidang
                    <ArrowRight className="transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="pill-lg" className="bg-white">
                  <Link href={`#${LANDING_SECTIONS.forCompanies}`}>Jadi Perusahaan Mitra</Link>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
