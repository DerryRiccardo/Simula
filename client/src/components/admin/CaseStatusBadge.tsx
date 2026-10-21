import { cn } from '@/lib/utils';
import type { TAdminCaseStatus } from '@/types';

const STATUS: Record<TAdminCaseStatus, { label: string; className: string }> = {
  published: { label: 'Terbit', className: 'bg-ai-soft text-ai' },
  draft: { label: 'Draft', className: 'bg-surface-soft text-ink-muted' },
};

// Tag status case di panel admin; palet sama dengan tag status lain (hijau = selesai/aktif).
export function CaseStatusBadge({ status }: { status: TAdminCaseStatus }) {
  const meta = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag px-2 py-0.5 text-[0.6875rem] leading-5 font-medium',
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}
