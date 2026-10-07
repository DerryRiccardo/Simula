import * as React from 'react';
import { cn } from '@/lib/utils';

// Textarea dasar dengan token proyek; tinggi bisa ditarik, error ditandai lewat aria-invalid.
function Textarea({ className, rows = 3, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      rows={rows}
      className={cn(
        'w-full resize-y rounded-control border border-line bg-white px-3 py-2.5 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-subtle hover:border-ink/25 focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
