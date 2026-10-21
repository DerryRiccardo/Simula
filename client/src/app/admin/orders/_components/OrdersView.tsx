'use client';

import { useState } from 'react';
import { Receipt, SearchX } from 'lucide-react';

import { EmptyState, ErrorState, Skeleton } from '@/components';
import { FilterTabs, PageHeading, SearchToolbar } from '@/components/student';
import { Button } from '@/components/ui';
import { useAdminOrders } from '@/hooks/useAdmin';
import {
  ORDER_METHOD_OPTIONS,
  ORDER_PERIOD_OPTIONS,
  ORDER_SORT_OPTIONS,
  useAdminOrderFilters,
} from '@/hooks/useAdminOrderFilters';
import { formatCompactPrice, formatNumber, formatPrice } from '@/lib/formatters';
import type { IAdminOrder } from '@/types';
import { OrderSheet } from './OrderSheet';
import { OrderTable } from './OrderTable';

type TOrderSummary = ReturnType<typeof useAdminOrderFilters>['summary'];

function OrderStats({ summary }: { summary: TOrderSummary }) {
  const stats = [
    {
      label: 'Pendapatan',
      value: formatCompactPrice(summary.revenue),
      fullValue: formatPrice(summary.revenue),
    },
    { label: 'Order berhasil', value: formatNumber(summary.paidCount) },
    { label: 'Menunggu pembayaran', value: formatNumber(summary.awaitingCount) },
    {
      label: 'Tingkat keberhasilan',
      value: summary.successRate === null ? '-' : `${summary.successRate}%`,
      hint: `${summary.unpaidCount} gagal atau kedaluwarsa`,
    },
  ];
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 bg-white px-5 py-4">
          <dt className="text-xs text-ink-subtle">{stat.label}</dt>
          <dd
            title={stat.fullValue}
            className="mt-1 truncate text-[1.75rem] leading-none font-semibold tracking-[-0.03em] text-ink tabular-nums"
          >
            <span aria-hidden={stat.fullValue ? true : undefined}>{stat.value}</span>
            {stat.fullValue && <span className="sr-only">{stat.fullValue}</span>}
          </dd>
          {stat.hint && <dd className="mt-1.5 truncate text-xs text-ink-subtle">{stat.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

function OrdersSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Memuat">
      <Skeleton className="h-[5.25rem] rounded-card" />
      <Skeleton className="h-9 w-96 max-w-full" />
      <Skeleton className="h-96 rounded-card" />
    </div>
  );
}

// Order (CONTEXT.md 4.13): transaksi B2B dari payment gateway. Admin hanya memantau.
export function OrdersView() {
  const { data: orders, isLoading, isError, refetch } = useAdminOrders();
  const filters = useAdminOrderFilters(orders);
  // Order terpilih disimpan terpisah agar isi panel tidak hilang selama animasi menutup.
  const [selected, setSelected] = useState<IAdminOrder | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const handleSelect = (order: IAdminOrder) => {
    setSelected(order);
    setIsSheetOpen(true);
  };

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title="Order"
        description="Transaksi B2B Case Study dari payment gateway. Status mengikuti notifikasi gateway; admin hanya memantau."
        action={
          <FilterTabs
            ariaLabel="Periode"
            options={ORDER_PERIOD_OPTIONS}
            value={filters.period}
            onChange={filters.setPeriod}
          />
        }
      />

      {isLoading ? (
        <OrdersSkeleton />
      ) : isError || !orders ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <>
          <OrderStats summary={filters.summary} />

          <section aria-label="Daftar order" className="grid gap-4">
            <FilterTabs
              ariaLabel="Status order"
              options={filters.tabOptions}
              value={filters.tab}
              onChange={filters.setTab}
              className="w-fit"
            />
            <SearchToolbar
              search={filters.searchInput}
              onSearchChange={filters.setSearchInput}
              searchPlaceholder="Cari invoice, member, atau case"
              sortOptions={ORDER_SORT_OPTIONS}
              sort={filters.sort}
              onSortChange={filters.setSort}
              filterSections={[
                {
                  id: 'method',
                  label: 'Metode bayar',
                  options: ORDER_METHOD_OPTIONS,
                  value: filters.method,
                  onChange: filters.setMethod,
                },
              ]}
              onResetFilters={() => filters.setMethod('all')}
            />

            {filters.items.length > 0 ? (
              <OrderTable items={filters.items} onSelect={handleSelect} />
            ) : filters.hasFilters ? (
              <EmptyState
                icon={SearchX}
                title="Tidak ada order yang cocok"
                description="Coba kata kunci lain, perluas periode, atau tampilkan semua status."
                action={
                  <Button variant="outline" size="pill" onClick={filters.resetFilters}>
                    Hapus filter
                  </Button>
                }
              />
            ) : (
              <EmptyState
                icon={Receipt}
                title="Belum ada order"
                description="Order muncul di sini begitu peserta checkout B2B case."
              />
            )}
          </section>

          <OrderSheet order={selected} isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
        </>
      )}
    </div>
  );
}
