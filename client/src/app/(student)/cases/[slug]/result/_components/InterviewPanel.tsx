'use client';

import { useState } from 'react';
import { BriefcaseBusiness, Check } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { useShareConsent } from '@/hooks/useCaseResult';
import type { TShareConsent } from '@/types';

interface InterviewPanelProps {
  enrollmentId: string;
  partnerName: string;
  reviewerRole: string;
  consent: TShareConsent;
}

// Rekomendasi reviewer + permintaan persetujuan berbagi profil (CONTEXT.md 4.8 dan bagian 7).
export function InterviewPanel({
  enrollmentId,
  partnerName,
  reviewerRole,
  consent,
}: InterviewPanelProps) {
  const shareConsent = useShareConsent();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const submit = (isGranted: boolean) =>
    shareConsent.mutate({ enrollmentId, isGranted }, { onSuccess: () => setIsConfirmOpen(false) });

  return (
    <section
      aria-labelledby="interview-title"
      className="rounded-card border border-brand/40 bg-white p-5"
    >
      <span className="grid size-8 place-items-center rounded-control bg-brand-soft text-brand">
        <BriefcaseBusiness className="size-4" strokeWidth={1.75} />
      </span>
      <h2 id="interview-title" className="mt-4 text-[0.9375rem] md:text-[0.9375rem]">
        Direkomendasikan untuk interview
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">
        {reviewerRole} merekomendasikanmu ke daftar prioritas interview {partnerName}. Ini
        kesempatan, bukan jaminan panggilan.
      </p>

      {consent === 'granted' ? (
        <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm text-ink">
          <Check className="mt-0.5 size-4 shrink-0 text-ai" strokeWidth={2.5} />
          Profilmu sudah dibagikan ke tim rekrutmen {partnerName}.
        </p>
      ) : (
        <div className="mt-4 border-t border-line pt-4">
          <p className="text-sm text-ink">
            {consent === 'declined'
              ? 'Profilmu tidak dibagikan. Kamu masih bisa mengizinkannya.'
              : `Izinkan kami membagikan profilmu ke ${partnerName}?`}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              size="pill"
              disabled={shareConsent.isPending}
              onClick={() => setIsConfirmOpen(true)}
            >
              Izinkan
            </Button>
            {consent === 'pending' && (
              <Button
                variant="ghost"
                size="pill"
                className="text-ink-muted"
                disabled={shareConsent.isPending}
                onClick={() => submit(false)}
              >
                Jangan bagikan
              </Button>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title={`Bagikan profil ke ${partnerName}?`}
        description="Yang dibagikan: nama, email, kampus, LinkedIn, bidang, serta skor dan feedback case ini. Selama review kamu tetap anonim; profil baru dibuka setelah kamu setuju."
        confirmLabel="Izinkan"
        onConfirm={() => submit(true)}
        isPending={shareConsent.isPending}
      />
    </section>
  );
}
