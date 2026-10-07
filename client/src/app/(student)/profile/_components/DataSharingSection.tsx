'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { SHARE_DEFAULT_OPTIONS } from '@/constants/profile';
import { useShareConsent } from '@/hooks/useCaseResult';
import { useUpdateShareDefault } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';
import type { IProfile, ISharedProfile, TShareConsent, TShareDefault } from '@/types';
import { SettingsSection } from './SettingsSection';

const CONSENT_LABEL: Record<TShareConsent, { label: string; className: string }> = {
  granted: { label: 'Dibagikan', className: 'bg-ai-soft text-ai' },
  pending: {
    label: 'Menunggu keputusanmu',
    className: 'bg-white font-semibold text-brand ring-1 ring-brand/50 ring-inset',
  },
  declined: { label: 'Tidak dibagikan', className: 'bg-surface-soft text-ink-muted' },
};

// Radio asli (bisa dengan keyboard), baris bersekat garis seperti pemilih metode pembayaran.
function ShareDefaultPicker({
  value,
  onChange,
}: {
  value: TShareDefault;
  onChange: (value: TShareDefault) => void;
}) {
  return (
    <fieldset className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
      <legend className="sr-only">Saat direkomendasikan ke daftar prioritas interview</legend>
      {SHARE_DEFAULT_OPTIONS.map((option) => {
        const isSelected = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-3.5 px-5 py-4 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-brand/30 has-focus-visible:ring-inset',
              isSelected ? 'bg-brand-soft/60' : 'hover:bg-surface-soft/70'
            )}
          >
            <input
              type="radio"
              name="share-default"
              value={option.value}
              checked={isSelected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                isSelected ? 'border-brand' : 'border-ink/25'
              )}
              aria-hidden="true"
            >
              {isSelected && <span className="size-2 rounded-full bg-brand" />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{option.label}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-subtle">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}

function SharedProfileRow({
  item,
  onRequest,
  isDisabled,
}: {
  item: ISharedProfile;
  onRequest: (item: ISharedProfile, isGranted: boolean) => void;
  isDisabled: boolean;
}) {
  const status = CONSENT_LABEL[item.consent];
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{item.partnerName}</p>
        <p className="mt-0.5 truncate text-xs text-ink-subtle">Dari case {item.caseTitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'rounded-tag px-2 py-0.5 text-[0.6875rem] leading-5 font-medium',
            status.className
          )}
        >
          {status.label}
        </span>
        <Button
          variant={item.consent === 'granted' ? 'ghost' : 'outline'}
          size="pill"
          className={cn('h-8 px-3.5', item.consent === 'granted' && 'text-ink-muted')}
          disabled={isDisabled}
          onClick={() => onRequest(item, item.consent !== 'granted')}
        >
          {item.consent === 'granted' ? 'Cabut izin' : 'Izinkan'}
        </Button>
      </div>
    </li>
  );
}

// Persetujuan berbagi profil ke mitra (CONTEXT.md bagian 7: kandidat anonim sampai setuju).
export function DataSharingSection({ profile }: { profile: IProfile }) {
  const updateShareDefault = useUpdateShareDefault();
  const shareConsent = useShareConsent();
  const [savedDefault, setSavedDefault] = useState(profile.shareDefault);
  const [shareDefault, setShareDefault] = useState(profile.shareDefault);
  const [pending, setPending] = useState<{ item: ISharedProfile; isGranted: boolean } | null>(null);

  const handleSaveDefault = () =>
    updateShareDefault.mutate(shareDefault, {
      onSuccess: (updated) => setSavedDefault(updated.shareDefault),
    });

  return (
    <SettingsSection
      id="sharing"
      title="Berbagi data"
      description="Selama review kamu anonim. Profil baru dibagikan ke mitra setelah kamu setuju."
    >
      <div className="grid gap-6">
        <div>
          <p className="mb-2.5 text-sm font-medium text-ink">
            Saat direkomendasikan ke daftar prioritas interview
          </p>
          <ShareDefaultPicker value={shareDefault} onChange={setShareDefault} />
          <div className="mt-3 flex justify-end">
            <Button
              size="pill"
              onClick={handleSaveDefault}
              disabled={shareDefault === savedDefault || updateShareDefault.isPending}
            >
              {updateShareDefault.isPending && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-2.5 text-sm font-medium text-ink">Permintaan dari mitra</p>
          {profile.sharedProfiles.length > 0 ? (
            <ul className="divide-y divide-line overflow-hidden rounded-card border border-line bg-white">
              {profile.sharedProfiles.map((item) => (
                <SharedProfileRow
                  key={item.enrollmentId}
                  item={item}
                  isDisabled={shareConsent.isPending}
                  onRequest={(target, isGranted) => setPending({ item: target, isGranted })}
                />
              ))}
            </ul>
          ) : (
            <p className="rounded-card border border-dashed border-line px-5 py-4 text-sm leading-relaxed text-ink-muted">
              Belum ada rekomendasi. Saat reviewer B2B merekomendasikanmu, permintaannya muncul di
              sini.{' '}
              <Link
                href={`${PATHS.cases}?tier=b2b`}
                className="font-medium text-brand underline-offset-4 hover:underline"
              >
                Lihat B2B Case Study
              </Link>
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={pending !== null}
        onOpenChange={(isOpen) => !isOpen && setPending(null)}
        title={
          pending?.isGranted
            ? `Bagikan profil ke ${pending.item.partnerName}?`
            : `Cabut izin untuk ${pending?.item.partnerName ?? 'mitra'}?`
        }
        description={
          pending?.isGranted
            ? 'Yang dibagikan: nama, email, kampus, LinkedIn, bidang, serta skor dan feedback case ini.'
            : 'Mitra tidak bisa lagi melihat profilmu. Data yang sudah mereka terima diminta untuk dihapus.'
        }
        confirmLabel={pending?.isGranted ? 'Izinkan' : 'Cabut izin'}
        onConfirm={() =>
          pending &&
          shareConsent.mutate(
            { enrollmentId: pending.item.enrollmentId, isGranted: pending.isGranted },
            { onSuccess: () => setPending(null) }
          )
        }
        isPending={shareConsent.isPending}
      />
    </SettingsSection>
  );
}
