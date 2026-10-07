'use client';

import { Download, Link2 } from 'lucide-react';
import { toast } from 'sonner';

import { LinkedInIcon } from '@/components/icons/LinkedInIcon';
import { Button } from '@/components/ui';
import { SITE } from '@/constants/site';
import type { ICertificateVerification } from '@/types';

// Tautan "Add to profile" LinkedIn, terisi otomatis dengan data sertifikat.
function buildLinkedInUrl({ certificate, partner }: ICertificateVerification, certUrl: string) {
  const issuedAt = new Date(certificate.issuedAt);
  const params = new URLSearchParams({
    startTask: 'CERTIFICATION_NAME',
    name: certificate.caseTitle,
    organizationName: partner?.name ?? SITE.name,
    issueYear: String(issuedAt.getFullYear()),
    issueMonth: String(issuedAt.getMonth() + 1),
    certUrl,
    certId: certificate.id,
  });
  return `https://www.linkedin.com/profile/add?${params.toString()}`;
}

// Aksi untuk pemilik sertifikat saja. "Unduh PDF" memakai dialog cetak browser (Simpan sebagai PDF).
export function CertificateActions({ verification }: { verification: ICertificateVerification }) {
  const getPageUrl = () => window.location.href.split('?')[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPageUrl());
      toast.success('Tautan verifikasi disalin', {
        description: 'Tempel di CV, portofolio, atau pesan ke recruiter.',
      });
    } catch {
      toast.error('Gagal menyalin. Salin alamat halaman ini secara manual.');
    }
  };

  const handleLinkedIn = () =>
    window.open(buildLinkedInUrl(verification, getPageUrl()), '_blank', 'noopener,noreferrer');

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 print:hidden">
      <Button size="pill" className="active:scale-[0.98]" onClick={handleLinkedIn}>
        <LinkedInIcon className="size-4" />
        Tambahkan ke LinkedIn
      </Button>
      <Button variant="outline" size="pill" onClick={() => window.print()}>
        <Download />
        Unduh PDF
      </Button>
      <Button variant="ghost" size="pill" className="text-ink-muted" onClick={handleCopy}>
        <Link2 />
        Salin tautan
      </Button>
    </div>
  );
}
