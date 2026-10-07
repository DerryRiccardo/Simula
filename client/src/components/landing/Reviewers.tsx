import { BadgeCheck, BriefcaseBusiness } from 'lucide-react';

import { REVIEWERS } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { FIELD_BY_KEY } from '@/constants/fields';
import { getInitials } from '@/lib/formatters';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { Highlight, SectionHeading } from './SectionHeading';

export function Reviewers() {
  return (
    <section id={LANDING_SECTIONS.reviewers} className="py-24 lg:py-32">
      <Container>
        <SectionHeading
          eyebrow="Reviewer Kami"
          title={
            <>
              Dinilai oleh <Highlight>praktisi industri</Highlight>, bukan sekadar mesin
            </>
          }
          description="B2B Case Study dinilai langsung oleh praktisi dari perusahaan mitra yang setiap hari mengerjakan masalah serupa."
        />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEWERS.map((reviewer, index) => {
            const field = FIELD_BY_KEY[reviewer.fieldKey];
            const FieldIcon = field?.icon;
            return (
              <Reveal key={reviewer.id} as="li" delay={index * 0.08}>
                <article className="group h-full">
                  {/* Placeholder foto: ganti dengan next/image saat foto reviewer tersedia. */}
                  <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-linear-to-br from-brand-soft via-white to-brand-muted/60">
                    <div className="absolute inset-0 bg-grid opacity-50" aria-hidden="true" />
                    <span
                      className="absolute inset-0 grid place-items-center text-6xl font-semibold tracking-tight text-brand/80 transition-transform duration-500 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      {getInitials(reviewer.name)}
                    </span>
                    {FieldIcon && (
                      <span className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-ink-muted backdrop-blur">
                        <FieldIcon className="size-3.5 text-brand" />
                        {field.label}
                      </span>
                    )}
                    <div className="absolute inset-x-3 bottom-3 translate-y-3 rounded-2xl bg-white/95 p-3.5 opacity-0 shadow-lg backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <p className="flex items-center gap-1.5 text-xs text-ink-muted">
                        <BriefcaseBusiness className="size-3.5 text-brand" />
                        {reviewer.experience} di industri
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <BadgeCheck className="size-3.5 text-brand" />
                        Terkalibrasi dengan rubrik
                      </p>
                    </div>
                  </div>
                  <h3 className="mt-4 text-base md:text-base">{reviewer.name}</h3>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {reviewer.role} · <span className="text-ink">{reviewer.company}</span>
                  </p>
                </article>
              </Reveal>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
