import Link from 'next/link';
import { ArrowRight, CircleCheck, Info } from 'lucide-react';

import { PRODUCTS, type IProductCard } from '@/app/(marketing)/_data';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { Button } from '@/components/ui';
import { LANDING_SECTIONS } from '@/constants/navigation';
import { cn } from '@/lib/utils';
import { Highlight, SectionHeading } from './SectionHeading';
import { TIER_STYLES } from './tierStyles';

// Kartu B2B ditonjolkan dengan blok biru (sama seperti section Keunggulan), kartu AI tetap putih.
function ProductCard({ product }: { product: IProductCard }) {
  const styles = TIER_STYLES[product.tier];
  const isFeatured = product.tier === 'b2b';
  const Icon = product.icon;

  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 sm:p-8',
        isFeatured
          ? 'bg-brand text-white hover:shadow-[0_28px_56px_-24px_rgb(29_78_216/0.55)]'
          : 'border border-line bg-white hover:shadow-[0_28px_56px_-28px_rgb(17_24_39/0.22)]'
      )}
    >
      {isFeatured && (
        <>
          <div className="absolute inset-0 bg-grid-light" aria-hidden="true" />
          <div
            className="absolute -right-24 -bottom-24 size-72 rounded-full bg-white/10 blur-3xl"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative flex h-full flex-col">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'grid size-9 place-items-center rounded-xl transition-transform duration-300 group-hover:scale-110',
              isFeatured ? 'bg-white text-brand' : cn(styles.softBg, styles.text)
            )}
          >
            <Icon className="size-4" />
          </span>
          <h3 className={cn('text-lg md:text-lg', isFeatured && 'text-white')}>{product.name}</h3>
        </div>

        <p className="mt-6 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight">{product.price}</span>
          <span className={cn('text-sm', isFeatured ? 'text-white/70' : 'text-ink-subtle')}>
            {product.priceSuffix}
          </span>
        </p>
        <p
          className={cn(
            'mt-3 text-sm leading-relaxed',
            isFeatured ? 'text-white/80' : 'text-ink-muted'
          )}
        >
          {product.description}
        </p>

        <Button
          asChild
          variant={isFeatured ? 'inverse' : styles.button}
          size="pill-lg"
          className="group/cta mt-7 w-full"
        >
          <Link href={product.cta.href}>
            {product.cta.label}
            <ArrowRight className="transition-transform group-hover/cta:translate-x-1" />
          </Link>
        </Button>

        <ul className="mt-7 grid flex-1 content-start gap-3.5">
          {product.features.map((feature) => (
            <li
              key={feature}
              className={cn(
                'flex items-start gap-3 text-sm',
                isFeatured ? 'text-white' : 'text-ink'
              )}
            >
              <CircleCheck
                className={cn(
                  'mt-px size-[1.125rem] shrink-0',
                  isFeatured ? 'text-white/70' : styles.text
                )}
              />
              {feature}
            </li>
          ))}
        </ul>

        {product.note && (
          <p
            className={cn(
              'mt-7 flex gap-2 border-t pt-5 text-xs leading-relaxed',
              isFeatured ? 'border-white/15 text-white/70' : 'border-line text-ink-subtle'
            )}
          >
            <Info className="mt-0.5 size-3.5 shrink-0" />
            {product.note}
          </p>
        )}
      </div>
    </div>
  );
}

export function Products() {
  return (
    <section id={LANDING_SECTIONS.products} className="pb-24 lg:pb-32">
      <Container>
        <SectionHeading
          eyebrow="Products"
          title={
            <>
              Pilih jalur yang sesuai <Highlight>tujuanmu</Highlight>
            </>
          }
          description="Kenali skill gap-mu lewat AI Case Study, lalu buktikan kompetensimu lewat B2B Case Study bersama perusahaan mitra."
        />

        <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-2">
          {PRODUCTS.map((product, index) => (
            <Reveal key={product.tier} as="article" delay={index * 0.1}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
