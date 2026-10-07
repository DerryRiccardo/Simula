import type { ReactNode } from 'react';
import Link from 'next/link';

import { TierBadge } from '@/components/student';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { formatDate } from '@/lib/formatters';
import type { ICertificateVerification } from '@/types';

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-3 text-sm first:pt-0 last:pb-0">
      <dt className="text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-ink">{children}</dd>
    </div>
  );
}

// Data resmi sertifikat untuk recruiter: siapa, apa, siapa yang menilai, dan skornya.
export function CertificateDetails({ verification }: { verification: ICertificateVerification }) {
  const { certificate, partner, reviewerRole, skills, passingScore, caseSlug } = verification;

  return (
    <div className="grid content-start gap-4">
      <section
        aria-labelledby="detail-title"
        className="rounded-card border border-line bg-white p-5"
      >
        <h2 id="detail-title" className="text-[0.9375rem] md:text-[0.9375rem]">
          Detail sertifikat
        </h2>
        <dl className="mt-4 divide-y divide-line">
          <DetailRow label="Penerima">{certificate.recipientName}</DetailRow>
          <DetailRow label="Program">
            <TierBadge tier={certificate.tier} />
          </DetailRow>
          <DetailRow label="Case">
            <Link
              href={PATHS.caseDetail(caseSlug)}
              className="text-brand underline-offset-4 hover:underline"
            >
              {certificate.caseTitle}
            </Link>
          </DetailRow>
          <DetailRow label="Penerbit">{partner?.name ?? SITE.name}</DetailRow>
          <DetailRow label="Dinilai oleh">{reviewerRole}</DetailRow>
          <DetailRow label="Skor akhir">
            <span className="font-mono tabular-nums">{certificate.score} / 100</span>
            <span className="block text-xs text-ink-subtle">Ambang lulus {passingScore}</span>
          </DetailRow>
          <DetailRow label="Diterbitkan">
            <span className="font-mono tabular-nums">{formatDate(certificate.issuedAt)}</span>
          </DetailRow>
          <DetailRow label="ID sertifikat">
            <span className="font-mono text-[0.8125rem] break-all">{certificate.id}</span>
          </DetailRow>
        </dl>
      </section>

      {skills.length > 0 && (
        <section
          aria-labelledby="skills-title"
          className="rounded-card border border-line bg-white p-5"
        >
          <h2 id="skills-title" className="text-[0.9375rem] md:text-[0.9375rem]">
            Kompetensi yang dinilai
          </h2>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <li
                key={skill}
                className="rounded-tag bg-surface-soft px-2 py-1 text-xs font-medium text-ink-muted"
              >
                {skill}
              </li>
            ))}
          </ul>
        </section>
      )}

      {partner && (
        <section
          aria-labelledby="partner-title"
          className="rounded-card border border-line bg-white p-5"
        >
          <h2 id="partner-title" className="text-[0.9375rem] md:text-[0.9375rem]">
            Tentang {partner.name}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-muted">{partner.about}</p>
        </section>
      )}
    </div>
  );
}
