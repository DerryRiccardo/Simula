'use client';

import { useMemo } from 'react';

import { QUEUE_SORT_OPTIONS, type TQueueSort, type TQueueTab } from '@/constants/review';
import { parseOption } from '@/lib/parseOption';
import type { IReviewerQueue, IReviewQueueItem } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

type TQueueComparator = (a: IReviewQueueItem, b: IReviewQueueItem) => number;

const QUEUE_COMPARATOR: Record<TQueueSort, TQueueComparator> = {
  due: (a, b) => a.reviewDueAt.localeCompare(b.reviewDueAt),
  newest: (a, b) => b.submittedAt.localeCompare(a.submittedAt),
  oldest: (a, b) => a.submittedAt.localeCompare(b.submittedAt),
  decided: (a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''),
  score_high: (a, b) => (b.score ?? -1) - (a.score ?? -1),
  score_low: (a, b) => (a.score ?? 101) - (b.score ?? 101),
};

export const FILTER_ALL_CASES = 'all';

/**
 * Tab, filter case, pencarian, dan urutan antrean, disimpan di URL agar bisa dibagikan.
 * Disaring di klien: antrean satu reviewer kecil dan sudah dibatasi case yang ditugaskan.
 */
export function useQueueFilters(queue: IReviewerQueue | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const tab: TQueueTab = searchParams.get('tab') === 'history' ? 'history' : 'pending';
  const sortOptions = QUEUE_SORT_OPTIONS[tab];
  const sort = parseOption(sortOptions, searchParams.get('sort'), sortOptions[0].value);
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);

  // Opsi case dari semua submission (antrean dan riwayat), urut judul.
  const caseOptions = useMemo(() => {
    const cases = new Map<string, string>();
    [...(queue?.pending ?? []), ...(queue?.history ?? [])].forEach((item) =>
      cases.set(item.caseSummary.id, item.caseSummary.title)
    );
    return [
      { value: FILTER_ALL_CASES, label: 'Semua case' },
      ...[...cases]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label, 'id')),
    ];
  }, [queue]);
  const caseId = parseOption(caseOptions, searchParams.get('case'), FILTER_ALL_CASES);

  const filtered = useMemo(() => {
    const search = urlSearch.trim().toLowerCase();
    const matches = (item: IReviewQueueItem) =>
      (caseId === FILTER_ALL_CASES || item.caseSummary.id === caseId) &&
      (!search ||
        item.candidateLabel.toLowerCase().includes(search) ||
        item.caseSummary.title.toLowerCase().includes(search));
    return {
      pending: (queue?.pending ?? []).filter(matches),
      history: (queue?.history ?? []).filter(matches),
    };
  }, [queue, caseId, urlSearch]);

  return {
    tab,
    setTab: (value: TQueueTab) =>
      setParams({ tab: value === 'pending' ? null : value, sort: null }),
    sort,
    sortOptions,
    setSort: (value: TQueueSort) =>
      setParams({ sort: value === sortOptions[0].value ? null : value }),
    caseId,
    caseOptions,
    setCaseId: (value: string) => setParams({ case: value === FILTER_ALL_CASES ? null : value }),
    searchInput,
    setSearchInput,
    counts: { pending: filtered.pending.length, history: filtered.history.length },
    items: [...filtered[tab]].sort(QUEUE_COMPARATOR[sort]),
    hasFilters: caseId !== FILTER_ALL_CASES || urlSearch !== '',
    resetFilters: () => {
      clearSearch();
      setParams({ case: null, search: null });
    },
  };
}
