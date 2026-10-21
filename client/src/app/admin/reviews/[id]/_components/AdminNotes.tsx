import Link from 'next/link';
import { ArrowUpRight, Flag, ShieldX } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import { formatDate } from '@/lib/formatters';
import type { IAdminReviewDetail } from '@/types';

// Catatan internal admin (tanda bermasalah, pencabutan) dan tautan ke sertifikat yang terbit.
export function AdminNotes({ detail }: { detail: IAdminReviewDetail }) {
  const { flag, revocation, item } = detail;
  if (!flag && !revocation && !item.certificateId) return null;

  return (
    <section aria-labelledby="admin-notes" className="rounded-card border border-line bg-white">
      <h2
        id="admin-notes"
        className="border-b border-line px-5 py-3.5 text-[0.9375rem] md:text-[0.9375rem]"
      >
        Catatan admin
      </h2>
      <div className="grid divide-y divide-line">
        {flag && (
          <div className="flex gap-3 px-5 py-4">
            <Flag className="mt-0.5 size-4 shrink-0 text-brand" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                Ditandai bermasalah
                <span className="ml-2 font-mono text-xs font-normal text-ink-subtle tabular-nums">
                  {formatDate(flag.flaggedAt)}
                </span>
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{flag.note}</p>
            </div>
          </div>
        )}
        {revocation && (
          <div className="flex gap-3 px-5 py-4">
            <ShieldX className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                Sertifikat dicabut
                <span className="ml-2 font-mono text-xs font-normal text-ink-subtle tabular-nums">
                  {formatDate(revocation.revokedAt)}
                </span>
              </p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{revocation.reason}</p>
            </div>
          </div>
        )}
        {item.certificateId && (
          <Link
            href={PATHS.certificate(item.certificateId)}
            target="_blank"
            className="group flex items-center justify-between gap-3 px-5 py-3.5 text-sm transition-colors hover:bg-surface-soft/70"
          >
            <span className="min-w-0">
              <span className="block text-xs text-ink-subtle">Halaman verifikasi publik</span>
              <span className="block truncate font-mono text-[0.8125rem] text-ink">
                {item.certificateId}
              </span>
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-ink-subtle transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        )}
      </div>
    </section>
  );
}
