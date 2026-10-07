import { STATS } from '@/app/(marketing)/_data';
import { CountUp, Reveal } from '@/components/animated';
import { Container } from '@/components/layout';

export function Stats() {
  return (
    <section aria-label="Platform dalam angka" className="pb-16 lg:pb-20">
      <Container>
        <Reveal>
          <dl className="grid grid-cols-2 gap-y-8 rounded-3xl border border-line bg-white px-6 py-8 shadow-[0_16px_40px_-28px_rgb(17_24_39/0.25)] sm:px-10 md:grid-cols-3 lg:grid-cols-5 lg:divide-x lg:divide-line lg:py-10">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1.5 px-2 lg:px-6 lg:first:pl-0">
                <dt className="order-2 text-xs leading-snug text-ink-subtle sm:text-sm">
                  {stat.label}
                </dt>
                <dd className="order-1 text-3xl font-semibold tracking-tight text-ink lg:text-[2.25rem]">
                  <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </section>
  );
}
