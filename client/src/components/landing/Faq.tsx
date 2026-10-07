import Link from 'next/link';
import { MessageCircleQuestion } from 'lucide-react';

import { FAQS } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { SITE } from '@/constants/site';
import { Highlight, SectionHeading } from './SectionHeading';

export function Faq() {
  return (
    <section
      id={LANDING_SECTIONS.faq}
      className="border-y border-line bg-surface-soft py-24 lg:py-32"
    >
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="flex flex-col gap-8">
          <SectionHeading
            align="left"
            eyebrow="FAQ"
            title={
              <>
                Pertanyaan yang <Highlight>sering diajukan</Highlight>
              </>
            }
            description="Belum menemukan jawabannya? Tim kami siap membantu."
          />
          <Reveal delay={0.1}>
            <div className="flex items-start gap-4 rounded-2xl border border-line bg-white p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                <MessageCircleQuestion className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">Masih ada pertanyaan?</p>
                <Link
                  href={`mailto:${SITE.email}`}
                  className="mt-1 inline-block text-sm text-brand underline-offset-4 hover:underline"
                >
                  {SITE.email}
                </Link>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <Accordion type="single" collapsible defaultValue={FAQS[0].id} className="gap-3">
            {FAQS.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="rounded-2xl border border-line bg-white px-6 transition-colors not-last:border-b data-[state=open]:border-brand-muted data-[state=open]:shadow-[0_12px_32px_-20px_rgb(29_78_216/0.35)]"
              >
                <AccordionTrigger className="py-5 text-[0.9375rem] font-semibold text-ink hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-sm leading-relaxed text-ink-muted">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </Container>
    </section>
  );
}
