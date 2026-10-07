import type { ReactNode } from 'react';

import { Reveal } from '@/components/animated';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  isInverted?: boolean;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  isInverted = false,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={cn(
        'flex max-w-2xl flex-col gap-4',
        align === 'center' ? 'mx-auto items-center text-center' : 'items-start',
        className
      )}
    >
      <p
        className={cn(
          'text-xs font-semibold tracking-[0.2em] uppercase',
          isInverted ? 'text-white/70' : 'text-brand'
        )}
      >
        {eyebrow}
      </p>
      <h2 className={cn(isInverted && 'text-white')}>{title}</h2>
      {description && (
        <p
          className={cn(
            'text-body-lg leading-relaxed',
            isInverted ? 'text-white/75' : 'text-ink-muted'
          )}
        >
          {description}
        </p>
      )}
    </Reveal>
  );
}

// Penekanan kata dalam judul section dengan warna brand.
export function Highlight({ children }: { children: ReactNode }) {
  return <span className="text-brand">{children}</span>;
}
