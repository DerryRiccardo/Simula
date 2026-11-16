'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Archive, ArchiveRestore, SearchX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useAdminCase, useSetAdminCaseStatus } from '@/hooks/useAdmin';
import { usePlatformSettings } from '@/hooks/usePlatform';
import { formatDateTime } from '@/lib/formatters';
import type { IAdminCase } from '@/types';
import { getEmptyCase, toCaseInput } from '../_schema';
import { CaseBuilderForm } from './builder/CaseBuilderForm';
import { CaseStatusBadge } from '@/components/admin';

function BuilderHeader({ adminCase }: { adminCase: IAdminCase | null }) {
  const setStatus = useSetAdminCaseStatus();
  return (
    <header className="grid gap-3 border-b border-line pb-6">
      {adminCase && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <CaseStatusBadge status={adminCase.status} />
            <span className="font-mono text-xs text-ink-subtle tabular-nums">
              Disimpan {formatDateTime(adminCase.updatedAt)}
            </span>
          </div>
          {adminCase.status !== 'draft' && (
            <Button
              type="button"
              variant="outline"
              size="pill"
              disabled={setStatus.isPending}
              onClick={() =>
                setStatus.mutate({
                  id: adminCase.id,
                  status: adminCase.status === 'archived' ? 'published' : 'archived',
                })
              }
            >
              {adminCase.status === 'archived' ? (
                <>
                  <ArchiveRestore className="size-3.5" />
                  Pulihkan case
                </>
              ) : (
                <>
                  <Archive className="size-3.5" />
                  Arsipkan case
                </>
              )}
            </Button>
          )}
        </div>
      )}
      <h1 className="text-page-title">{adminCase ? adminCase.title : 'Buat case baru'}</h1>
      {adminCase?.status === 'archived' && (
        <p className="rounded-control border border-line bg-surface-soft/60 px-4 py-2.5 text-sm text-ink-muted">
          Case ini sedang diarsipkan dan disembunyikan dari katalog peserta. Pulihkan terlebih dahulu
          jika ingin mengubah atau menerbitkannya kembali.
        </p>
      )}
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
  const settings = usePlatformSettings();
  const defaultValues = useMemo(
    () =>
      adminCase
        ? toCaseInput(adminCase)
        : { ...getEmptyCase(), passingScore: settings.passingScoreAi },
    [adminCase, settings.passingScoreAi]
  );

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
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
