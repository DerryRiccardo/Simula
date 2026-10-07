import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { PARTNER_POINTS } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { SITE } from '@/constants/site';
import { Highlight, SectionHeading } from './SectionHeading';

export function ForCompanies() {
  return (
    <section id={LANDING_SECTIONS.forCompanies} className="py-24 lg:py-32">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-20">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Untuk Perusahaan"
            title={
              <>
                Temukan talenta dari <Highlight>hasil kerja nyata</Highlight>
              </>
            }
            description="Jadi mitra B2B Case Study. Berikan masalah bisnis nyata, nilai hasil kerja kandidat, dan lihat kemampuan mereka sebelum wawancara."
          />
          <Reveal delay={0.15} className="mt-8">
            <Button asChild variant="outline" size="pill-lg" className="group">
              <Link href={`mailto:${SITE.email}?subject=Kemitraan%20B2B%20Case%20Study`}>
                Hubungi Tim Kami
                <ArrowUpRight className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </Button>
          </Reveal>
        </div>

        <ol className="grid gap-4">
          {PARTNER_POINTS.map((point, index) => {
            const Icon = point.icon;
            return (
              <Reveal key={point.title} as="li" delay={index * 0.1}>
                <div className="group flex gap-5 rounded-2xl border border-line bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-b2b/30 hover:shadow-[0_16px_40px_-20px_rgb(17_24_39/0.18)]">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-b2b-soft text-b2b transition-transform duration-300 group-hover:scale-105">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink-subtle">Langkah {index + 1}</p>
                    <h3 className="mt-1 text-base md:text-base">{point.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                      {point.description}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </Container>
    </section>
  );
}
