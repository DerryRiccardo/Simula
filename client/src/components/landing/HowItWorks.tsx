'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { STEPS } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import type { TTier } from '@/types';
import { Highlight, SectionHeading } from './SectionHeading';
import { TIER_STYLES } from './tierStyles';

const TABS: { value: TTier; label: string }[] = [
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

function StepList({ tier }: { tier: TTier }) {
  const shouldReduceMotion = useReducedMotion();
  const styles = TIER_STYLES[tier];

  return (
    <ol className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <div
        className="absolute top-10 right-[10%] left-[10%] hidden h-px bg-line lg:block"
        aria-hidden="true"
      />
      {STEPS[tier].map((step, index) => {
        const Icon = step.icon;
        return (
          <motion.li
            key={step.title}
            className="group relative flex flex-col rounded-2xl border border-line bg-white p-6 transition-shadow duration-300 hover:shadow-[0_16px_40px_-20px_rgb(17_24_39/0.2)]"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'grid size-11 place-items-center rounded-xl transition-transform duration-300 group-hover:-rotate-6',
                  styles.softBg,
                  styles.text
                )}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-sm font-semibold text-ink-subtle/60">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <h3 className="mt-5 text-base md:text-base">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.description}</p>
          </motion.li>
        );
      })}
    </ol>
  );
}

export function HowItWorks() {
  return (
    <section
      id={LANDING_SECTIONS.howItWorks}
      className="border-y border-line bg-surface-soft py-24 lg:py-32"
    >
      <Container>
        <SectionHeading
          eyebrow="Cara Kerja"
          title={
            <>
              Lima langkah, dari memilih <Highlight>sampai bersertifikat</Highlight>
            </>
          }
          description="Alurnya sama sederhananya untuk kedua produk. Bedanya ada pada siapa yang menilai dan berapa lama kamu mengerjakan."
        />

        <Reveal delay={0.1} className="mt-12">
          <Tabs defaultValue="ai" className="items-center gap-10">
            <TabsList className="h-auto rounded-full border border-line bg-white p-1 group-data-horizontal/tabs:h-auto">
              {TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'rounded-full px-5 py-2.5 text-sm data-active:text-white data-active:shadow-none',
                    tab.value === 'ai' ? 'data-active:bg-ai' : 'data-active:bg-b2b'
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {TABS.map((tab) => (
              <TabsContent key={tab.value} value={tab.value} className="w-full">
                <StepList tier={tab.value} />
              </TabsContent>
            ))}
          </Tabs>
        </Reveal>
      </Container>
    </section>
  );
}
