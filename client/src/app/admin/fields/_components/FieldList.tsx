import { ArrowDown, ArrowUp, Pencil, Power, PowerOff, Shapes } from 'lucide-react';

import { Button } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { cn } from '@/lib/utils';
import type { IAdminField } from '@/types';

interface FieldListProps {
  fields: IAdminField[];
  /** Bidang yang sedang dipindahkan; tombol urutannya dinonaktifkan sementara. */
  movingKey: string | null;
  onMove: (field: IAdminField, direction: -1 | 1) => void;
  onEdit: (field: IAdminField) => void;
  onToggleActive: (field: IAdminField) => void;
}

// Daftar bidang sesuai urutan tampil. Bidang tanpa case disorot: cakupan bidang dibuat luas
// sejak awal, idealnya 1-2 case unggulan per bidang (CONTEXT.md bagian 2).
export function FieldList({ fields, movingKey, onMove, onEdit, onToggleActive }: FieldListProps) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      {fields.map((field, index) => {
        const Icon = FIELD_BY_KEY[field.key]?.icon ?? Shapes;
        const isMoving = movingKey === field.key;
        return (
          <li
            key={field.key}
            className={cn(
              'grid gap-4 px-4 py-3.5 sm:px-5 lg:grid-cols-[auto_minmax(0,1fr)_12rem_auto] lg:items-center lg:gap-5',
              !field.isActive && 'bg-surface-soft/50'
            )}
          >
            <div className="flex items-center gap-3 lg:contents">
              <div className="flex shrink-0 flex-col" aria-label={`Urutan ${field.label}`}>
                <button
                  type="button"
                  onClick={() => onMove(field, -1)}
                  disabled={index === 0 || isMoving}
                  aria-label={`Naikkan ${field.label}`}
                  className="grid size-6 place-items-center rounded-tag text-ink-subtle transition-colors outline-none hover:bg-surface-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMove(field, 1)}
                  disabled={index === fields.length - 1 || isMoving}
                  aria-label={`Turunkan ${field.label}`}
                  className="grid size-6 place-items-center rounded-tag text-ink-subtle transition-colors outline-none hover:bg-surface-soft hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 disabled:pointer-events-none disabled:opacity-30"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-3.5">
                <span
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-control',
                    field.isActive ? 'bg-brand-soft text-brand' : 'bg-line text-ink-subtle'
                  )}
                  aria-hidden="true"
                >
                  <Icon className="size-[1.0625rem]" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="text-sm font-semibold text-ink">{field.label}</p>
                    <span className="font-mono text-[0.6875rem] text-ink-subtle">{field.key}</span>
                    {!field.isActive && (
                      <span className="rounded-tag bg-white px-1.5 py-px text-[0.6875rem] font-medium text-ink-muted ring-1 ring-line ring-inset">
                        Nonaktif
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-[0.8125rem] text-ink-muted">
                    {field.description}
                  </p>
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-4 pl-9 lg:pl-0">
              <div>
                <dt className="text-xs text-ink-subtle">Case</dt>
                <dd
                  className={cn(
                    'mt-0.5 font-mono text-sm tabular-nums',
                    field.caseCount === 0 && field.isActive
                      ? 'font-semibold text-brand'
                      : 'text-ink'
                  )}
                >
                  {field.caseCount === 0 ? 'Belum ada' : field.caseCount}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-subtle">Member</dt>
                <dd className="mt-0.5 font-mono text-sm text-ink tabular-nums">
                  {field.memberCount}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 pl-9 lg:justify-end lg:pl-0">
              <Button variant="outline" size="pill" onClick={() => onEdit(field)}>
                <Pencil className="size-3.5" />
                Ubah
                <span className="sr-only"> {field.label}</span>
              </Button>
              <Button variant="ghost" size="pill" onClick={() => onToggleActive(field)}>
                {field.isActive ? (
                  <PowerOff className="size-3.5" />
                ) : (
                  <Power className="size-3.5" />
                )}
                {field.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                <span className="sr-only"> {field.label}</span>
              </Button>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
