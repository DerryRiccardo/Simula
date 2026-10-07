'use client';

import { FlaskConical, Loader2 } from 'lucide-react';

import { Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui';
import { PAYMENT_METHOD_BY_VALUE } from '@/constants/payment';
import { useSimulatePayment } from '@/hooks/useCheckout';
import { formatPrice } from '@/lib/formatters';
import type { IOrder } from '@/types';

interface GatewayDialogProps {
  slug: string;
  order: IOrder | null;
  onClose: () => void;
}

// Prototype: menggantikan halaman payment gateway untuk QRIS/e-wallet. Tidak ada data
// pembayaran yang dimasukkan; pengguna hanya memilih hasil yang ingin didemokan.
export function GatewayDialog({ slug, order, onClose }: GatewayDialogProps) {
  const simulate = useSimulatePayment(slug);
  if (!order) return null;
  const method = PAYMENT_METHOD_BY_VALUE[order.method];

  const finish = (outcome: 'paid' | 'failed') =>
    simulate.mutate({ orderId: order.id, outcome }, { onSuccess: onClose });

  return (
    <Dialog open onOpenChange={(open) => !open && !simulate.isPending && onClose()}>
      <DialogContent>
        <div className="flex items-center gap-2 text-xs font-medium text-ink-subtle">
          <FlaskConical className="size-3.5" />
          Simulasi payment gateway
        </div>
        <DialogTitle className="mt-3">Bayar dengan {method.label}</DialogTitle>
        <DialogDescription>
          Di versi produksi, langkah ini membuka halaman {method.label} dari payment gateway. Di
          prototype, pilih hasil pembayaran yang ingin didemokan.
        </DialogDescription>

        <dl className="mt-5 grid gap-2 rounded-control border border-line p-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Invoice</dt>
            <dd className="font-mono text-ink">{order.invoiceNumber}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-ink-muted">Total</dt>
            <dd className="font-semibold text-ink tabular-nums">{formatPrice(order.total)}</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button
            variant="outline"
            size="pill"
            disabled={simulate.isPending}
            onClick={() => finish('failed')}
          >
            Gagalkan pembayaran
          </Button>
          <Button
            size="pill"
            disabled={simulate.isPending}
            onClick={() => finish('paid')}
            className="active:scale-[0.98]"
          >
            {simulate.isPending && <Loader2 className="animate-spin" />}
            Bayar berhasil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
