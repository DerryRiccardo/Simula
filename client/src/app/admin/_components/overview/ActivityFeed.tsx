import { Award, CreditCard, Send, Undo2, type LucideIcon, ClipboardCheck } from 'lucide-react';

import { formatRelative } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminActivity, TAdminActivityType } from '@/types';

const ACTIVITY_META: Record<
  TAdminActivityType,
  { icon: LucideIcon; describe: (name: string) => string }
> = {
  submitted: { icon: Send, describe: (name) => `${name} mengirim submission` },
  revision_requested: {
    icon: Undo2,
    describe: (name) => `Submission ${name} dikembalikan untuk revisi`,
  },
  reviewed: { icon: ClipboardCheck, describe: (name) => `${name} menerima hasil penilaian` },
  paid: { icon: CreditCard, describe: (name) => `${name} membayar B2B case` },
  certificate_issued: { icon: Award, describe: (name) => `Sertifikat terbit untuk ${name}` },
};

// Linimasa tipis: ikon netral, warna tier hanya pada penanda kecil di samping judul case.
export function ActivityFeed({ items }: { items: IAdminActivity[] }) {
  if (items.length === 0) {
    return <p className="px-5 py-6 text-sm text-ink-muted">Belum ada aktivitas.</p>;
  }
  return (
    <ol className="grid px-5 py-4">
      {items.map((item, index) => {
        const meta = ACTIVITY_META[item.type];
        const Icon = meta.icon;
        const isLast = index === items.length - 1;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!isLast && (
              <span
                className="absolute top-8 bottom-0 left-[0.8125rem] w-px bg-line"
                aria-hidden="true"
              />
            )}
            <span
              className="relative grid size-7 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-muted"
              aria-hidden="true"
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-[0.8125rem] leading-snug text-ink">
                {meta.describe(item.memberName)}
              </p>
              <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-ink-subtle">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    item.tier === 'ai' ? 'bg-ai' : 'bg-b2b'
                  )}
                  aria-hidden="true"
                />
                <span className="sr-only">
                  {item.tier === 'ai' ? 'AI Case Study' : 'B2B Case Study'}
                </span>
                <span className="truncate">{item.caseTitle}</span>
              </p>
              <time dateTime={item.at} className="mt-0.5 block text-xs text-ink-subtle">
                {formatRelative(item.at)}
              </time>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
