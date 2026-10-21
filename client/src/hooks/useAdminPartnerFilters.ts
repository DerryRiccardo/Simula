'use client';

import { parseOption } from '@/lib/parseOption';
import type { IAdminPartnerDirectory, IAdminReviewer } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

export type TPartnerTab = 'partners' | 'reviewers';
type TReviewerSort = 'name' | 'pending' | 'speed';
type TReviewerStatus = 'all' | 'active' | 'inactive';

export const ADMIN_PARTNER_ALL = 'all';

const TAB_OPTIONS: { value: TPartnerTab }[] = [{ value: 'partners' }, { value: 'reviewers' }];

export const REVIEWER_SORT_OPTIONS: { value: TReviewerSort; label: string }[] = [
  { value: 'name', label: 'Nama A-Z' },
  { value: 'pending', label: 'Antrean terbanyak' },
  { value: 'speed', label: 'Review tercepat' },
];

export const REVIEWER_STATUS_OPTIONS: { value: TReviewerStatus; label: string }[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
];

const COMPARATOR: Record<TReviewerSort, (a: IAdminReviewer, b: IAdminReviewer) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, 'id'),
  pending: (a, b) => b.pendingCount - a.pendingCount,
  // Belum pernah memutuskan ditaruh di bawah.
  speed: (a, b) => (a.averageReviewDays ?? 99) - (b.averageReviewDays ?? 99),
};

/** Tab, mitra, status, pencarian, dan urutan di menu Reviewer & Mitra, disimpan di URL. */
export function useAdminPartnerFilters(directory: IAdminPartnerDirectory | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const tab = parseOption(TAB_OPTIONS, searchParams.get('tab'), 'partners');
  const partnerOptions = [
    { value: ADMIN_PARTNER_ALL, label: 'Semua mitra' },
    ...(directory?.partners ?? []).map((partner) => ({ value: partner.id, label: partner.name })),
  ];
  const partnerId = parseOption(partnerOptions, searchParams.get('partner'), ADMIN_PARTNER_ALL);
  const status = parseOption(REVIEWER_STATUS_OPTIONS, searchParams.get('status'), 'all');
  const sort = parseOption(REVIEWER_SORT_OPTIONS, searchParams.get('sort'), 'name');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);
  const search = urlSearch.trim().toLowerCase();

  const reviewers = (directory?.reviewers ?? [])
    .filter(
      (reviewer) =>
        (partnerId === ADMIN_PARTNER_ALL || reviewer.partnerId === partnerId) &&
        (status === 'all' || reviewer.isActive === (status === 'active')) &&
        (!search ||
          reviewer.name.toLowerCase().includes(search) ||
          reviewer.email.toLowerCase().includes(search) ||
          reviewer.jobTitle.toLowerCase().includes(search))
    )
    .sort(COMPARATOR[sort]);

  const partners = directory?.partners ?? [];

  return {
    tab,
    setTab: (value: TPartnerTab) =>
      setParams({ tab: value === 'partners' ? null : value, search: null }),
    /** Dari baris mitra: buka tab reviewer yang sudah difilter ke mitra itu. */
    showPartnerReviewers: (id: string) =>
      setParams({ tab: 'reviewers', partner: id, search: null, status: null }),
    partnerId,
    partnerOptions,
    setPartnerId: (value: string) =>
      setParams({ partner: value === ADMIN_PARTNER_ALL ? null : value }),
    status,
    setStatus: (value: string) => setParams({ status: value === 'all' ? null : value }),
    sort,
    setSort: (value: TReviewerSort) => setParams({ sort: value === 'name' ? null : value }),
    searchInput,
    setSearchInput,
    partners,
    reviewers,
    /** Hanya tab reviewer yang punya pencarian dan filter. */
    hasFilters:
      tab === 'reviewers' && (search !== '' || partnerId !== ADMIN_PARTNER_ALL || status !== 'all'),
    resetFilters: () => {
      clearSearch();
      setParams({ search: null, partner: null, status: null });
    },
  };
}
