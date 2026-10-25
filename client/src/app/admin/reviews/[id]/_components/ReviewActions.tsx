'use client';

import { useState } from 'react';
import { BellRing, Flag, FlagOff, RotateCw, UserRoundCog } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { useAdminReviewActions } from '@/hooks/useAdminReviews';
import type { IAdminReviewDetail } from '@/types';
import { NoteDialog } from './NoteDialog';
import { ReassignDialog } from './ReassignDialog';

type TDialog = 'regrade' | 'flag' | 'unflag' | 'remind' | 'reassign' | null;

// Aksi admin per penilaian (CONTEXT.md 4.13). Hanya aksi yang berlaku untuk tier dan status ini
// yang ditampilkan.
export function ReviewActions({ detail }: { detail: IAdminReviewDetail }) {
  const { item } = detail;
  const actions = useAdminReviewActions(item.id);
  const [dialog, setDialog] = useState<TDialog>(null);
  const close = () => setDialog(null);
  const isAi = item.tier === 'ai';
  const isPendingB2b = item.tier === 'b2b' && item.status === 'in_review';

  const buttons = [
    isAi && {
      id: 'flag',
      label: item.isFlagged ? 'Lepas tanda' : 'Tandai bermasalah',
      icon: item.isFlagged ? FlagOff : Flag,
      onClick: () => setDialog(item.isFlagged ? 'unflag' : 'flag'),
    },
    detail.canRegrade && {
      id: 'regrade',
      label: 'Nilai ulang',
      icon: RotateCw,
      onClick: () => setDialog('regrade'),
    },
    isPendingB2b && {
      id: 'reassign',
      label: 'Ganti reviewer',
      icon: UserRoundCog,
      onClick: () => setDialog('reassign'),
    },
    isPendingB2b &&
      !!item.reviewerId && {
        id: 'remind',
        label: detail.canRemind ? 'Ingatkan reviewer' : 'Sudah diingatkan',
        icon: BellRing,
        isDisabled: !detail.canRemind,
        onClick: () => setDialog('remind'),
      },
  ].filter((button) => !!button);

  if (buttons.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => {
          const Icon = button.icon;
          return (
            <Button
              key={button.id}
              variant="outline"
              size="pill"
              disabled={'isDisabled' in button && button.isDisabled}
              onClick={button.onClick}
            >
              <Icon className="size-4" />
              {button.label}
            </Button>
          );
        })}
      </div>

      <ReassignDialog
        detail={detail}
        isOpen={dialog === 'reassign'}
        onOpenChange={(isOpen) => !isOpen && close()}
      />

      <ConfirmDialog
        isOpen={dialog === 'regrade'}
        onOpenChange={(isOpen) => !isOpen && close()}
        title="Nilai ulang dengan AI?"
        description="Penilaian AI dijalankan lagi dengan rubrik case saat ini. Skor, feedback, dan sertifikat lama diganti hasil baru; sertifikat terbit lagi bila lulus."
        confirmLabel="Nilai ulang"
        isPending={actions.regrade.isPending}
        onConfirm={() => actions.regrade.mutate(undefined, { onSuccess: close })}
      />

      <ConfirmDialog
        isOpen={dialog === 'unflag'}
        onOpenChange={(isOpen) => !isOpen && close()}
        title="Lepas tanda bermasalah?"
        description={detail.flag ? `Catatan sebelumnya: ${detail.flag.note}` : ''}
        confirmLabel="Lepas tanda"
        isPending={actions.setFlag.isPending}
        onConfirm={() => actions.setFlag.mutate({ isFlagged: false }, { onSuccess: close })}
      />

      <ConfirmDialog
        isOpen={dialog === 'remind'}
        onOpenChange={(isOpen) => !isOpen && close()}
        title="Kirim pengingat ke reviewer?"
        description={`${item.reviewerName ?? 'Reviewer'} menerima email dan notifikasi untuk menilai submission ini. Pengingat bisa dikirim sekali dalam 24 jam.`}
        confirmLabel="Kirim pengingat"
        isPending={actions.remind.isPending}
        onConfirm={() => actions.remind.mutate(undefined, { onSuccess: close })}
      />

      <NoteDialog
        isOpen={dialog === 'flag'}
        onOpenChange={(isOpen) => !isOpen && close()}
        title="Tandai bermasalah"
        description="Tanda ini hanya terlihat oleh admin, sebagai bahan evaluasi rubrik dan prompt AI. Peserta tetap melihat hasilnya seperti biasa."
        label="Apa yang janggal?"
        placeholder="Misalnya: skor kriteria Komunikasi terlalu rendah padahal memo terstruktur."
        hint="Minimal 10 karakter."
        confirmLabel="Tandai"
        isPending={actions.setFlag.isPending}
        onSubmit={(note) => actions.setFlag.mutate({ isFlagged: true, note }, { onSuccess: close })}
      />
    </>
  );
}
