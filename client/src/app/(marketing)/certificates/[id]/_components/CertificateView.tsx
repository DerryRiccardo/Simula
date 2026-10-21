'use client';

import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ShieldX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Reveal } from '@/components/animated';
import { Container } from '@/components/layout';
import { CertificatePaper } from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { formatDate } from '@/lib/formatters';
import { useCertificateVerification } from '@/hooks/useCertificate';
import type { ICertificateVerification } from '@/types';
import { CertificateActions } from './CertificateActions';
import { CertificateDetails } from './CertificateDetails';

const BODY_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10';

function CertificateSkeleton() {
  return (
    <div className="grid gap-8" role="status" aria-label="Memuat">
      <div className="grid gap-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className={BODY_GRID}>
        <Skeleton className="aspect-[1.414] rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}

function VerifiedCertificate({ verification }: { verification: ICertificateVerification }) {
  const { certificate, reviewerRole, partner, isOwner } = verification;
  const assessor = partner ? `penilaian ${reviewerRole} ${partner.name}` : 'penilaian AI';

  return (
    <div className="grid gap-8">
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between print:hidden">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 rounded-tag bg-ai-soft px-2 py-1 text-xs font-medium text-ai">
            <ShieldCheck className="size-3.5" strokeWidth={2} />
            Terverifikasi
          </p>
          <h1 className="mt-3 text-page-title">Sertifikat asli dan berlaku</h1>
          <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
            {certificate.recipientName} menyelesaikan case ini dan lulus {assessor}. Data di halaman
            ini diambil langsung dari sistem {SITE.name}, bukan unggahan pemilik sertifikat.
          </p>
        </div>
        {isOwner && <CertificateActions verification={verification} />}
      </header>

      <div className={BODY_GRID}>
        <Reveal offset={12} className="min-w-0">
          <CertificatePaper
            certificate={verification.certificate}
            partnerIndustry={verification.partner?.industry}
            reviewerRole={verification.reviewerRole}
          />
        </Reveal>
        <aside className="print:hidden">
          <CertificateDetails verification={verification} />
        </aside>
      </div>
    </div>
  );
}

// Dicabut admin: data tetap ditampilkan agar recruiter tahu sertifikat ini pernah terbit,
// tetapi kertas sertifikat dan aksi bagikan disembunyikan.
function RevokedCertificate({
  verification,
  revokedAt,
}: {
  verification: ICertificateVerification;
  revokedAt: string;
}) {
  return (
    <div className="grid gap-8">
      <header className="min-w-0">
        <p className="inline-flex items-center gap-1.5 rounded-tag bg-surface-soft px-2 py-1 text-xs font-medium text-ink-muted">
          <ShieldX className="size-3.5" strokeWidth={2} />
          Dicabut
        </p>
        <h1 className="mt-3 text-page-title">Sertifikat ini tidak berlaku lagi</h1>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
          Sertifikat atas nama {verification.certificate.recipientName} dicabut oleh {SITE.name}{' '}
          pada {formatDate(revokedAt)}, sehingga tidak bisa dipakai sebagai bukti kompetensi.
        </p>
      </header>
      <div className="max-w-xl">
        <CertificateDetails verification={verification} />
      </div>
    </div>
  );
}

// Halaman publik: recruiter membuka dari tautan di CV/LinkedIn tanpa perlu masuk.
export function CertificateView({ id }: { id: string }) {
  const { data: verification, isLoading, isError, refetch } = useCertificateVerification(id);

  return (
    <Container className="max-w-6xl pt-28 pb-20 lg:pt-32">
      {verification?.isOwner && (
        <Link
          href={PATHS.myCertificates}
          className="group mb-8 flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink print:hidden"
        >
          <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Sertifikat Saya
        </Link>
      )}

      {isLoading ? (
        <CertificateSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !verification ? (
        <EmptyState
          icon={ShieldX}
          title="Sertifikat tidak ditemukan"
          description={`ID ${id} tidak terdaftar di sistem kami. Periksa kembali tautan atau ID yang diberikan, karena sertifikat dengan ID ini tidak bisa diverifikasi.`}
          action={
            <Button asChild size="pill">
              <Link href={PATHS.home}>Ke beranda</Link>
            </Button>
          }
        />
      ) : verification.revokedAt ? (
        <RevokedCertificate verification={verification} revokedAt={verification.revokedAt} />
      ) : (
        <VerifiedCertificate verification={verification} />
      )}
    </Container>
  );
}
