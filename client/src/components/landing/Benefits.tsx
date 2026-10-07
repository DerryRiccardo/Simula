import { BENEFITS } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import { SectionHeading } from './SectionHeading';

export function Benefits() {
  return (
    <section id={LANDING_SECTIONS.benefits} className="py-24 lg:py-32">
      <Container>
        <div className="relative overflow-hidden rounded-[2rem] bg-brand px-6 py-16 sm:px-12 lg:px-14 lg:py-20">
          <div className="absolute inset-0 bg-grid-light" aria-hidden="true" />
          <div
            className="absolute -right-32 -bottom-40 size-[28rem] rounded-full bg-white/10 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative">
            <SectionHeading
              isInverted
              eyebrow="Keunggulan"
              title="Kenapa belajar lewat simulasi kerja di sini?"
              description="Kami fokus pada satu hal: membantu kamu punya bukti kemampuan kerja yang bisa dipercaya perusahaan."
            />

            <ul className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map((benefit, index) => {
                const Icon = benefit.icon;
                const isWide = Boolean(benefit.tags);
                return (
                  <Reveal
                    key={benefit.title}
                    as="li"
                    delay={index * 0.06}
                    className={cn(isWide && 'md:col-span-2')}
                  >
                    <div className="group h-full rounded-2xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/[0.12] sm:p-7">
                      <span className="grid size-11 place-items-center rounded-xl bg-white text-brand transition-transform duration-300 group-hover:scale-105">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="mt-5 text-base text-white md:text-lg">{benefit.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/75">
                        {benefit.description}
                      </p>
                      {benefit.tags && (
                        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Contoh bidang">
                          {benefit.tags.map((tag) => (
                            <li
                              key={tag}
                              className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white transition-colors duration-200 hover:bg-white hover:text-brand"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </Reveal>
                );
              })}
            </ul>
          </div>
        </div>
      </Container>
    </section>
  );
}
