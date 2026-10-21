'use client';

import Link from 'next/link';
import { ArrowLeft, UserX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useAdminMember } from '@/hooks/useAdmin';
import { formatDate, formatPrice, formatRelative, getInitials } from '@/lib/formatters';
import type { IAdminMemberDetail } from '@/types';
import { EnrollmentHistory, OrderHistory } from './MemberHistory';
import { CertificatePanel, ProfilePanel } from './MemberSidebar';

const DETAIL_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]';

function MemberHeader({ member }: { member: IAdminMemberDetail['member'] }) {
  const facts = [
    {
      label: 'Case diambil',
      value: String(member.aiCaseCount + member.b2bCaseCount),
      hint: `${member.aiCaseCount} AI, ${member.b2bCaseCount} B2B`,
    },
    {
      label: 'Sedang berjalan',
      value: String(member.activeCaseCount),
      hint: member.lastActiveAt
        ? `Aktif ${formatRelative(member.lastActiveAt)}`
        : 'Belum ada aktivitas',
    },
    { label: 'Sertifikat', value: String(member.certificateCount), hint: 'Yang masih berlaku' },
    {
      label: 'Total pembelian',
      value: formatPrice(member.totalSpent || null),
      hint: 'Order berhasil',
    },
  ];

  return (
    <header className="grid gap-6 border-b border-line pb-6">
      <div className="flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full bg-surface-soft text-base font-semibold text-ink-muted ring-1 ring-line"
          aria-hidden="true"
        >
          {getInitials(member.name)}
        </span>
        <div className="min-w-0">
          <h1 className="text-[1.625rem] leading-[1.2] tracking-[-0.02em] md:text-[2rem]">
            {member.name}
          </h1>
          <p className="mt-1 text-sm break-all text-ink-muted">{member.email}</p>
          <p className="mt-0.5 font-mono text-xs text-ink-subtle tabular-nums">
            Bergabung {formatDate(member.joinedAt)}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="min-w-0 bg-white px-5 py-4">
            <dt className="text-xs text-ink-subtle">{fact.label}</dt>
            <dd className="mt-1 truncate text-[1.5rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
              {fact.value}
            </dd>
            <dd className="mt-1.5 truncate text-xs text-ink-muted">{fact.hint}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8" role="status" aria-label="Memuat">
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 rounded-full" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-24 rounded-card" />
      <div className={DETAIL_GRID}>
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}

// Detail member (CONTEXT.md 4.13): profil, riwayat case, order, dan sertifikat. Baca saja.
export function MemberDetailView({ id }: { id: string }) {
  const { data: detail, isLoading, isError, refetch } = useAdminMember(id);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <Link
        href={PATHS.adminMembers}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Member
      </Link>

      {isLoading ? (
        <DetailSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : !detail ? (
        <EmptyState
          icon={UserX}
          title="Member tidak ditemukan"
          description="Akun ini tidak ada, atau bukan akun mahasiswa."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.adminMembers}>Kembali ke daftar member</Link>
            </Button>
          }
        />
      ) : (
        <>
          <MemberHeader member={detail.member} />
          <div className={DETAIL_GRID}>
            <div className="grid min-w-0 content-start gap-8">
              <Reveal offset={8}>
                <EnrollmentHistory items={detail.enrollments} />
              </Reveal>
              <Reveal offset={8} delay={0.04}>
                <OrderHistory items={detail.orders} />
              </Reveal>
            </div>
            <aside className="grid min-w-0 content-start gap-6 lg:sticky lg:top-24 lg:self-start">
              <ProfilePanel member={detail.member} />
              <CertificatePanel items={detail.certificates} />
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
