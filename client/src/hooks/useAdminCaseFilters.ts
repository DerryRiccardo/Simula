'use client';

import { useMemo } from 'react';

import { parseOption } from '@/lib/parseOption';
import type { IAdminCaseSummary, TAdminCaseStatus, TTier } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

type TAdminCaseSort = 'updated' | 'title' | 'participants';

export const ADMIN_CASE_SORT_OPTIONS: { value: TAdminCaseSort; label: string }[] = [
  { value: 'updated', label: 'Terakhir diubah' },
  { value: 'title', label: 'Judul A-Z' },
  { value: 'participants', label: 'Peserta terbanyak' },
];

export const ADMIN_TIER_OPTIONS: { value: TTier | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua tier' },
  { value: 'ai', label: 'AI Case Study' },
  { value: 'b2b', label: 'B2B Case Study' },
];

export const ADMIN_STATUS_OPTIONS: { value: TAdminCaseStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'published', label: 'Terbit' },
  { value: 'draft', label: 'Draft' },
];

const COMPARATOR: Record<TAdminCaseSort, (a: IAdminCaseSummary, b: IAdminCaseSummary) => number> = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  title: (a, b) => a.title.localeCompare(b.title, 'id'),
  participants: (a, b) => b.participantCount - a.participantCount,
};

/**
 * Status, tier, pencarian, dan urutan daftar case admin, disimpan di URL.
 * Disaring di klien: jumlah case platform masih puluhan.
 */
export function useAdminCaseFilters(cases: IAdminCaseSummary[] | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const status = parseOption(ADMIN_STATUS_OPTIONS, searchParams.get('status'), 'all');
  const tier = parseOption(ADMIN_TIER_OPTIONS, searchParams.get('tier'), 'all');
  const sort = parseOption(ADMIN_CASE_SORT_OPTIONS, searchParams.get('sort'), 'updated');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);

  // Filter selain status, dipakai untuk angka di tab status.
  const base = useMemo(() => {
    const search = urlSearch.trim().toLowerCase();
    return (cases ?? []).filter(
      (item) =>
        (tier === 'all' || item.tier === tier) &&
        (!search ||
          item.title.toLowerCase().includes(search) ||
          (item.partnerName ?? '').toLowerCase().includes(search))
    );
  }, [cases, tier, urlSearch]);

  const items = useMemo(
    () => base.filter((item) => status === 'all' || item.status === status).sort(COMPARATOR[sort]),
    [base, status, sort]
  );

  return {
    items,
    /** Case di tier yang dipilih (tanpa filter lain), untuk angka ringkasan halaman. */
    tierCases: (cases ?? []).filter((item) => tier === 'all' || item.tier === tier),
    status,
    statusCounts: {
      all: base.length,
      published: base.filter((item) => item.status === 'published').length,
      draft: base.filter((item) => item.status === 'draft').length,
    },
    setStatus: (value: TAdminCaseStatus | 'all') =>
      setParams({ status: value === 'all' ? null : value }),
    tier,
    setTier: (value: string) => setParams({ tier: value === 'all' ? null : value }),
    sort,
    setSort: (value: TAdminCaseSort) => setParams({ sort: value === 'updated' ? null : value }),
    searchInput,
    setSearchInput,
    hasFilters: tier !== 'all' || urlSearch !== '' || status !== 'all',
    resetFilters: () => {
      clearSearch();
      setParams({ tier: null, status: null, search: null });
    },
  };
}
