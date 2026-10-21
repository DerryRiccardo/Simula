'use client';

import { useState } from 'react';
import { SearchX, UserRoundCheck } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { ConfirmDialog, EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { useShareTalent, useTalentPool } from '@/hooks/useAdminPlatform';
import {
  getTalentStage,
  TALENT_ALL_PARTNERS,
  TALENT_SORT_OPTIONS,
  useTalentPoolFilters,
} from '@/hooks/useTalentPoolFilters';
import { cn } from '@/lib/utils';
import type { ITalentCandidate } from '@/types';
import { TALENT_GRID, TalentRow } from './TalentRow';

function TalentStats({ candidates }: { candidates: ITalentCandidate[] }) {
  const count = (stage: ReturnType<typeof getTalentStage>) =>
    candidates.filter((item) => getTalentStage(item) === stage).length;
  const ready = count('ready');
  const stats = [
    { label: 'Direkomendasikan', value: candidates.length },
    { label: 'Siap diteruskan', value: ready, isHighlighted: ready > 0 },
    { label: 'Menunggu persetujuan', value: count('pending') },
    { label: 'Sudah diteruskan', value: count('shared') },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white px-5 py-4">
          <dt className="text-xs text-ink-subtle">{stat.label}</dt>
          <dd
            className={cn(
              'mt-1 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
              stat.isHighlighted ? 'text-brand' : 'text-ink'
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function TalentSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-9 w-[30rem] max-w-full" />
      <Skeleton className="h-72 rounded-card" />
    </div>
  );
}

// Talent pool (CONTEXT.md 4.8 dan 4.13): kandidat yang direkomendasikan reviewer. Profil hanya
// diteruskan ke mitra setelah peserta menyetujuinya.
export function TalentPoolView() {
  const { data: candidates, isLoading, isError, refetch } = useTalentPool();
  const filters = useTalentPoolFilters(candidates);
  const share = useShareTalent();
  const [target, setTarget] = useState<ITalentCandidate | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const openShare = (candidate: ITalentCandidate) => {
    setTarget(candidate);
    setIsConfirmOpen(true);
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title="Talent pool"
        description="Peserta B2B yang direkomendasikan reviewer ke daftar prioritas interview. Profil hanya diteruskan ke mitra setelah peserta menyetujuinya."
      />

      {isLoading ? (
        <TalentSkeleton />
      ) : isError || !candidates ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <TalentStats candidates={candidates} />

          <section aria-label="Daftar kandidat" className="grid gap-4">
            <FilterTabs
              ariaLabel="Tahap kandidat"
              options={filters.tabOptions}
              value={filters.tab}
              onChange={filters.setTab}
              className="w-fit"
            />
            <SearchToolbar
              search={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              searchPlaceholder="Cari nama kandidat atau judul case"
              sortOptions={TALENT_SORT_OPTIONS}
              sort={filters.sort}
              onSortChange={filters.setSort}
              filterSections={[
                {
                  id: 'partner',
                  label: 'Mitra',
                  options: filters.partnerOptions,
                  value: filters.partnerId,
                  onChange: filters.setPartnerId,
                },
              ]}
              onResetFilters={() => filters.setPartnerId(TALENT_ALL_PARTNERS)}
            />

            {filters.items.length > 0 ? (
              <div className="overflow-hidden rounded-card border border-line bg-white">
                <div
                  className={cn(
                    'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
                    TALENT_GRID
                  )}
                  aria-hidden="true"
                >
                  <span>Kandidat</span>
                  <span>Case dan mitra</span>
                  <span>Skor</span>
                  <span>Status</span>
                  <span className="text-right">Aksi</span>
                </div>
                <ol className="divide-y divide-line">
                  {filters.items.map((candidate, index) => (
                    <Reveal
                      key={candidate.id}
                      as="li"
                      offset={8}
                      delay={Math.min(index * 0.03, 0.24)}
                    >
                      <TalentRow candidate={candidate} onShare={openShare} />
                    </Reveal>
                  ))}
                </ol>
              </div>
            ) : filters.hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada kandidat yang cocok"
                description="Coba kata kunci lain, atau tampilkan semua tahap dan mitra."
                action={
                  <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={UserRoundCheck}
                title="Belum ada kandidat"
                description="Kandidat muncul di sini begitu reviewer mencentang rekomendasi interview saat menilai B2B case."
              />
            )}
          </section>

          <ConfirmDialog
            isOpen={isConfirmOpen}
            onOpenChange={setIsConfirmOpen}
            title="Teruskan profil ke mitra?"
            description={
              target
                ? `Profil, skor, dan sertifikat ${target.memberName} dikirim ke ${target.partnerName ?? 'mitra'} sebagai kandidat prioritas interview. Peserta sudah menyetujuinya; pengiriman tidak bisa ditarik kembali.`
                : ''
            }
            confirmLabel="Teruskan"
            isPending={share.isPending}
            onConfirm={() =>
              target && share.mutate(target.id, { onSuccess: () => setIsConfirmOpen(false) })
            }
          />
        </>
      )}
    </div>
  );
}
