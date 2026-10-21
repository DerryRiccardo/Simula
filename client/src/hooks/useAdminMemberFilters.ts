'use client';

import { FIELD_FILTER_OPTIONS } from '@/constants/fields';
import { parseOption } from '@/lib/parseOption';
import type { IAdminMemberSummary } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

export type TMemberActivity = 'all' | 'active' | 'certified' | 'idle';
type TMemberSort = 'joined' | 'active' | 'name' | 'spent';

const ACTIVITY_MATCH: Record<TMemberActivity, (member: IAdminMemberSummary) => boolean> = {
  all: () => true,
  active: (member) => member.activeCaseCount > 0,
  certified: (member) => member.certificateCount > 0,
  idle: (member) => member.aiCaseCount + member.b2bCaseCount === 0,
};

export const MEMBER_ACTIVITY_OPTIONS: { value: TMemberActivity; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Sedang mengerjakan' },
  { value: 'certified', label: 'Punya sertifikat' },
  { value: 'idle', label: 'Belum mulai' },
];

export const MEMBER_SORT_OPTIONS: { value: TMemberSort; label: string }[] = [
  { value: 'joined', label: 'Baru bergabung' },
  { value: 'active', label: 'Aktivitas terbaru' },
  { value: 'name', label: 'Nama A-Z' },
  { value: 'spent', label: 'Pembelian terbanyak' },
];

const COMPARATOR: Record<TMemberSort, (a: IAdminMemberSummary, b: IAdminMemberSummary) => number> =
  {
    joined: (a, b) => b.joinedAt.localeCompare(a.joinedAt),
    active: (a, b) => (b.lastActiveAt ?? '').localeCompare(a.lastActiveAt ?? ''),
    name: (a, b) => a.name.localeCompare(b.name, 'id'),
    spent: (a, b) => b.totalSpent - a.totalSpent,
  };

/** Aktivitas, bidang, pencarian, dan urutan daftar member, disimpan di URL. */
export function useAdminMemberFilters(members: IAdminMemberSummary[] | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const activity = parseOption(MEMBER_ACTIVITY_OPTIONS, searchParams.get('activity'), 'all');
  const field = parseOption(FIELD_FILTER_OPTIONS, searchParams.get('field'), 'all');
  const sort = parseOption(MEMBER_SORT_OPTIONS, searchParams.get('sort'), 'joined');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);
  const search = urlSearch.trim().toLowerCase();

  // Filter selain aktivitas, dipakai untuk angka di tab aktivitas.
  const base = (members ?? []).filter(
    (member) =>
      (field === 'all' || member.fieldKeys.includes(field)) &&
      (!search ||
        member.name.toLowerCase().includes(search) ||
        member.email.toLowerCase().includes(search) ||
        (member.major ?? '').toLowerCase().includes(search))
  );

  return {
    activity,
    activityOptions: MEMBER_ACTIVITY_OPTIONS.map((option) => ({
      ...option,
      count: base.filter(ACTIVITY_MATCH[option.value]).length,
    })),
    setActivity: (value: TMemberActivity) =>
      setParams({ activity: value === 'all' ? null : value }),
    field,
    setField: (value: string) => setParams({ field: value === 'all' ? null : value }),
    sort,
    setSort: (value: TMemberSort) => setParams({ sort: value === 'joined' ? null : value }),
    searchInput,
    setSearchInput,
    items: base.filter(ACTIVITY_MATCH[activity]).sort(COMPARATOR[sort]),
    hasFilters: search !== '' || field !== 'all' || activity !== 'all',
    resetFilters: () => {
      clearSearch();
      setParams({ search: null, field: null, activity: null });
    },
  };
}
