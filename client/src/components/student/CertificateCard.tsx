'use client';

import Link from 'next/link';
import { Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { PATHS } from '@/constants/paths';
import type { ICertificate } from '@/types';
import { CertificatePaper } from './CertificatePaper';

// Pratinjau memakai CertificatePaper ukuran ringkas: strukturnya sama dengan sertifikat asli.
export function CertificateCard({ certificate }: { certificate: ICertificate }) {
  const verifyPath = PATHS.certificate(certificate.id);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${verifyPath}`);
      toast.success('Tautan verifikasi disalin', {
        description: 'Tempel di profil LinkedIn atau CV-mu.',
      });
    } catch {
      toast.error('Gagal menyalin tautan. Buka sertifikat lalu salin dari sana.');
    }
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-card border border-line bg-white transition-shadow duration-200 hover:shadow-lift">
      <div className="bg-surface-soft p-4">
        <CertificatePaper
          certificate={certificate}
          size="compact"
          className="transition-transform duration-300 group-hover:-translate-y-0.5"
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-baseline gap-1.5">
            <span className="text-xl font-semibold tracking-[-0.02em] text-ink tabular-nums">
              {certificate.score}
            </span>
            <span className="text-xs text-ink-subtle">skor akhir</span>
          </p>
          <p className="mt-0.5 truncate font-mono text-[0.6875rem] text-ink-subtle">
            {certificate.id}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={handleCopyLink}
            aria-label="Salin tautan verifikasi"
            className="grid size-9 place-items-center rounded-control border border-line text-ink-muted transition-colors outline-none hover:border-ink/25 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.97]"
          >
            <Link2 className="size-4" />
          </button>
          <Link
            href={verifyPath}
            className="flex h-9 items-center rounded-full bg-brand px-4 text-sm font-medium text-white transition-colors outline-none hover:bg-brand-hover focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.98]"
          >
            Lihat
            <span className="sr-only"> sertifikat {certificate.caseTitle}</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
