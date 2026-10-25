import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import { TierBadge } from '@/components/student';
import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { SHARE_DEFAULT_OPTIONS } from '@/constants/profile';
import { STUDENT_STATUS_OPTIONS } from '@/constants/studentStatus';
import { formatDate } from '@/lib/formatters';
import type { IAdminMemberCertificate, IAdminMemberDetail } from '@/types';

function Panel({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="rounded-card border border-line bg-white">
      <h2 id={id} className="border-b border-line px-5 py-3.5 text-[0.9375rem] md:text-[0.9375rem]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-0.5 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">{children}</dd>
    </div>
  );
}

// Data profil dari onboarding dan halaman Profil member; hanya dibaca admin.
export function ProfilePanel({ member }: { member: IAdminMemberDetail['member'] }) {
  const status = STUDENT_STATUS_OPTIONS.find((option) => option.value === member.studentStatus);
  const share = SHARE_DEFAULT_OPTIONS.find((option) => option.value === member.shareDefault);
  const fields = member.fieldKeys.flatMap((key) => FIELD_BY_KEY[key]?.label ?? []);

  return (
    <Panel id="member-profile" title="Profil">
      <dl className="divide-y divide-line px-5 py-4">
        <Row label="Status">{status?.label ?? 'Belum diisi'}</Row>
        <Row label="Jurusan">{member.major ?? 'Belum diisi'}</Row>
        <Row label="Institusi">{member.institution ?? 'Belum diisi'}</Row>
        <Row label="Bidang">
          {fields.length > 0 ? (
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {fields.map((label) => (
                <li
                  key={label}
                  className="rounded-tag border border-line px-2 py-0.5 text-xs text-ink-muted"
                >
                  {label}
                </li>
              ))}
            </ul>
          ) : (
            'Belum memilih'
          )}
        </Row>
        <Row label="Berbagi profil ke mitra">{share?.label ?? '-'}</Row>
        {member.linkedinUrl && (
          <Row label="LinkedIn">
            <a
              href={member.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex max-w-full items-center gap-1 text-brand hover:underline"
            >
              <span className="truncate">{member.linkedinUrl.replace(/^https?:\/\//, '')}</span>
              <ArrowUpRight className="size-3.5 shrink-0" />
            </a>
          </Row>
        )}
      </dl>
    </Panel>
  );
}

// Sertifikat yang terbit untuk member ini.
export function CertificatePanel({ items }: { items: IAdminMemberCertificate[] }) {
  return (
    <Panel id="member-certificates" title="Sertifikat">
      {items.length === 0 ? (
        <p className="px-5 py-5 text-sm text-ink-muted">Belum ada sertifikat.</p>
      ) : (
        <ul className="divide-y divide-line">
          {items.map((certificate) => (
            <li key={certificate.id} className="px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <TierBadge tier={certificate.tier} />
              </div>
              <p className="mt-1.5 text-sm leading-snug font-medium text-ink">
                {certificate.caseTitle}
              </p>
              <p className="mt-0.5 font-mono text-xs text-ink-subtle tabular-nums">
                Skor {certificate.score}, terbit {formatDate(certificate.issuedAt)}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium">
                <Link
                  href={PATHS.certificate(certificate.id)}
                  target="_blank"
                  className="inline-flex items-center gap-0.5 text-brand hover:underline"
                >
                  Verifikasi publik
                  <ArrowUpRight className="size-3" />
                </Link>
                <Link
                  href={PATHS.adminReview(certificate.enrollmentId)}
                  className="text-ink-muted hover:text-ink hover:underline"
                >
                  Lihat penilaian
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
