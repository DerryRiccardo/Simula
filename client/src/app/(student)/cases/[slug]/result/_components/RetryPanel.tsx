'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { useRetryCase } from '@/hooks/useCaseResult';
import type { TTier } from '@/types';

interface RetryPanelProps {
  slug: string;
  enrollmentId: string;
  tier: TTier;
  canRetry: boolean;
}

// Belum lulus (CONTEXT.md bagian 7): AI boleh mengulang tanpa batas, B2B submit ulang 1 kali.
export function RetryPanel({ slug, enrollmentId, tier, canRetry }: RetryPanelProps) {
  const retry = useRetryCase(slug);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const isB2b = tier === 'b2b';

  const copy = isB2b
    ? {
        title: 'Submit ulang',
        body: 'Kamu punya satu kesempatan submit ulang, sudah termasuk harga case. Isian sebelumnya terisi otomatis.',
        action: 'Submit ulang',
        confirm:
          'Case kembali ke status Sedang dikerjakan dengan tenggat 3 hari. Kesempatan ini hanya sekali.',
      }
    : {
        title: 'Coba lagi',
        body: 'AI Case Study boleh dicoba lagi tanpa batas. Isian sebelumnya terisi otomatis.',
        action: 'Coba lagi',
        confirm:
          'Case kembali ke status Sedang dikerjakan. Hasil penilaian ini diganti hasil baru.',
      };

  if (!canRetry) {
    return (
      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="text-[0.9375rem] md:text-[0.9375rem]">
          Kesempatan submit ulang sudah dipakai
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-muted">
          Feedback ini tetap bisa jadi bekal untuk case berikutnya di bidang yang sama.
        </p>
      </section>
    );
  }

  return (
    <section aria-labelledby="retry-title" className="rounded-card border border-line bg-white p-5">
      <span className="grid size-8 place-items-center rounded-control bg-surface-soft text-ink-muted">
        <RotateCcw className="size-4" strokeWidth={1.75} />
      </span>
      <h2 id="retry-title" className="mt-4 text-[0.9375rem] md:text-[0.9375rem]">
        {copy.title}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{copy.body}</p>
      <Button
        size="pill"
        className="mt-4 active:scale-[0.98]"
        disabled={retry.isPending}
        onClick={() => setIsConfirmOpen(true)}
      >
        {copy.action}
      </Button>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`${copy.action}?`}
        description={copy.confirm}
        confirmLabel={copy.action}
        onConfirm={() => retry.mutate(enrollmentId, { onSuccess: () => setIsConfirmOpen(false) })}
        isPending={retry.isPending}
      />
    </section>
  );
}
