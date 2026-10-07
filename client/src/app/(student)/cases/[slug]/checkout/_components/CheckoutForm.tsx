'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Loader2, Lock, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { PAYMENT_METHOD_BY_VALUE } from '@/constants/payment';
import { SITE } from '@/constants/site';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCreateOrder } from '@/hooks/useCheckout';
import type { ICheckoutSummary, IOrder, TPaymentMethod } from '@/types';
import { GatewayDialog } from './GatewayDialog';
import { OrderSummary } from './OrderSummary';
import { PaymentMethodPicker } from './PaymentMethodPicker';

const PREVIOUS_ORDER_NOTE: Partial<Record<IOrder['status'], string>> = {
  failed: 'Pembayaran sebelumnya gagal. Pilih metode lalu bayar ulang.',
  expired: 'Batas waktu pembayaran sebelumnya sudah habis. Pilih metode lalu bayar ulang.',
};

interface CheckoutFormProps {
  slug: string;
  summary: ICheckoutSummary;
}

export function CheckoutForm({ slug, summary }: CheckoutFormProps) {
  const { caseInfo, order: previousOrder } = summary;
  const { user } = useCurrentUser();
  const createOrder = useCreateOrder();
  const [method, setMethod] = useState<TPaymentMethod>(previousOrder?.method ?? 'va_bca');
  // Order QRIS/e-wallet yang sedang "dibayar" di gateway tiruan.
  const [gatewayOrder, setGatewayOrder] = useState<IOrder | null>(null);

  const isRetry = previousOrder?.status === 'failed' || previousOrder?.status === 'expired';
  const previousNote = previousOrder ? PREVIOUS_ORDER_NOTE[previousOrder.status] : undefined;
  const option = PAYMENT_METHOD_BY_VALUE[method];

  const handlePay = () =>
    createOrder.mutate(
      { caseId: caseInfo.id, method },
      // VA: halaman otomatis berganti ke instruksi transfer setelah data di-refresh.
      { onSuccess: (order) => !order.vaNumber && setGatewayOrder(order) }
    );

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12">
      <div className="grid content-start gap-8">
        {previousNote && (
          <p
            className="flex items-start gap-2.5 rounded-card border border-brand/40 px-4 py-3 text-sm text-ink"
            role="status"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-brand" />
            {previousNote}
          </p>
        )}

        <section aria-labelledby="method-title">
          <h2 id="method-title" className="text-base md:text-base">
            Metode pembayaran
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Virtual account dicek otomatis. QRIS dan GoPay langsung terkonfirmasi.
          </p>
          <div className="mt-5">
            <PaymentMethodPicker value={method} onChange={setMethod} />
          </div>
        </section>

        {user && (
          <section aria-labelledby="buyer-title" className="border-t border-line pt-6">
            <h2 id="buyer-title" className="text-base md:text-base">
              Data pembeli
            </h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-subtle">Nama</dt>
                <dd className="mt-0.5 text-ink">{user.name}</dd>
              </div>
              <div>
                <dt className="text-xs text-ink-subtle">Invoice dikirim ke</dt>
                <dd className="mt-0.5 break-all text-ink">{user.email}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-28 lg:self-start">
        <OrderSummary caseInfo={caseInfo} adminFee={option.adminFee}>
          <Button
            size="pill-lg"
            onClick={handlePay}
            disabled={createOrder.isPending}
            className="active:scale-[0.98]"
          >
            {createOrder.isPending ? <Loader2 className="animate-spin" /> : <Lock />}
            {isRetry ? 'Bayar ulang' : 'Bayar'}
          </Button>
          <div className="flex items-center justify-between gap-3 text-sm">
            <Link
              href={PATHS.caseDetail(slug)}
              className="font-medium text-ink-muted transition-colors hover:text-ink"
            >
              Kembali
            </Link>
            <a
              href={SITE.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <MessageCircle className="size-4" strokeWidth={1.75} />
              Konsultasi via WhatsApp
            </a>
          </div>
        </OrderSummary>
      </aside>

      <GatewayDialog slug={slug} order={gatewayOrder} onClose={() => setGatewayOrder(null)} />
    </div>
  );
}
