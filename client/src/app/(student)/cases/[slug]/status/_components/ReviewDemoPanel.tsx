'use client';

import { useState } from 'react';
import { FlaskConical } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { useSimulateReview } from '@/hooks/useCaseStatus';
import type { TReviewSimulation, TTier } from '@/types';

interface ISimulation {
  outcome: TReviewSimulation;
  label: string;
  title: string;
  description: string;
}

const B2B_SIMULATIONS: ISimulation[] = [
  {
    outcome: 'passed',
    label: 'Nilai lulus',
    title: 'Selesaikan review sebagai lulus?',
    description:
      'Skor contoh di atas ambang lulus. Sertifikat langsung terbit dan halaman hasil terbuka.',
  },
  {
    outcome: 'failed',
    label: 'Nilai belum lulus',
    title: 'Selesaikan review sebagai belum lulus?',
    description: 'Skor contoh di bawah ambang lulus. Feedback tetap lengkap di halaman hasil.',
  },
  {
    outcome: 'revision',
    label: 'Kembalikan untuk revisi',
    title: 'Kembalikan submission untuk revisi?',
    description:
      'Status berubah menjadi Perlu revisi dengan catatan reviewer contoh, dan tenggat tambahan 3 hari.',
  },
];

// AI case tidak mengenal revisi; tanpa simulasi pun penilaian selesai sendiri sebagai lulus.
const AI_SIMULATIONS: ISimulation[] = [
  {
    outcome: 'passed',
    label: 'Selesaikan sebagai lulus',
    title: 'Selesaikan penilaian AI sekarang?',
    description:
      'Lewati waktu tunggu dengan skor contoh di atas ambang lulus. Sertifikat langsung terbit dan halaman hasil terbuka.',
  },
  {
    outcome: 'failed',
    label: 'Selesaikan sebagai belum lulus',
    title: 'Selesaikan penilaian AI sebagai belum lulus?',
    description:
      'Skor contoh di bawah ambang lulus. Feedback dan ringkasan skill gap tetap lengkap di halaman hasil.',
  },
];

interface ReviewDemoPanelProps {
  slug: string;
  enrollmentId: string;
  tier?: TTier;
}

// Prototype saja (CONTEXT.md bagian 9): menggantikan keputusan dari portal reviewer, atau
// mempercepat penilaian AI untuk presentasi.
export function ReviewDemoPanel({ slug, enrollmentId, tier = 'b2b' }: ReviewDemoPanelProps) {
  const simulate = useSimulateReview(slug);
  const [pending, setPending] = useState<ISimulation | null>(null);
  const simulations = tier === 'ai' ? AI_SIMULATIONS : B2B_SIMULATIONS;

  return (
    <section
      aria-labelledby="demo-title"
      className="rounded-card border border-dashed border-line p-5"
    >
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-ink-subtle" />
        <h2 id="demo-title" className="text-sm font-medium md:text-sm">
          Simulasi prototype
        </h2>
      </div>
      <p className="mt-1 text-sm text-ink-muted">
        {tier === 'ai'
          ? 'Mempercepat penilaian AI untuk presentasi. Tidak muncul di versi produksi.'
          : 'Menggantikan keputusan dari portal reviewer. Tidak muncul di versi produksi.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {simulations.map((simulation, index) => (
          <Button
            key={simulation.outcome}
            variant={index === 0 ? 'default' : 'outline'}
            size="pill"
            disabled={simulate.isPending}
            onClick={() => setPending(simulation)}
          >
            {simulation.label}
          </Button>
        ))}
      </div>

      <ConfirmDialog
        isOpen={pending !== null}
        onOpenChange={(isOpen) => !isOpen && setPending(null)}
        title={pending?.title ?? ''}
        description={pending?.description ?? ''}
        confirmLabel="Lanjutkan"
        onConfirm={() =>
          pending &&
          simulate.mutate(
            { enrollmentId, outcome: pending.outcome },
            { onSuccess: () => setPending(null) }
          )
        }
        isPending={simulate.isPending}
      />
    </section>
  );
}
