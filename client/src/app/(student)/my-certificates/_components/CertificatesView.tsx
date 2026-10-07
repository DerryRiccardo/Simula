'use client';

import Link from 'next/link';
import { Award } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components';
import { CertificateCard, FilterTabs, PageHeading } from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useMyCertificates } from '@/hooks/useLearning';
import { useUrlParams } from '@/hooks/useUrlParams';
import { parseOption } from '@/lib/parseOption';
import type { ICertificate, TTier } from '@/types';

type TTierFilter = TTier | 'all';

const TIER_TABS: { value: TTierFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

function CertificateSummary({ certificates }: { certificates: ICertificate[] }) {
  if (certificates.length === 0) return null;
  const average = certificates.reduce((total, item) => total + item.score, 0) / certificates.length;
  const partnerCount = new Set(certificates.flatMap((item) => item.partnerName ?? [])).size;

  const items = [
    { label: 'Sertifikat', value: String(certificates.length) },
    {
      label: 'Skor rata-rata',
      value: average.toLocaleString('id-ID', { maximumFractionDigits: 1 }),
    },
    { label: 'Dari perusahaan mitra', value: String(partnerCount) },
  ];

  return (
    <dl className="flex flex-wrap gap-x-8 gap-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs text-ink-subtle">{item.label}</dt>
          <dd className="mt-0.5 text-lg font-semibold tracking-[-0.02em] text-ink tabular-nums">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function CertificatesView() {
  const { searchParams, setParams } = useUrlParams();
  const tier = parseOption(TIER_TABS, searchParams.get('tier'), 'all');
  // Ringkasan dihitung dari semua sertifikat, terlepas dari tab yang dipilih.
  const { data: allCertificates } = useMyCertificates({});
  const {
    data: certificates,
    isLoading,
    isError,
    refetch,
  } = useMyCertificates({ tier: tier === 'all' ? undefined : tier });

  const tierTabs = TIER_TABS.map((tab) => ({
    ...tab,
    count: allCertificates?.filter((item) => tab.value === 'all' || item.tier === tab.value).length,
  }));

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-8">
      <PageHeading
        title="Sertifikat Saya"
        description="Setiap sertifikat punya tautan verifikasi publik yang bisa kamu bagikan ke recruiter."
        meta={allCertificates && <CertificateSummary certificates={allCertificates} />}
      />

      <FilterTabs
        ariaLabel="Jenis sertifikat"
        options={tierTabs}
        value={tier}
        onChange={(value) => setParams({ tier: value === 'all' ? null : value })}
      />

      {isLoading ? (
        <CardGridSkeleton count={3} />
      ) : isError || !certificates ? (
        <ErrorState onRetry={() => refetch()} />
      ) : certificates.length === 0 ? (
        <EmptyState
          icon={Award}
          title="Belum ada sertifikat"
          description="Selesaikan case dan lulus penilaian. Sertifikat langsung terbit di sini."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.cases}>Jelajahi Case</Link>
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {certificates.map((certificate, index) => (
            <Reveal key={certificate.id} as="li" offset={12} delay={index * 0.06}>
              <CertificateCard certificate={certificate} />
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}
