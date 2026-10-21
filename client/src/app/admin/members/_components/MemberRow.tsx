import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { formatDate, formatRelative, getInitials } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { IAdminMemberSummary } from '@/types';

// Kolom tabel di layar lebar; di bawahnya angka turun ke bawah nama.
export const MEMBER_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_9rem_7rem_5.5rem_11rem_3.5rem] lg:items-center lg:gap-5';

/** Bidang yang tampil di baris; sisanya diringkas menjadi "+n". */
const VISIBLE_FIELDS = 2;

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-subtle lg:hidden">{label}</p>
      {children}
    </div>
  );
}

export function MemberRow({ member }: { member: IAdminMemberSummary }) {
  const fields = member.fieldKeys.flatMap((key) => FIELD_BY_KEY[key]?.label ?? []);
  const isActive = member.activeCaseCount > 0;

  return (
    <div
      className={cn(
        'group relative grid grid-cols-2 gap-4 px-5 py-4 transition-colors duration-200 hover:bg-surface-soft/70 sm:grid-cols-4',
        MEMBER_GRID
      )}
    >
      <div className="col-span-2 flex min-w-0 items-center gap-3.5 sm:col-span-4 lg:col-span-1">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-soft text-xs font-semibold text-ink-muted ring-1 ring-line"
          aria-hidden="true"
        >
          {getInitials(member.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{member.name}</p>
          <p className="truncate text-xs text-ink-subtle">{member.email}</p>
        </div>
      </div>

      <Cell label="Bidang">
        {fields.length > 0 ? (
          <ul className="flex flex-wrap gap-1">
            {fields.slice(0, VISIBLE_FIELDS).map((label) => (
              <li
                key={label}
                className="rounded-tag border border-line px-1.5 py-px text-[0.6875rem] text-ink-muted"
              >
                {label}
              </li>
            ))}
            {fields.length > VISIBLE_FIELDS && (
              <li className="px-1 py-px text-[0.6875rem] text-ink-subtle">
                +{fields.length - VISIBLE_FIELDS}
              </li>
            )}
          </ul>
        ) : (
          <p className="text-xs text-ink-subtle">Belum memilih</p>
        )}
      </Cell>

      <Cell label="Case">
        <p className="font-mono text-[0.8125rem] text-ink tabular-nums">
          {member.aiCaseCount} AI, {member.b2bCaseCount} B2B
        </p>
        <p
          className={cn('mt-0.5 text-xs', isActive ? 'font-medium text-brand' : 'text-ink-subtle')}
        >
          {member.activeCaseCount} berjalan
        </p>
      </Cell>

      <Cell label="Sertifikat">
        <p className="font-mono text-[0.8125rem] text-ink tabular-nums">
          {member.certificateCount}
        </p>
      </Cell>

      <Cell label="Terakhir aktif">
        <p className="text-[0.8125rem] text-ink">
          {member.lastActiveAt ? formatRelative(member.lastActiveAt) : 'Belum ada aktivitas'}
        </p>
        <p className="mt-0.5 font-mono text-xs text-ink-subtle tabular-nums">
          Gabung {formatDate(member.joinedAt)}
        </p>
      </Cell>

      <div className="col-span-2 flex items-center sm:col-span-4 lg:col-span-1 lg:justify-end">
        <Link
          href={PATHS.adminMember(member.id)}
          className="inline-flex items-center gap-1 text-sm font-medium text-brand outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:ring-3 focus-visible:after:ring-brand/30"
        >
          Lihat
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          <span className="sr-only">: {member.name}</span>
        </Link>
      </div>
    </div>
  );
}
