import type { ReactNode } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';

import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { getTalentStage, type TTalentStage } from '@/hooks/useTalentPoolFilters';
import { formatDate, getInitials } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { ITalentCandidate } from '@/types';

// Kolom tabel di layar lebar; di bawahnya skor dan status turun ke bawah nama.
export const TALENT_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_5.5rem_9rem_9.5rem] lg:items-center lg:gap-5';

const STAGE_META: Record<TTalentStage, { label: string; className: string }> = {
  ready: {
    label: 'Siap diteruskan',
    className: 'bg-white text-brand ring-1 ring-brand/50 ring-inset font-semibold',
  },
  pending: { label: 'Menunggu persetujuan', className: 'bg-brand-soft text-brand' },
  shared: { label: 'Sudah diteruskan', className: 'bg-ai-soft text-ai' },
  declined: { label: 'Tidak dibagikan', className: 'bg-surface-soft text-ink-muted' },
};

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-ink-subtle lg:hidden">{label}</p>
      {children}
    </div>
  );
}

interface TalentRowProps {
  candidate: ITalentCandidate;
  onShare: (candidate: ITalentCandidate) => void;
}

export function TalentRow({ candidate, onShare }: TalentRowProps) {
  const stage = getTalentStage(candidate);
  const meta = STAGE_META[stage];

  return (
    <div className={cn('grid grid-cols-2 gap-4 px-5 py-4 sm:grid-cols-3', TALENT_GRID)}>
      <div className="col-span-2 flex min-w-0 items-center gap-3.5 sm:col-span-3 lg:col-span-1">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-xs font-semibold text-white"
          aria-hidden="true"
        >
          {getInitials(candidate.memberName)}
        </span>
        <div className="min-w-0">
          <Link
            href={PATHS.adminMember(candidate.memberId)}
            className="block truncate text-sm font-semibold text-ink underline-offset-4 hover:underline"
          >
            {candidate.memberName}
          </Link>
          <p className="truncate text-xs text-ink-subtle">{candidate.memberEmail}</p>
        </div>
      </div>

      <Cell label="Case">
        <p className="truncate text-sm text-ink">{candidate.caseTitle}</p>
        <p className="truncate text-xs text-ink-subtle">
          {candidate.partnerName ?? 'Mitra'}, dinilai {candidate.reviewerRole}
        </p>
      </Cell>

      <Cell label="Skor">
        <p className="font-mono text-[0.9375rem] font-semibold text-ink tabular-nums">
          {candidate.score}
          <span className="text-xs font-normal text-ink-subtle"> / 100</span>
        </p>
      </Cell>

      <Cell label="Status">
        <span
          className={cn(
            'inline-flex items-center rounded-tag px-2 py-0.5 text-[0.6875rem] leading-5 font-medium whitespace-nowrap',
            meta.className
          )}
        >
          {meta.label}
        </span>
        <p className="mt-1 font-mono text-xs text-ink-subtle tabular-nums">
          {candidate.sharedAt
            ? `Diteruskan ${formatDate(candidate.sharedAt)}`
            : `Direkomendasikan ${formatDate(candidate.recommendedAt)}`}
        </p>
      </Cell>

      <div className="col-span-2 flex items-center sm:col-span-3 lg:col-span-1 lg:justify-end">
        {stage === 'ready' ? (
          <Button size="pill" onClick={() => onShare(candidate)} className="w-full sm:w-auto">
            <Send className="size-3.5" />
            Teruskan ke mitra
            <span className="sr-only">: {candidate.memberName}</span>
          </Button>
        ) : (
          <p className="text-xs text-ink-subtle lg:text-right">
            {stage === 'pending' && 'Menunggu peserta menyetujui'}
            {stage === 'declined' && 'Peserta memilih tidak membagikan'}
            {stage === 'shared' && 'Mitra sudah menerima profil'}
          </p>
        )}
      </div>
    </div>
  );
}
