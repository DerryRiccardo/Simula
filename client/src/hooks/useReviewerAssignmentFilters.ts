'use client';

import { parseOption } from '@/lib/parseOption';
import type { IAdminPartnerCase, IAdminReviewer } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

export type TAssignmentFilter = 'all' | 'assigned' | 'unassigned';
type TAssignmentSort = 'title' | 'pending' | 'uncovered';

export const ASSIGNMENT_SORT_OPTIONS: { value: TAssignmentSort; label: string }[] = [
  { value: 'title', label: 'Judul A-Z' },
  { value: 'pending', label: 'Antrean terbanyak' },
  { value: 'uncovered', label: 'Reviewer paling sedikit' },
];

export const ASSIGNMENT_STATUS_OPTIONS = [
  { value: 'all', label: 'Semua status' },
  { value: 'published', label: 'Terbit' },
  { value: 'draft', label: 'Draft' },
];

const FILTER_OPTIONS: { value: TAssignmentFilter }[] = [
  { value: 'all' },
  { value: 'assigned' },
  { value: 'unassigned' },
];

const COMPARATOR: Record<TAssignmentSort, (a: IAdminPartnerCase, b: IAdminPartnerCase) => number> =
  {
    title: (a, b) => a.title.localeCompare(b.title, 'id'),
    pending: (a, b) => b.pendingReviewCount - a.pendingReviewCount,
    uncovered: (a, b) => a.activeReviewerCount - b.activeReviewerCount,
  };

/** Halaman penugasan reviewer: B2B case milik mitranya, disaring di klien dan disimpan di URL. */
export function useReviewerAssignmentFilters(
  reviewer: IAdminReviewer | undefined,
  cases: IAdminPartnerCase[]
) {
  const { searchParams, setParams } = useUrlParams();
  const filter = parseOption(FILTER_OPTIONS, searchParams.get('filter'), 'all');
  const status = parseOption(ASSIGNMENT_STATUS_OPTIONS, searchParams.get('status'), 'all');
  const sort = parseOption(ASSIGNMENT_SORT_OPTIONS, searchParams.get('sort'), 'title');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);
  const search = urlSearch.trim().toLowerCase();

  const isAssigned = (item: IAdminPartnerCase) => !!reviewer?.caseIds.includes(item.id);
  const base = cases.filter(
    (item) =>
      item.partnerId === reviewer?.partnerId &&
      (status === 'all' || item.status === status) &&
      (!search || item.title.toLowerCase().includes(search))
  );
  const matches: Record<TAssignmentFilter, (item: IAdminPartnerCase) => boolean> = {
    all: () => true,
    assigned: isAssigned,
    unassigned: (item) => !isAssigned(item),
  };

  return {
    filter,
    filterCounts: {
      all: base.length,
      assigned: base.filter(matches.assigned).length,
      unassigned: base.filter(matches.unassigned).length,
    },
    setFilter: (value: TAssignmentFilter) => setParams({ filter: value === 'all' ? null : value }),
    status,
    setStatus: (value: string) => setParams({ status: value === 'all' ? null : value }),
    sort,
    setSort: (value: TAssignmentSort) => setParams({ sort: value === 'title' ? null : value }),
    searchInput,
    setSearchInput,
    items: base.filter(matches[filter]).sort(COMPARATOR[sort]),
    isAssigned,
    hasFilters: search !== '' || status !== 'all' || filter !== 'all',
    resetFilters: () => {
      clearSearch();
      setParams({ search: null, status: null, filter: null });
    },
  };
}
