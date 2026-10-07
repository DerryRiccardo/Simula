import type { ReactNode } from 'react';
import { Info } from 'lucide-react';

import { TierBadge } from '@/components/student';
import { B2B_PURCHASE_DISCLAIMER } from '@/constants/payment';
import { formatPrice } from '@/lib/formatters';
import type { ICaseDetail } from '@/types';

interface OrderSummaryProps {
  caseInfo: ICaseDetail;
  adminFee: number;
  /** Tombol aksi, diletakkan setelah disclaimer agar terbaca sebelum membayar. */
  children?: ReactNode;
}

const rupiah = (value: number) => (value === 0 ? 'Rp 0' : formatPrice(value));

// Ringkasan pesanan ala invoice: rincian harga dalam angka mono, total paling menonjol.
export function OrderSummary({ caseInfo, adminFee, children }: OrderSummaryProps) {
  const subtotal = caseInfo.price ?? 0;
  const lines = [
    { label: 'Harga case', value: rupiah(subtotal) },
    { label: 'Biaya admin pembayaran', value: rupiah(adminFee) },
  ];

  return (
    <section aria-labelledby="summary-title" className="rounded-card border border-line bg-white">
      <div className="border-b border-line p-5">
        <h2 id="summary-title" className="text-xs font-normal text-ink-subtle md:text-xs">
          Ringkasan pesanan
        </h2>
        <p className="mt-3 text-[0.9375rem] leading-snug font-semibold text-ink">
          {caseInfo.title}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <TierBadge tier={caseInfo.tier} />
          {caseInfo.partner && <span>Brief dari {caseInfo.partner.name}</span>}
        </div>
      </div>

      <dl className="grid gap-2.5 p-5 text-sm">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-ink-muted">{line.label}</dt>
            <dd className="font-mono text-ink tabular-nums">{line.value}</dd>
          </div>
        ))}
        <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-4">
          <dt className="font-medium text-ink">Total</dt>
          <dd className="text-xl font-semibold tracking-[-0.02em] text-ink tabular-nums">
            {rupiah(subtotal + adminFee)}
          </dd>
        </div>
      </dl>

      <p className="flex gap-2.5 border-t border-line bg-surface-soft/60 px-5 py-4 text-xs leading-relaxed text-ink-muted">
        <Info className="mt-px size-3.5 shrink-0 text-ink-subtle" />
        {B2B_PURCHASE_DISCLAIMER}
      </p>

      {children && <div className="grid gap-3 border-t border-line p-5">{children}</div>}
    </section>
  );
}
