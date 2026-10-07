import { BrandLogo } from '@/components/layout/Logo';
import { formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ICertificate } from '@/types';

type TPaperSize = 'full' | 'compact';

interface CertificatePaperProps {
  certificate: ICertificate;
  /** Industri mitra di bawah nama mitra (hanya ukuran penuh). */
  partnerIndustry?: string | null;
  /** Penilai; ukuran ringkas tidak menampilkannya agar baris bawah tetap muat. */
  reviewerRole?: string | null;
  /** full = halaman verifikasi, compact = pratinjau di kartu Sertifikat Saya. */
  size?: TPaperSize;
  className?: string;
}

// Kelas per ukuran: struktur sama persis, hanya skala tipografi dan jarak yang berbeda.
const SIZE_CLASS: Record<
  TPaperSize,
  {
    frame: string;
    logo: string;
    partner: string;
    lead: string;
    name: string;
    program: string;
    title: string;
    body: string;
    facts: string;
    label: string;
    value: string;
  }
> = {
  full: {
    frame: 'm-3 rounded-control px-5 py-7 sm:m-4 sm:aspect-[1.414] sm:px-10 sm:py-9',
    logo: 'h-6',
    partner: 'text-sm',
    lead: 'text-xs',
    name: 'mt-2 text-[2rem] leading-[1.05] tracking-[-0.035em] sm:text-[2.75rem]',
    program: 'mt-5 text-sm',
    title: 'mt-1 max-w-[30ch] text-lg leading-snug sm:text-xl',
    body: 'py-10 sm:py-6',
    facts: 'gap-x-6 gap-y-4 pt-5 sm:grid-cols-[auto_auto_minmax(0,1fr)_auto]',
    label: 'text-[0.6875rem]',
    value: 'mt-0.5 text-xs sm:text-[0.8125rem]',
  },
  compact: {
    frame: 'm-2 aspect-[1.414] rounded-[6px] px-4 py-3.5',
    logo: 'h-3.5',
    partner: 'text-[0.625rem]',
    lead: 'text-[0.5625rem]',
    name: 'mt-0.5 truncate text-base leading-tight tracking-[-0.02em]',
    program: 'mt-1.5 text-[0.5625rem]',
    title: 'mt-0.5 line-clamp-2 text-[0.6875rem] leading-snug',
    body: 'py-2',
    facts: 'grid-cols-[auto_auto_auto] justify-between gap-x-3 pt-2',
    label: 'text-[0.5rem]',
    value: 'text-[0.5625rem]',
  },
};

function Fact({
  label,
  value,
  isMono = false,
  classes,
}: {
  label: string;
  value: string;
  isMono?: boolean;
  classes: (typeof SIZE_CLASS)[TPaperSize];
}) {
  return (
    <div className="min-w-0">
      <dt className={cn('text-ink-subtle', classes.label)}>{label}</dt>
      <dd
        className={cn(
          'leading-snug font-medium text-ink',
          classes.value,
          isMono && 'font-mono whitespace-nowrap tabular-nums'
        )}
      >
        {value}
      </dd>
    </div>
  );
}

// Sertifikat sebagai dokumen kertas: tepi atas berwarna tier, bingkai tipis, tekstur grid landing.
// Dipakai halaman verifikasi (ukuran penuh, ikut tercetak lewat data-print-area) dan kartu
// Sertifikat Saya (ukuran ringkas), supaya pratinjau selalu sama dengan sertifikat aslinya.
export function CertificatePaper({
  certificate,
  partnerIndustry,
  reviewerRole,
  size = 'full',
  className,
}: CertificatePaperProps) {
  const classes = SIZE_CLASS[size];
  const isAi = certificate.tier === 'ai';
  const isFull = size === 'full';
  const program = isAi
    ? 'AI Case Study'
    : `B2B Case Study bersama ${certificate.partnerName ?? 'mitra'}`;

  return (
    <figure
      data-print-area={isFull ? '' : undefined}
      aria-label={`Sertifikat kelulusan ${certificate.recipientName}`}
      className={cn(
        'relative overflow-hidden border border-line bg-white',
        isFull ? 'rounded-card border-t-4 shadow-lift' : 'rounded-control border-t-2',
        isAi ? 'border-t-ai' : 'border-t-brand',
        className
      )}
    >
      <div className="absolute inset-0 bg-grid mask-fade-radial opacity-40" aria-hidden="true" />

      <div className={cn('relative flex flex-col border border-line/80', classes.frame)}>
        <div className="flex items-start justify-between gap-3">
          <BrandLogo className={classes.logo} />
          {certificate.partnerName ? (
            <div className="min-w-0 text-right">
              <p className={cn('truncate font-semibold tracking-tight text-ink', classes.partner)}>
                {certificate.partnerName}
              </p>
              {isFull && partnerIndustry && (
                <p className="text-[0.6875rem] text-ink-subtle">{partnerIndustry}</p>
              )}
            </div>
          ) : (
            <p className={cn('font-medium text-ai', classes.label)}>AI Case Study</p>
          )}
        </div>

        <div className={cn('flex flex-1 flex-col justify-center', classes.body)}>
          <p className={cn('text-ink-subtle', classes.lead)}>
            Sertifikat kelulusan diberikan kepada
          </p>
          <p className={cn('font-semibold text-balance text-ink', classes.name)}>
            {certificate.recipientName}
          </p>
          <p className={cn('text-ink-muted', classes.program)}>
            atas keberhasilan menyelesaikan {program}
          </p>
          <p className={cn('font-semibold text-balance text-ink', classes.title)}>
            {certificate.caseTitle}
          </p>
        </div>

        <dl className={cn('grid grid-cols-2 border-t border-dashed border-line', classes.facts)}>
          <Fact label="Skor akhir" value={`${certificate.score} / 100`} isMono classes={classes} />
          <Fact
            label="Diterbitkan"
            value={formatDate(certificate.issuedAt)}
            isMono
            classes={classes}
          />
          {isFull && reviewerRole && (
            <Fact label="Dinilai oleh" value={reviewerRole} classes={classes} />
          )}
          <Fact label="ID sertifikat" value={certificate.id} isMono classes={classes} />
        </dl>
      </div>
    </figure>
  );
}
