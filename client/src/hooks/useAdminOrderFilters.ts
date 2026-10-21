'use client';

import { subDays } from 'date-fns';

import { PAYMENT_METHODS } from '@/constants/payment';
import { parseOption } from '@/lib/parseOption';
import type { IAdminOrder, TOrderStatus } from '@/types';
import { useUrlParams } from './useUrlParams';
import { useUrlSearch } from './useUrlSearch';

type TOrderTab = TOrderStatus | 'all';
type TOrderPeriod = '7' | '30' | '90' | 'all';
type TOrderSort = 'newest' | 'oldest' | 'total_high';

export const ORDER_STATUS_TABS: { value: TOrderTab; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'paid', label: 'Berhasil' },
  { value: 'awaiting_payment', label: 'Menunggu' },
  { value: 'failed', label: 'Gagal' },
  { value: 'expired', label: 'Kedaluwarsa' },
];

export const ORDER_PERIOD_OPTIONS: { value: TOrderPeriod; label: string }[] = [
  { value: '7', label: '7 hari' },
  { value: '30', label: '30 hari' },
  { value: '90', label: '90 hari' },
  { value: 'all', label: 'Semua waktu' },
];

export const ORDER_METHOD_OPTIONS = [
  { value: 'all', label: 'Semua metode' },
  ...PAYMENT_METHODS.map((method) => ({ value: method.value, label: method.label })),
];

export const ORDER_SORT_OPTIONS: { value: TOrderSort; label: string }[] = [
  { value: 'newest', label: 'Terbaru' },
  { value: 'oldest', label: 'Terlama' },
  { value: 'total_high', label: 'Nominal terbesar' },
];

const COMPARATOR: Record<TOrderSort, (a: IAdminOrder, b: IAdminOrder) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt),
  total_high: (a, b) => b.total - a.total,
};

/**
 * Status, periode, metode, pencarian, dan urutan daftar order, disimpan di URL.
 * Ringkasan pendapatan mengikuti periode dan filter yang sama dengan tabel.
 */
export function useAdminOrderFilters(orders: IAdminOrder[] | undefined) {
  const { searchParams, setParams } = useUrlParams();
  const tab = parseOption(ORDER_STATUS_TABS, searchParams.get('status'), 'all');
  const period = parseOption(ORDER_PERIOD_OPTIONS, searchParams.get('period'), '30');
  const method = parseOption(ORDER_METHOD_OPTIONS, searchParams.get('method'), 'all');
  const sort = parseOption(ORDER_SORT_OPTIONS, searchParams.get('sort'), 'newest');
  const urlSearch = searchParams.get('search') ?? '';
  const { searchInput, setSearchInput, clearSearch } = useUrlSearch(urlSearch, setParams);
  const search = urlSearch.trim().toLowerCase();
  const since = period === 'all' ? '' : subDays(new Date(), Number(period)).toISOString();

  // Filter selain status, dipakai untuk angka di tab dan ringkasan.
  const base = (orders ?? []).filter(
    (order) =>
      order.createdAt >= since &&
      (method === 'all' || order.method === method) &&
      (!search ||
        order.invoiceNumber.toLowerCase().includes(search) ||
        order.memberName.toLowerCase().includes(search) ||
        order.memberEmail.toLowerCase().includes(search) ||
        order.caseTitle.toLowerCase().includes(search))
  );
  const countOf = (status: TOrderTab) =>
    status === 'all' ? base.length : base.filter((order) => order.status === status).length;
  const paid = base.filter((order) => order.status === 'paid');

  return {
    tab,
    tabOptions: ORDER_STATUS_TABS.map((option) => ({ ...option, count: countOf(option.value) })),
    setTab: (value: TOrderTab) => setParams({ status: value === 'all' ? null : value }),
    period,
    setPeriod: (value: string) => setParams({ period: value === '30' ? null : value }),
    method,
    setMethod: (value: string) => setParams({ method: value === 'all' ? null : value }),
    sort,
    setSort: (value: TOrderSort) => setParams({ sort: value === 'newest' ? null : value }),
    searchInput,
    setSearchInput,
    summary: {
      revenue: paid.reduce((total, order) => total + order.total, 0),
      paidCount: paid.length,
      awaitingCount: countOf('awaiting_payment'),
      unpaidCount: countOf('failed') + countOf('expired'),
      /** Persentase order berhasil dari order yang sudah final (berhasil, gagal, kedaluwarsa). */
      successRate: (() => {
        const settled = paid.length + countOf('failed') + countOf('expired');
        return settled > 0 ? Math.round((paid.length / settled) * 100) : null;
      })(),
    },
    items: base.filter((order) => tab === 'all' || order.status === tab).sort(COMPARATOR[sort]),
    hasFilters: search !== '' || method !== 'all' || tab !== 'all' || period !== '30',
    resetFilters: () => {
      clearSearch();
      setParams({ search: null, method: null, status: null, period: null });
    },
  };
}
