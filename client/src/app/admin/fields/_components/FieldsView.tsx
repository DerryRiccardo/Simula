'use client';

import { useState } from 'react';
import { Info, Plus, Shapes } from 'lucide-react';

import { ConfirmDialog, EmptyState, ErrorState, Skeleton } from '@/components';
import { PageHeading } from '@/components/student';
import { Button } from '@/components/ui';
import { useAdminFields, useMoveField, useSetFieldActive } from '@/hooks/useAdminPlatform';
import { cn } from '@/lib/utils';
import type { IAdminField } from '@/types';
import { FieldFormDialog } from './FieldFormDialog';
import { FieldList } from './FieldList';

function FieldStats({ fields }: { fields: IAdminField[] }) {
  const active = fields.filter((field) => field.isActive);
  const uncovered = active.filter((field) => field.caseCount === 0).length;
  const stats = [
    { label: 'Bidang aktif', value: active.length },
    { label: 'Nonaktif', value: fields.length - active.length },
    { label: 'Aktif tanpa case', value: uncovered, isHighlighted: uncovered > 0 },
  ];
  return (
    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-card border border-line bg-line">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0 bg-white px-4 py-4 sm:px-5">
          <dt className="truncate text-xs text-ink-subtle">{stat.label}</dt>
          <dd
            className={cn(
              'mt-1 text-[1.75rem] leading-none font-semibold tracking-[-0.03em] tabular-nums',
              stat.isHighlighted ? 'text-brand' : 'text-ink'
            )}
          >
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

type TDialog = 'form' | 'status' | null;

// Bidang studi (CONTEXT.md 4.13): data master untuk onboarding, filter katalog, dan pembuat case.
export function FieldsView() {
  const { data: fields, isLoading, isError, refetch } = useAdminFields();
  const move = useMoveField();
  const setActive = useSetFieldActive();
  const [dialog, setDialog] = useState<TDialog>(null);
  // Target disimpan terpisah agar isi dialog tidak berubah selama animasi menutup.
  const [target, setTarget] = useState<IAdminField | null>(null);
  const [movingKey, setMovingKey] = useState<string | null>(null);

  const open = (type: TDialog, field: IAdminField | null) => {
    setTarget(field);
    setDialog(type);
  };

  const handleMove = (field: IAdminField, direction: -1 | 1) => {
    setMovingKey(field.key);
    move.mutate({ key: field.key, direction }, { onSettled: () => setMovingKey(null) });
  };

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8">
      <PageHeading
        title="Bidang studi"
        description="Daftar bidang yang dipilih peserta saat onboarding dan dipakai untuk mengelompokkan case. Urutan di sini adalah urutan tampil."
        action={
          <Button size="pill" onClick={() => open('form', null)} disabled={!fields}>
            <Plus className="size-4" />
            Tambah bidang
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-6" role="status" aria-label="Memuat">
          <Skeleton className="h-[5.25rem] rounded-card" />
          <Skeleton className="h-96 rounded-card" />
        </div>
      ) : isError || !fields ? (
        <ErrorState onRetry={() => refetch()} />
      ) : fields.length === 0 ? (
        <EmptyState
          icon={Shapes}
          title="Belum ada bidang"
          description="Tambahkan bidang pertama agar peserta bisa memilih saat onboarding."
        />
      ) : (
        <>
          <FieldStats fields={fields} />
          <section aria-label="Daftar bidang" className="grid gap-3">
            <FieldList
              fields={fields}
              movingKey={movingKey}
              onMove={handleMove}
              onEdit={(field) => open('form', field)}
              onToggleActive={(field) => open('status', field)}
            />
            <p className="flex gap-2 text-xs leading-relaxed text-ink-subtle">
              <Info className="mt-px size-3.5 shrink-0" />
              Prototype: onboarding dan katalog masih memakai daftar bidang bawaan. Perubahan di
              sini tersimpan dan dipakai begitu backend membaca data bidang.
            </p>
          </section>
        </>
      )}

      <FieldFormDialog
        isOpen={dialog === 'form'}
        onOpenChange={(isOpen) => !isOpen && setDialog(null)}
        field={target}
      />
      <ConfirmDialog
        isOpen={dialog === 'status'}
        onOpenChange={(isOpen) => !isOpen && setDialog(null)}
        title={target?.isActive ? 'Nonaktifkan bidang?' : 'Aktifkan bidang?'}
        description={
          target?.isActive
            ? `${target.label} tidak bisa dipilih lagi untuk case baru dan onboarding. ${target.caseCount} case dan ${target.memberCount} member yang sudah memakainya tetap utuh.`
            : `${target?.label ?? 'Bidang'} kembali bisa dipilih di onboarding dan pembuat case.`
        }
        confirmLabel={target?.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        isPending={setActive.isPending}
        onConfirm={() =>
          target &&
          setActive.mutate(
            { key: target.key, isActive: !target.isActive },
            { onSuccess: () => setDialog(null) }
          )
        }
      />
    </div>
  );
}
