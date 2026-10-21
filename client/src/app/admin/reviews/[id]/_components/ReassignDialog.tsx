'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useReassignReviewer } from '@/hooks/useAdminPartners';
import { cn } from '@/lib/utils';
import type { IAdminReviewDetail } from '@/types';

interface ReassignDialogProps {
  detail: IAdminReviewDetail;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

// Pindahkan submission B2B ke reviewer aktif lain dari mitra yang sama, urut dari antrean tersedikit.
export function ReassignDialog({ detail, isOpen, onOpenChange }: ReassignDialogProps) {
  const { item, reassignOptions } = detail;
  const reassign = useReassignReviewer(item.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = reassignOptions.find((option) => option.id === selectedId);

  const closeDialog = () => {
    setSelectedId(null);
    onOpenChange(false);
  };
  // Tutup manual (Esc, Batal) diabaikan selama permintaan berjalan.
  const handleOpenChange = (open: boolean) => {
    if (reassign.isPending) return;
    if (open) onOpenChange(true);
    else closeDialog();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <div className="grid gap-2">
          <DialogTitle>Ganti reviewer</DialogTitle>
          <DialogDescription>
            Saat ini dipegang {item.reviewerName ?? 'belum ada reviewer'}. Pilih reviewer aktif dari{' '}
            {item.partnerName ?? 'mitra yang sama'}; draft penilaian reviewer lama tidak ikut
            dipindahkan, dan tenggat SLA tetap sama.
          </DialogDescription>
        </div>

        {reassignOptions.length === 0 && (
          <div className="rounded-control border border-dashed border-line px-4 py-5 text-sm text-ink-muted">
            Belum ada reviewer aktif lain dari {item.partnerName ?? 'mitra ini'}.{' '}
            <Link
              href={`${PATHS.adminPartners}?tab=reviewers`}
              className="font-medium text-brand hover:underline"
            >
              Tambah reviewer
            </Link>
          </div>
        )}

        <fieldset className="grid gap-2">
          <legend className="sr-only">Reviewer pengganti</legend>
          {reassignOptions.map((option) => {
            const isSelected = option.id === selectedId;
            return (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-control border px-4 py-3 transition-colors',
                  isSelected ? 'border-brand bg-brand-soft/60' : 'border-line hover:bg-surface-soft'
                )}
              >
                <input
                  type="radio"
                  name="reviewer"
                  value={option.id}
                  checked={isSelected}
                  onChange={() => setSelectedId(option.id)}
                  className="mt-1 size-4 accent-brand"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink">{option.name}</span>
                  <span className="block text-xs text-ink-muted">{option.jobTitle}</span>
                  {!option.isAssignedToCase && (
                    <span className="mt-1 block text-xs text-ink-subtle">
                      Belum ditugaskan ke case ini; penugasannya ditambahkan otomatis.
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-mono text-xs text-ink-subtle tabular-nums">
                  {option.pendingCount} antrean
                </span>
              </label>
            );
          })}
        </fieldset>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="pill" disabled={reassign.isPending}>
              Batal
            </Button>
          </DialogClose>
          <Button
            size="pill"
            disabled={!selected || reassign.isPending}
            onClick={() =>
              selected && reassign.mutate({ reviewerId: selected.id }, { onSuccess: closeDialog })
            }
            className="active:scale-[0.98]"
          >
            {reassign.isPending && <Loader2 className="animate-spin" />}
            {selected ? `Pindahkan ke ${selected.name.split(' ')[0]}` : 'Pilih reviewer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
