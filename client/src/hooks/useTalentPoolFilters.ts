'use client';

import { parseOption } from '@/lib/parseOption';
import type { ITalentCandidate } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

/** Tahap kandidat di talent pool, diturunkan dari persetujuan peserta dan aksi admin. */
export type TTalentStage = 'ready' | 'pending' | 'shared' | 'declined';
type TTalentTab = TTalentStage | 'all';
type TTalentSort = 'newest' | 'score';

export const getTalentStage = (candidate: ITalentCandidate): TTalentStage => {
  if (candidate.sharedAt) return 'shared';
  if (candidate.consent === 'granted') return 'ready';
  return candidate.consent;
};

export const TALENT_TABS: { value: TTalentTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'ready', label: 'Siap diteruskan' },
  { value: 'pending', label: 'Menunggu persetujuan' },
  { value: 'shared', label: 'Sudah diteruskan' },
  { value: 'declined', label: 'Tidak dibagikan' },
];

export const TALENT_SORT_OPTIONS: { value: TTalentSort; label: string }[] = [
  { value: 'newest', label: 'Rekomendasi terbaru' },
  { value: 'score', label: 'Skor tertinggi' },
];

const COMPARATOR: Record<TTalentSort, (a: ITalentCandidate, b: ITalentCandidate) => number> = {
  newest: (a, b) => b.recommendedAt.localeCompare(a.recommendedAt),
  score: (a, b) => b.score - a.score,
};

export const TALENT_ALL_PARTNERS = 'all';

/** Tahap, mitra, pencarian, dan urutan talent pool, disimpan di URL. */
export function useTalentPoolFilters(candidates: ITalentCandidate[] | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const tab = parseOption(TALENT_TABS, searchParams.get('stage'), 'all');
  const sort = parseOption(TALENT_SORT_OPTIONS, searchParams.get('sort'), 'newest');
  const partnerOptions = [
    { value: TALENT_ALL_PARTNERS, label: 'Semua mitra' },
    ...[
      ...new Map(
        (candidates ?? []).flatMap((item) =>
          item.partnerId && item.partnerName ? [[item.partnerId, item.partnerName] as const] : []
        )
      ),
    ].map(([value, label]) => ({ value, label })),
  ];
  const partnerId = parseOption(partnerOptions, searchParams.get('partner'), TALENT_ALL_PARTNERS);
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);
  const search = urlSearch.trim().toLowerCase();

  const base = (candidates ?? []).filter(
    (item) =>
      (partnerId === TALENT_ALL_PARTNERS || item.partnerId === partnerId) &&
      (!search ||
        item.memberName.toLowerCase().includes(search) ||
        item.caseTitle.toLowerCase().includes(search))
  );
  const countOf = (value: TTalentTab) =>
    value === 'all' ? base.length : base.filter((item) => getTalentStage(item) === value).length;

  return {
    tab,
    tabOptions: TALENT_TABS.map((option) => ({ ...option, count: countOf(option.value) })),
    setTab: (value: TTalentTab) => setParams({ stage: value === 'all' ? null : value }),
    sort,
    setSort: (value: TTalentSort) => setParams({ sort: value === 'newest' ? null : value }),
    partnerId,
    partnerOptions,
    setPartnerId: (value: string) =>
      setParams({ partner: value === TALENT_ALL_PARTNERS ? null : value }),
    searchInput,
    setSearchInput,
    items: base
      .filter((item) => tab === 'all' || getTalentStage(item) === tab)
      .sort(COMPARATOR[sort]),
    hasFilters: search !== '' || partnerId !== TALENT_ALL_PARTNERS || tab !== 'all',
    resetFilters: () => {
      clearSearch();
      setParams({ search: null, partner: null, stage: null });
    },
  };
}
