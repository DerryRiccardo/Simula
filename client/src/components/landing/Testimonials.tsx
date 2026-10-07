import { Quote } from 'lucide-react';

import { TESTIMONIALS, type ITestimonial } from '@/app/(marketing)/_data';
import { Container } from '@/components/layout';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { getInitials } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { Highlight, SectionHeading } from './SectionHeading';
import { TIER_STYLES } from './tierStyles';

const TIER_LABEL = { ai: 'AI Case Study', b2b: 'B2B Case Study' } as const;

function TestimonialCard({ testimonial }: { testimonial: ITestimonial }) {
  const styles = TIER_STYLES[testimonial.tier];
  return (
    <figure className="flex h-full w-[19rem] shrink-0 flex-col rounded-2xl border border-line bg-white p-6 transition-shadow duration-300 hover:shadow-[0_20px_44px_-24px_rgb(17_24_39/0.25)] sm:w-[22rem]">
      <div className="flex items-center justify-between">
        <Quote className="size-6 fill-brand-soft text-brand" />
        <span
          className={cn(
            'rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold',
            styles.softBg,
            styles.text
          )}
        >
          {TIER_LABEL[testimonial.tier]}
        </span>
      </div>
      <blockquote className="mt-4 flex-1 text-[0.9375rem] leading-relaxed text-ink">
        “{testimonial.quote}”
      </blockquote>
      <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand"
          aria-hidden="true"
        >
          {getInitials(testimonial.name)}
        </span>
        <span>
          <span className="block text-sm font-semibold text-ink">{testimonial.name}</span>
          <span className="block text-xs text-ink-subtle">{testimonial.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

// Satu baris slide tak berujung. Item diulang agar satu daftar lebih lebar dari layar, lalu
// daftar ditulis dua kali dan digeser -50% supaya perulangannya mulus.
function MarqueeRow({ items, isReverse = false }: { items: ITestimonial[]; isReverse?: boolean }) {
  return (
    <div className="group flex overflow-hidden mask-fade-x">
      <div
        className={cn(
          'flex group-hover:[animation-play-state:paused] motion-reduce:animate-none',
          isReverse ? 'animate-marquee-slow-reverse' : 'animate-marquee-slow'
        )}
      >
        {[false, true].map((isDuplicate) => (
          <ul
            key={String(isDuplicate)}
            className="flex shrink-0 gap-5 pr-5"
            aria-hidden={isDuplicate || undefined}
          >
            {[...items, ...items].map((testimonial, index) => (
              <li key={`${testimonial.id}-${index}`}>
                <TestimonialCard testimonial={testimonial} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function Testimonials() {
  const half = Math.ceil(TESTIMONIALS.length / 2);
  const firstRow = TESTIMONIALS.slice(0, half);
  const secondRow = TESTIMONIALS.slice(half);

  return (
    <section
      id={LANDING_SECTIONS.testimonials}
      className="overflow-hidden border-y border-line bg-surface-soft py-24 lg:py-32"
    >
      <Container>
        <SectionHeading
          eyebrow="Testimoni"
          title={
            <>
              Cerita dari mereka yang <Highlight>sudah mencoba</Highlight>
            </>
          }
          description="Pengalaman mahasiswa dan fresh graduate setelah mengerjakan case study di platform ini."
        />
      </Container>

      <div className="mt-14 grid gap-5">
        <MarqueeRow items={firstRow} />
        <MarqueeRow items={secondRow} isReverse />
      </div>
    </section>
  );
}
