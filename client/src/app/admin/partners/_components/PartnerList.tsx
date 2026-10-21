import { ArrowRight, Pencil } from 'lucide-react';

import { Button } from '@/components/ui';
import type { IAdminPartner } from '@/types';

interface PartnerListProps {
  partners: IAdminPartner[];
  onEdit: (partner: IAdminPartner) => void;
  onShowReviewers: (partnerId: string) => void;
}

function Metric({
  label,
  value,
  isHighlighted,
}: {
  label: string;
  value: number;
  isHighlighted?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd
        className={
          isHighlighted
            ? 'mt-0.5 font-mono text-sm font-semibold text-brand tabular-nums'
            : 'mt-0.5 font-mono text-sm text-ink tabular-nums'
        }
      >
        {value}
      </dd>
    </div>
  );
}

// Satu baris per mitra: profil singkat, angka case/reviewer/antrean, dan aksi.
export function PartnerList({ partners, onEdit, onShowReviewers }: PartnerListProps) {
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      {partners.map((partner) => (
        <li
          key={partner.id}
          className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(0,1fr)_17rem_auto] lg:items-center lg:gap-6"
        >
          <div className="flex min-w-0 items-start gap-3.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-sm font-semibold text-brand"
              aria-hidden="true"
            >
              {partner.name.charAt(0)}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">
                {partner.name}
                <span className="ml-2 font-normal text-ink-subtle">{partner.industry}</span>
              </p>
              <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-ink-muted">
                {partner.about}
              </p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-4">
            <Metric label="B2B case" value={partner.caseCount} />
            <Metric label="Reviewer aktif" value={partner.activeReviewerCount} />
            <Metric
              label="Menunggu"
              value={partner.pendingReviewCount}
              isHighlighted={partner.pendingReviewCount > 0 && partner.activeReviewerCount === 0}
            />
          </dl>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" size="pill" onClick={() => onEdit(partner)}>
              <Pencil className="size-3.5" />
              Ubah
              <span className="sr-only"> {partner.name}</span>
            </Button>
            <Button variant="ghost" size="pill" onClick={() => onShowReviewers(partner.id)}>
              Reviewer
              <ArrowRight className="size-3.5" />
              <span className="sr-only"> {partner.name}</span>
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
