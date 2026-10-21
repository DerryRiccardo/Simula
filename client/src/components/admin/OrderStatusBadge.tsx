import { cn } from '@/lib/utils';
import type { TOrderStatus } from '@/types';

const STATUS: Record<TOrderStatus, { label: string; className: string }> = {
  paid: { label: 'Berhasil', className: 'bg-ai-soft text-ai' },
  awaiting_payment: { label: 'Menunggu', className: 'bg-brand-soft text-brand' },
  failed: { label: 'Gagal', className: 'bg-surface-soft text-ink-muted' },
  expired: { label: 'Kedaluwarsa', className: 'bg-surface-soft text-ink-muted' },
};

// Tag status order (menu Order dan detail member). Palet sama dengan tag status lain.
export function OrderStatusBadge({ status }: { status: TOrderStatus }) {
  const meta = STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-tag px-2 py-0.5 text-[0.6875rem] leading-5 font-medium whitespace-nowrap',
        meta.className
      )}
    >
      {meta.label}
    </span>
  );
}
