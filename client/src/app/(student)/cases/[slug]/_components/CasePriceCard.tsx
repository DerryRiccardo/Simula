'use client';

import Link from 'next/link';
import { ArrowRight, Check, Info, Loader2, MessageCircle } from 'lucide-react';

import { StatusBadge } from '@/components/student';
import { Button } from '@/components/ui';
import { ENROLLMENT_STATUS } from '@/constants/enrollmentStatus';
import { B2B_PURCHASE_DISCLAIMER } from '@/constants/payment';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { useStartCase } from '@/hooks/useLearning';
import { formatPrice } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICaseDetail } from '@/types';

const AI_BENEFITS = [
  'Brief lengkap dan materi pendukung',
  'Skor dan feedback AI per kriteria',
  'Ringkasan skill gap untuk langkah berikutnya',
  'Sertifikat platform jika lulus',
];

const getB2bBenefits = (detail: ICaseDetail) => [
  `Brief dan materi dari ${detail.partner?.name ?? 'perusahaan mitra'}`,
  `Review personal oleh ${detail.reviewerRole ?? 'praktisi mitra'}`,
  'Kesempatan revisi bila diminta reviewer',
  'Sertifikat resmi berlogo mitra jika lulus',
  'Berkesempatan masuk daftar prioritas interview mitra',
];

function PrimaryAction({ detail }: { detail: ICaseDetail }) {
  const startCase = useStartCase();
  const isAi = detail.tier === 'ai';

  if (detail.myEnrollment) {
    const meta = ENROLLMENT_STATUS[detail.myEnrollment.status];
    return (
      <div className="grid gap-3">
        <div className="flex items-center justify-between gap-3 rounded-control border border-line px-3.5 py-2.5">
          <span className="text-sm text-ink-muted">Status kamu</span>
          <StatusBadge status={detail.myEnrollment.status} />
        </div>
        <Button
          asChild
          size="pill-lg"
          variant={isAi ? 'ai' : 'b2b'}
          className="active:scale-[0.98]"
        >
          <Link href={meta.getHref(detail)}>
            {meta.actionLabel}
            <ArrowRight />
          </Link>
        </Button>
        <Link
          href={PATHS.myCases}
          className="justify-self-center text-sm font-medium text-ink-muted hover:text-ink"
        >
          Lihat di Case Saya
        </Link>
      </div>
    );
  }

  if (isAi) {
    return (
      <Button
        size="pill-lg"
        variant="ai"
        className="active:scale-[0.98]"
        disabled={startCase.isPending}
        onClick={() => startCase.mutate(detail.id)}
      >
        {startCase.isPending && <Loader2 className="animate-spin" />}
        {startCase.isPending ? 'Menyiapkan case' : 'Mulai gratis'}
      </Button>
    );
  }

  return (
    <div className="grid gap-3">
      <Button asChild size="pill-lg" variant="b2b" className="active:scale-[0.98]">
        <Link href={PATHS.caseCheckout(detail.slug)}>Bayar sekarang</Link>
      </Button>
      <a
        href={SITE.whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-ink"
      >
        <MessageCircle className="size-4" strokeWidth={1.75} />
        Tanya dulu via WhatsApp
      </a>
    </div>
  );
}

export function CasePriceCard({ detail }: { detail: ICaseDetail }) {
  const isAi = detail.tier === 'ai';
  const benefits = isAi ? AI_BENEFITS : getB2bBenefits(detail);

  return (
    <div className="rounded-card border border-line bg-white">
      <div className="grid gap-5 p-5">
        <div>
          <p className="text-xs text-ink-subtle">{isAi ? 'AI Case Study' : 'B2B Case Study'}</p>
          <p
            className={cn(
              'mt-1.5 text-[1.875rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
              isAi ? 'text-ai' : 'text-ink'
            )}
          >
            {formatPrice(detail.price)}
          </p>
          <p className="mt-2 text-sm text-ink-muted">
            {isAi ? 'Tanpa pembayaran, langsung mulai.' : 'Sekali bayar untuk satu case.'}
          </p>
        </div>

        <PrimaryAction detail={detail} />
      </div>

      <div className="border-t border-line p-5">
        <p className="text-xs text-ink-subtle">Yang kamu dapat</p>
        <ul className="mt-3 grid gap-2.5">
          {benefits.map((benefit) => (
            <li key={benefit} className="flex gap-2.5 text-sm leading-snug text-ink-muted">
              <Check
                className={cn('mt-px size-4 shrink-0', isAi ? 'text-ai' : 'text-brand')}
                strokeWidth={2}
              />
              {benefit}
            </li>
          ))}
        </ul>
      </div>

      {!isAi && (
        <p className="flex gap-2.5 border-t border-line bg-surface-soft/60 p-5 text-xs leading-relaxed text-ink-muted">
          <Info className="mt-px size-3.5 shrink-0 text-ink-subtle" />
          {B2B_PURCHASE_DISCLAIMER}
        </p>
      )}
    </div>
  );
}
