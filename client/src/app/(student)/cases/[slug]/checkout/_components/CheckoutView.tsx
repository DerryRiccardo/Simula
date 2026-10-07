'use client';

import Link from 'next/link';
import { ArrowLeft, CircleCheck, SearchX, Sparkles } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Button } from '@/components/ui';
import { ENROLLMENT_STATUS } from '@/constants/enrollmentStatus';
import { PATHS } from '@/constants/paths';
import { useCheckout } from '@/hooks/useCheckout';
import type { ICheckoutSummary } from '@/types';
import { CheckoutForm } from './CheckoutForm';
import { PendingPayment } from './PendingPayment';

function CheckoutSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-12"
      role="status"
      aria-label="Memuat"
    >
      <div className="grid content-start gap-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-28 rounded-card" />
      </div>
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

function CheckoutBody({ slug, summary }: { slug: string; summary: ICheckoutSummary }) {
  const { caseInfo, enrollment, order } = summary;

  if (caseInfo.tier === 'ai') {
    return (
      <EmptyState
        icon={Sparkles}
        title="AI Case Study ini gratis"
        description="Tidak perlu checkout. Kamu bisa langsung memulainya dari halaman detail."
        action={
          <Button asChild size="pill">
            <Link href={PATHS.caseDetail(slug)}>Lihat detail case</Link>
          </Button>
        }
      />
    );
  }

  // Sudah lunas: arahkan ke langkah berikutnya sesuai status (biasanya "Mulai mengerjakan").
  if (enrollment && enrollment.status !== 'pending_payment') {
    const meta = ENROLLMENT_STATUS[enrollment.status];
    return (
      <EmptyState
        icon={CircleCheck}
        title="Case ini sudah jadi milikmu"
        description={`Status saat ini: ${meta.label}.`}
        action={
          <Button asChild size="pill">
            <Link href={meta.getHref(enrollment.caseSummary)}>{meta.actionLabel}</Link>
          </Button>
        }
      />
    );
  }

  if (order?.status === 'awaiting_payment' && order.vaNumber) {
    return <PendingPayment slug={slug} summary={summary} order={order} />;
  }

  return <CheckoutForm slug={slug} summary={summary} />;
}

export function CheckoutView({ slug }: { slug: string }) {
  const { data: summary, isLoading, isError, refetch } = useCheckout(slug);

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 pb-10">
      <Link
        href={PATHS.caseDetail(slug)}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Detail case
      </Link>

      <header>
        <h1 className="text-page-title">Checkout</h1>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          Sekali bayar untuk satu B2B Case Study. Brief lengkap terbuka setelah pembayaran
          terkonfirmasi.
        </p>
      </header>

      {isLoading ? (
        <CheckoutSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !summary ? (
        <EmptyState
          icon={SearchX}
          title="Case tidak ditemukan"
          description="Case ini mungkin sudah tidak tersedia, atau tautannya salah."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.cases}>Lihat case lain</Link>
            </Button>
          }
        />
      ) : (
        <CheckoutBody slug={slug} summary={summary} />
      )}
    </div>
  );
}
