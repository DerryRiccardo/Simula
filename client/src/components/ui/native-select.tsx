import * as React from 'react';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

// Select bawaan browser dengan token proyek: aksesibel dan nyaman di ponsel tanpa pustaka tambahan.
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <div className="relative">
      <select
        data-slot="native-select"
        className={cn(
          'h-11 w-full appearance-none rounded-control border border-line bg-white pr-9 pl-3.5 text-[0.9375rem] text-ink outline-none hover:border-ink/25 focus:border-brand focus:ring-3 focus:ring-brand/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive',
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-subtle"
        aria-hidden="true"
      />
    </div>
  );
}

export { NativeSelect };
