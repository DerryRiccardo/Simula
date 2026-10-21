'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Info, SearchX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useAdminCase } from '@/hooks/useAdmin';
import { formatDateTime } from '@/lib/formatters';
import type { IAdminCase } from '@/types';
import { getEmptyCase, toCaseInput } from '../_schema';
import { CaseBuilderForm } from './builder/CaseBuilderForm';
import { CaseStatusBadge } from '@/components/admin';

function BuilderHeader({ adminCase }: { adminCase: IAdminCase | null }) {
  return (
    <header className="grid gap-3 border-b border-line pb-6">
      {adminCase && (
        <div className="flex flex-wrap items-center gap-3">
          <CaseStatusBadge status={adminCase.status} />
          <span className="font-mono text-xs text-ink-subtle tabular-nums">
            Disimpan {formatDateTime(adminCase.updatedAt)}
          </span>
        </div>
      )}
      <h1 className="text-page-title">{adminCase ? adminCase.title : 'Buat case baru'}</h1>
      {/* Batas prototype dijelaskan terang, supaya tidak dikira sudah tersambung ke katalog. */}
      <p className="flex max-w-[70ch] gap-2 text-sm leading-relaxed text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
        Prototype: case tersimpan di panel admin. Katalog mahasiswa baru memakai case buatan admin
        setelah backend tersedia.
      </p>
    </header>
  );
}

function BuilderSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-80 rounded-card" />
      <Skeleton className="h-64 rounded-card" />
    </div>
  );
}

/** id null = case baru. */
export function CaseBuilderView({ id }: { id: string | null }) {
  const { data: adminCase, isLoading, isError, refetch } = useAdminCase(id);
  const defaultValues = useMemo(
    () => (adminCase ? toCaseInput(adminCase) : getEmptyCase()),
    [adminCase]
  );

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <Link
        href={PATHS.adminCases}
        className="group flex w-fit items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
        Daftar case
      </Link>

      {isLoading ? (
        <BuilderSkeleton />
      ) : isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : id && !adminCase ? (
        <EmptyState
          icon={SearchX}
          title="Case tidak ditemukan"
          description="Case ini mungkin sudah dihapus, atau tautannya salah."
          action={
            <Button asChild size="pill">
              <Link href={PATHS.adminCases}>Kembali ke daftar case</Link>
            </Button>
          }
        />
      ) : (
        <>
          <BuilderHeader adminCase={adminCase ?? null} />
          <CaseBuilderForm
            key={adminCase?.id ?? 'new'}
            adminCase={adminCase ?? null}
            defaultValues={defaultValues}
          />
        </>
      )}
    </div>
  );
}
