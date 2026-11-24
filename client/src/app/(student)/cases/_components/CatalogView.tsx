'use client';

import Link from 'next/link';
import { SearchX } from 'lucide-react';

import { Reveal } from '@/components/animated';
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components';
import {
  CaseCard,
  FILTER_ALL,
  FilterTabs,
  PageHeading,
  SearchToolbar,
  type IFilterSection,
} from '@/components/student';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCaseCatalog } from '@/hooks/useLearning';
import { useActiveFields } from '@/hooks/usePlatform';
import { useUrlParams } from '@/hooks/useUrlParams';
import { useUrlSearch } from '@/hooks/useUrlSearch';
import { parseOption } from '@/lib/parseOption';
import type { TCaseLevel, TCaseSort, TTier } from '@/types';

type TTierFilter = TTier | 'all';

const TIER_TABS: { value: TTierFilter; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

const SORT_OPTIONS: { value: TCaseSort; label: string }[] = [
  { value: 'relevance', label: 'Paling relevan' },
  { value: 'popular', label: 'Terpopuler' },
  { value: 'rating', label: 'Rating tertinggi' },
  { value: 'price_low', label: 'Harga terendah' },
];

const LEVEL_OPTIONS: { value: TCaseLevel | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua level' },
  { value: 'beginner', label: 'Pemula' },
  { value: 'intermediate', label: 'Menengah' },
  { value: 'advanced', label: 'Mahir' },
];

export function CatalogView() {
  const { user, isLoading: isUserLoading } = useCurrentUser();
  const { filterOptions: fieldFilterOptions } = useActiveFields();
  const { searchParams, setParams } = useUrlParams();
  const tier = parseOption(TIER_TABS, searchParams.get('tier'), 'all');
  const field = parseOption(fieldFilterOptions, searchParams.get('field'), FILTER_ALL);
  const level = parseOption(LEVEL_OPTIONS, searchParams.get('level'), 'all');
  const sort = parseOption(SORT_OPTIONS, searchParams.get('sort'), 'relevance');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);

  // Jelajahi Case untuk mencari case baru; yang sudah diambil cukup dikelola di Case Saya.
  const { data, isLoading, isError, refetch } = useCaseCatalog(
    {
      tier: tier === 'all' ? undefined : tier,
      field: field === FILTER_ALL ? undefined : field,
      level: level === 'all' ? undefined : level,
      sort,
      search: urlSearch || undefined,
      excludeEnrolled: user !== null,
      limit: 24,
    },
    !isUserLoading
  );

  const cases = data?.data ?? [];
  const userFields = user?.fieldKeys ?? [];
  // Tanpa pencarian dan filter bidang/level, daftar kosong berarti semua case di tab ini sudah diambil.
  const hasRefinements = field !== FILTER_ALL || level !== 'all' || urlSearch !== '';
  const tierLabel = tier === 'all' ? 'case' : TIER_TABS.find((tab) => tab.value === tier)?.label;

  const filterSections: IFilterSection[] = [
    {
      id: 'field',
      label: 'Bidang',
      options: fieldFilterOptions,
      value: field,
      onChange: (value) => setParams({ field: value === FILTER_ALL ? null : value }),
    },
    {
      id: 'level',
      label: 'Level',
      options: LEVEL_OPTIONS,
      value: level,
      onChange: (value) => setParams({ level: value === FILTER_ALL ? null : value }),
    },
  ];

  const resetAll = () => {
    clearSearch();
    setParams({ tier: null, field: null, level: null, search: null });
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 pb-8">
      <PageHeading
        title="Jelajahi Case"
        description="Case study dari kebutuhan nyata industri, dari berbagai bidang."
      />

      <div className="grid gap-4">
        <div data-tour="tier-filter">
          <FilterTabs
            ariaLabel="Jenis case"
            options={TIER_TABS}
            value={tier}
            onChange={(value) => setParams({ tier: value === 'all' ? null : value })}
          />
        </div>

        <SearchToolbar
          search={searchInput}
          onSearchChange={setSearchInput}
          searchPlaceholder="Cari judul atau topik case"
          sortOptions={SORT_OPTIONS}
          sort={sort}
          onSortChange={(value) => setParams({ sort: value === 'relevance' ? null : value })}
          filterSections={filterSections}
          onResetFilters={() => setParams({ field: null, level: null })}
        />
      </div>

      <section aria-label="Daftar case" className="grid gap-4">
        {data && (
          <p className="text-sm text-ink-subtle" aria-live="polite">
            Total <span className="font-mono text-ink tabular-nums">{data.metadata.totalItems}</span>{' '}
            case
          </p>
        )}

        {isLoading || isUserLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={hasRefinements ? 'Case tidak ditemukan' : `Semua ${tierLabel} sudah kamu ambil`}
            description={
              hasRefinements
                ? 'Coba kata kunci lain, atau longgarkan filter. Case yang sudah kamu ambil tidak ditampilkan di sini.'
                : 'Lanjutkan pengerjaan dan lihat hasilnya di Case Saya. Case baru akan muncul di sini begitu terbit.'
            }
            action={
              hasRefinements ? (
                <Button variant="outline" size="pill" onClick={resetAll}>
                  Hapus semua filter
                </Button>
              ) : (
                <Button asChild size="pill">
                  <Link href={PATHS.myCases}>Ke Case Saya</Link>
                </Button>
              )
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {cases.map((item, index) => (
              <Reveal key={item.id} as="li" offset={12} delay={Math.min(index * 0.04, 0.3)}>
                <CaseCard item={item} isRecommended={userFields.includes(item.fieldKey)} />
              </Reveal>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
