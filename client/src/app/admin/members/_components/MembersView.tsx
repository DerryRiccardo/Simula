'use client';

import { SearchX, Users } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { FIELD_FILTER_OPTIONS } from '@/constants/fields';
import { useAdminMembers } from '@/hooks/useAdmin';
import { MEMBER_SORT_OPTIONS, useAdminMemberFilters } from '@/hooks/useAdminMemberFilters';
import { formatNumber } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminMemberSummary } from '@/types';
import { MEMBER_GRID, MemberRow } from './MemberRow';

function MemberStats({ members }: { members: IAdminMemberSummary[] }) {
  const stats = [
    { label: 'Member terdaftar', value: members.length },
    {
      label: 'Sedang mengerjakan',
      value: members.filter((member) => member.activeCaseCount > 0).length,
    },
    {
      label: 'Punya sertifikat',
      value: members.filter((member) => member.certificateCount > 0).length,
    },
    {
      label: 'Pernah membeli B2B',
      value: members.filter((member) => member.totalSpent > 0).length,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white px-5 py-4">
          <dt className="text-xs text-ink-subtle">{stat.label}</dt>
          <dd className="mt-1 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums">
            {formatNumber(stat.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function MemberTable({ items }: { items: IAdminMemberSummary[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-line bg-white">
      <div
        className={cn(
          'hidden border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs font-medium text-ink-subtle',
          MEMBER_GRID
        )}
        aria-hidden="true"
      >
        <span>Member</span>
        <span>Bidang</span>
        <span>Case</span>
        <span>Sertifikat</span>
        <span>Terakhir aktif</span>
        <span className="text-right">Aksi</span>
      </div>
      <ol className="divide-y divide-line">
        {items.map((member, index) => (
          <Reveal key={member.id} as="li" offset={8} delay={Math.min(index * 0.03, 0.24)}>
            <MemberRow member={member} />
          </Reveal>
        ))}
      </ol>
    </div>
  );
}

function MembersSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-9 w-96 max-w-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

// Member (CONTEXT.md 4.13): mahasiswa terdaftar dan ringkasan aktivitasnya.
export function MembersView() {
  const { data: members, isLoading, isError, refetch } = useAdminMembers();
  const filters = useAdminMemberFilters(members);

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title="Member"
        description="Mahasiswa dan fresh graduate yang terdaftar. Buka member untuk melihat riwayat case, order, dan sertifikatnya."
      />

      {isLoading ? (
        <MembersSkeleton />
      ) : isError || !members ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <MemberStats members={members} />

          <section aria-label="Daftar member" className="grid gap-4">
            <FilterTabs
              ariaLabel="Aktivitas member"
              options={filters.activityOptions}
              value={filters.activity}
              onChange={filters.setActivity}
              className="w-fit"
            />
            <SearchToolbar
              search={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              searchPlaceholder="Cari nama, email, atau jurusan"
              sortOptions={MEMBER_SORT_OPTIONS}
              sort={filters.sort}
              onSortChange={filters.setSort}
              filterSections={[
                {
                  id: 'field',
                  label: 'Bidang',
                  options: FIELD_FILTER_OPTIONS,
                  value: filters.field,
                  onChange: filters.setField,
                },
              ]}
              onResetFilters={() => filters.setField('all')}
            />

            {filters.items.length > 0 ? (
              <MemberTable items={filters.items} />
            ) : filters.hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada member yang cocok"
                description="Coba kata kunci lain, atau tampilkan semua bidang dan aktivitas."
                action={
                  <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Users}
                title="Belum ada member"
                description="Mahasiswa yang mendaftar akan muncul di sini."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
