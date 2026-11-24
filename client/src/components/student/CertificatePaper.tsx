'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { QRCodeSVG } from 'qrcode.react';

import { BrandLogo } from '@/components/layout/Logo';
import { resolvePartnerCeo, resolvePartnerLogo } from '@/constants/partners';
import { PATHS } from '@/constants/paths';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICertificate } from '@/types';

type TPaperSize = 'full' | 'compact';

interface CertificatePaperProps {
  certificate: ICertificate;
  /** Logo mitra opsional; bila kosong dicocokkan otomatis dari folder `public/partner/`. */
  partnerLogo?: string | null;
  /** Dipertahankan untuk kompatibilitas pemanggil. */
  partnerIndustry?: string | null;
  /** Dipertahankan untuk kompatibilitas pemanggil. */
  reviewerRole?: string | null;
  /** full = halaman verifikasi, compact = pratinjau di kartu Sertifikat Saya. */
  size?: TPaperSize;
  className?: string;
}

// Ukuran kanvas tunggal (rasio A4 landscape 1.415). Semua varian (compact, full, print PDF)
// merender layout yang sama persis lalu menskalakannya agar identik dan tidak pernah terpotong.
const CANVAS_WIDTH = 794;
const CANVAS_HEIGHT = 561;

function SignatureBlock({
  src,
  alt,
  title,
  subtitle,
}: {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex min-w-[8.5rem] flex-col items-start">
      <Image
        src={src}
        alt={alt}
        width={180}
        height={80}
        priority
        className="-mb-2 h-16 w-auto object-contain object-left mix-blend-multiply"
      />
      <div className="w-full border-t border-line pt-1">
        <p className="text-[0.6875rem] font-semibold text-ink">{title}</p>
        <p className="text-[0.625rem] text-ink-subtle">{subtitle}</p>
      </div>
    </div>
  );
}

const emptySubscribe = () => () => {};

// Sertifikat resmi Simula dengan satu layout kanvas proporsional untuk pratinjau, detail, dan cetak PDF.
export function CertificatePaper({
  certificate,
  partnerLogo,
  size = 'full',
  className,
}: CertificatePaperProps) {
  const isAi = certificate.tier === 'ai';
  const isFull = size === 'full';
  const resolvedPartnerLogo = partnerLogo ?? resolvePartnerLogo(certificate.partnerName);
  const partnerCeo = resolvePartnerCeo(certificate.partnerName);
  const program = isAi
    ? 'AI Case Study'
    : `B2B Case Study bersama ${certificate.partnerName ?? 'mitra'}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(isFull ? 1 : 0.42);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width > 0) {
        setScale(width / CANVAS_WIDTH);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const origin = useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => ''
  );
  const verifyPath = PATHS.certificate(certificate.id);
  const verifyUrl = origin ? `${origin}${verifyPath}` : verifyPath;

  return (
    <figure
      ref={containerRef}
      data-print-area={isFull ? '' : undefined}
      aria-label={`Sertifikat kelulusan ${certificate.recipientName}`}
      className={cn(
        'relative aspect-[794/561] w-full overflow-hidden',
        isFull ? 'rounded-card shadow-lift' : 'rounded-control',
        className
      )}
    >
      <div
        data-print-canvas={isFull ? '' : undefined}
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        className="bg-brand p-3.5"
      >
        <div
          data-print-frame={isFull ? '' : undefined}
          className="relative flex h-full w-full flex-col overflow-hidden rounded-[10px] border border-line bg-linear-to-br from-white via-surface-soft to-slate-100 px-10 py-8"
        >
          <div
            className="bg-grid mask-fade-radial pointer-events-none absolute inset-0 opacity-35"
            aria-hidden="true"
          />

          <div className="relative flex items-center justify-between gap-4">
            <BrandLogo className="h-6" />
            {certificate.partnerName ? (
              <div className="flex min-w-0 flex-col items-end text-right">
                {resolvedPartnerLogo ? (
                  <Image
                    src={resolvedPartnerLogo}
                    alt={certificate.partnerName}
                    width={200}
                    height={60}
                    priority
                    className="h-11 w-auto max-w-[190px] shrink-0 object-contain object-right p-0.5"
                  />
                ) : (
                  <p className="truncate text-sm font-semibold tracking-tight text-ink">
                    {certificate.partnerName}
                  </p>
                )}
              </div>
            ) : (
              <span className="rounded-tag bg-ai-soft px-2.5 py-0.5 text-[0.6875rem] font-medium text-ai">
                AI Case Study
              </span>
            )}
          </div>

          <div className="relative flex flex-1 flex-col justify-center py-4">
            <div>
              <span className="inline-block rounded bg-brand px-2.5 py-0.5 font-mono text-[0.6875rem] font-semibold tracking-wider text-white">
                {certificate.id}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold tracking-[0.22em] text-brand uppercase">
              Sertifikat Kelulusan
            </p>
            <p className="mt-1 text-xs text-ink-subtle">Diberikan kepada</p>
            <p className="mt-1.5 text-[2.35rem] leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-brand">
              {certificate.recipientName}
            </p>
            <p className="mt-3.5 text-sm text-ink-muted">
              atas keberhasilan menyelesaikan {program}
            </p>
            <p className="mt-1 max-w-[34ch] text-lg leading-snug font-semibold text-balance text-ink">
              {certificate.caseTitle}
            </p>
          </div>

          <div className="relative flex items-end justify-between gap-6 pt-2">
            <div className="flex flex-col gap-2.5">
              <p className="text-xs font-medium text-ink-muted">
                Diterbitkan pada {formatDate(certificate.issuedAt)}
              </p>
              <div className="flex items-end gap-8">
                <SignatureBlock
                  src="/signature/ceo_simula.svg"
                  alt="Tanda tangan Derry Riccardo"
                  title="Derry Riccardo"
                  subtitle="CEO, Simula"
                />
                {!isAi && (
                  <SignatureBlock
                    src="/signature/ceo_b2b.svg"
                    alt={`Tanda tangan ${partnerCeo.name}`}
                    title={partnerCeo.name}
                    subtitle={partnerCeo.role}
                  />
                )}
              </div>
            </div>

            <div className="flex items-end gap-3 text-right">
              <div>
                <p className="text-[0.6875rem] font-semibold text-ink">Verifikasi Sertifikat</p>
                <p className="font-mono text-[0.625rem] text-ink-subtle">{certificate.id}</p>
              </div>
              <QRCodeSVG
                value={verifyUrl}
                size={64}
                level="M"
                bgColor="transparent"
                fgColor="#0f172a"
              />
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
