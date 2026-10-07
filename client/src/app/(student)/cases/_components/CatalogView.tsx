'use client';

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
import { FIELD_BY_KEY, FIELD_FILTER_OPTIONS } from '@/constants/fields';
import { useCurrentUser } from '@/hooks/useAuth';
import { useCaseCatalog } from '@/hooks/useLearning';
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

// Satu kalimat penjelas per tab, agar beda kedua produk terbaca tanpa membuka halaman lain.
const TIER_NOTE: Record<TTierFilter, string> = {
  all: 'Mulai gratis di AI Case Study, lalu validasi kompetensimu lewat B2B Case Study.',
  ai: 'Gratis. Dinilai AI dalam hitungan menit, lengkap dengan feedback per kriteria.',
  b2b: 'Brief nyata dari perusahaan mitra, direview langsung oleh praktisinya.',
};

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
  const { user } = useCurrentUser();
  const { searchParams, setParams } = useUrlParams();
  const tier = parseOption(TIER_TABS, searchParams.get('tier'), 'all');
  const field = parseOption(FIELD_FILTER_OPTIONS, searchParams.get('field'), FILTER_ALL);
  const level = parseOption(LEVEL_OPTIONS, searchParams.get('level'), 'all');
  const sort = parseOption(SORT_OPTIONS, searchParams.get('sort'), 'relevance');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);

  const { data, isLoading, isError, refetch } = useCaseCatalog({
    tier: tier === 'all' ? undefined : tier,
    field: field === FILTER_ALL ? undefined : field,
    level: level === 'all' ? undefined : level,
    sort,
    search: urlSearch || undefined,
    limit: 24,
  });

  const cases = data?.data ?? [];
  const userFields = user?.fieldKeys ?? [];
  const userFieldLabels = userFields.flatMap((key) => FIELD_BY_KEY[key]?.label ?? []);
  const hasFilters = tier !== 'all' || field !== FILTER_ALL || level !== 'all' || urlSearch !== '';

  const filterSections: IFilterSection[] = [
    {
      id: 'field',
      label: 'Bidang',
      options: FIELD_FILTER_OPTIONS,
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <FilterTabs
            ariaLabel="Jenis case"
            options={TIER_TABS}
            value={tier}
            onChange={(value) => setParams({ tier: value === 'all' ? null : value })}
          />
          <p className="text-sm text-ink-muted lg:text-right">{TIER_NOTE[tier]}</p>
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
            <span className="font-mono text-ink tabular-nums">{data.metadata.totalItems}</span> case
            {sort === 'relevance' && userFieldLabels.length > 0 && (
              <>, bidang {userFieldLabels.join(' dan ')} ditampilkan lebih dulu</>
            )}
          </p>
        )}

        {isLoading ? (
          <CardGridSkeleton />
        ) : isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : cases.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title="Case tidak ditemukan"
            description="Coba kata kunci lain, atau longgarkan filter bidang dan level."
            action={
              hasFilters && (
                <Button variant="outline" size="pill" onClick={resetAll}>
                  Hapus semua filter
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
