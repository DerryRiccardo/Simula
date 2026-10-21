'use client';

import { parseOption } from '@/lib/parseOption';
import type { IAdminReviewItem, TTier } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

export type TAdminReviewTier = TTier | 'all';
export type TAdminReviewFilter =
  'all' | 'waiting' | 'revision_requested' | 'passed' | 'failed' | 'flagged';
type TAdminReviewSort = 'newest' | 'due' | 'score_high' | 'score_low';

const TIER_OPTIONS: { value: TAdminReviewTier }[] = [
  { value: 'all' },
  { value: 'ai' },
  { value: 'b2b' },
];

/** "Belum dinilai" berarti sedang dinilai AI atau menunggu reviewer, tergantung tier. */
const WAITING_LABEL: Record<TAdminReviewTier, string> = {
  all: 'Belum dinilai',
  ai: 'Sedang dinilai',
  b2b: 'Menunggu review',
};

const FILTER_MATCH: Record<TAdminReviewFilter, (item: IAdminReviewItem) => boolean> = {
  all: () => true,
  waiting: (item) => item.status === 'ai_grading' || item.status === 'in_review',
  revision_requested: (item) => item.status === 'revision_requested',
  passed: (item) => item.status === 'passed',
  failed: (item) => item.status === 'failed',
  flagged: (item) => item.isFlagged,
};

/** Revisi hanya ada di B2B; tanda bermasalah hanya untuk evaluasi penilaian AI. */
function getFilterOptions(tier: TAdminReviewTier) {
  const options: { value: TAdminReviewFilter; label: string }[] = [
    { value: 'all', label: 'Semua' },
    { value: 'waiting', label: WAITING_LABEL[tier] },
  ];
  if (tier !== 'ai') options.push({ value: 'revision_requested', label: 'Perlu revisi' });
  options.push({ value: 'passed', label: 'Lulus' }, { value: 'failed', label: 'Belum lulus' });
  if (tier !== 'b2b') options.push({ value: 'flagged', label: 'Ditandai' });
  return options;
}

export const ADMIN_REVIEW_SORT_OPTIONS: { value: TAdminReviewSort; label: string }[] = [
  { value: 'newest', label: 'Dikirim terbaru' },
  { value: 'due', label: 'Tenggat SLA terdekat' },
  { value: 'score_high', label: 'Skor tertinggi' },
  { value: 'score_low', label: 'Skor terendah' },
];

const COMPARATOR: Record<TAdminReviewSort, (a: IAdminReviewItem, b: IAdminReviewItem) => number> = {
  newest: (a, b) => b.submittedAt.localeCompare(a.submittedAt),
  // Yang tidak punya tenggat SLA (AI, sudah dinilai) di bagian bawah.
  due: (a, b) => (a.reviewDueAt ?? '9999').localeCompare(b.reviewDueAt ?? '9999'),
  score_high: (a, b) => (b.score ?? -1) - (a.score ?? -1),
  score_low: (a, b) => (a.score ?? 101) - (b.score ?? 101),
};

export const ADMIN_REVIEW_ALL_CASES = 'all';

/**
 * Tier (sub-menu sidebar), status, case, pencarian, dan urutan di menu Penilaian, disimpan di URL.
 * Disaring di klien; di produksi parameter yang sama dikirim ke GET /admin/reviews.
 */
export function useAdminReviewFilters(items: IAdminReviewItem[] | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const tier = parseOption(TIER_OPTIONS, searchParams.get('tier'), 'all');
  const filterOptions = getFilterOptions(tier);
  const filter = parseOption(filterOptions, searchParams.get('status'), 'all');
  const sort = parseOption(ADMIN_REVIEW_SORT_OPTIONS, searchParams.get('sort'), 'newest');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);

  // Tanpa useMemo manual: React Compiler sudah memoisasi turunan ini.
  const tierItems = (items ?? []).filter((item) => tier === 'all' || item.tier === tier);

  const caseTitles = new Map(tierItems.map((item) => [item.caseId, item.caseTitle]));
  const caseOptions = [
    { value: ADMIN_REVIEW_ALL_CASES, label: 'Semua case' },
    ...[...caseTitles]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id')),
  ];
  const caseId = parseOption(caseOptions, searchParams.get('case'), ADMIN_REVIEW_ALL_CASES);

  // Filter selain status, dipakai untuk angka di tab status.
  const search = urlSearch.trim().toLowerCase();
  const base = tierItems.filter(
    (item) =>
      (caseId === ADMIN_REVIEW_ALL_CASES || item.caseId === caseId) &&
      (!search ||
        item.memberName.toLowerCase().includes(search) ||
        item.memberEmail.toLowerCase().includes(search) ||
        item.caseTitle.toLowerCase().includes(search))
  );

  return {
    tier,
    tierItems,
    filter,
    filterOptions: filterOptions.map((option) => ({
      ...option,
      count: base.filter(FILTER_MATCH[option.value]).length,
    })),
    setFilter: (value: TAdminReviewFilter) => setParams({ status: value === 'all' ? null : value }),
    caseId,
    caseOptions,
    setCaseId: (value: string) =>
      setParams({ case: value === ADMIN_REVIEW_ALL_CASES ? null : value }),
    sort,
    setSort: (value: TAdminReviewSort) => setParams({ sort: value === 'newest' ? null : value }),
    searchInput,
    setSearchInput,
    items: base.filter(FILTER_MATCH[filter]).sort(COMPARATOR[sort]),
    hasFilters: caseId !== ADMIN_REVIEW_ALL_CASES || urlSearch !== '' || filter !== 'all',
    resetFilters: () => {
      clearSearch();
      setParams({ case: null, search: null, status: null });
    },
  };
}
