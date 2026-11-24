'use client';

import { useState } from 'react';
import { FileStack, Lock, UserCheck } from 'lucide-react';

import { ConfirmDialog } from '@/components';
import { TierBadge } from '@/components/student';
import { Button } from '@/components/ui';
import { useStartWork } from '@/hooks/useCaseWork';
import type { IUnlockedWorkspace } from '@/types';

// B2B "Belum dimulai": brief masih terkunci sampai peserta klik Mulai mengerjakan.
export function StartWorkPanel({ workspace }: { workspace: IUnlockedWorkspace }) {
  const { caseInfo, brief, enrollment } = workspace;
  const startWork = useStartWork();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const facts = [
    {
      icon: FileStack,
      label: 'Deliverable',
      value: brief.slots.map((slot) => slot.title).join(', '),
    },
    {
      icon: UserCheck,
      label: 'Penilai',
      value: `${caseInfo.reviewerRole} dari ${caseInfo.partner?.name}`,
    },
  ];

  if (!enrollment) return null;

  return (
    <section className="grid max-w-3xl gap-8" aria-labelledby="start-title">
      <div>
        <TierBadge tier={caseInfo.tier} />
        <h1
          id="start-title"
          className="mt-3 text-[1.625rem] leading-[1.2] tracking-[-0.02em] text-balance md:text-[2rem]"
        >
          {caseInfo.title}
        </h1>
        <p className="mt-2 max-w-[60ch] text-[0.9375rem] leading-relaxed text-ink-muted">
          Pembayaran sudah terkonfirmasi. Klik Mulai mengerjakan kapan saja saat kamu siap membuka
          brief lengkapnya.
        </p>
      </div>

      <dl className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
        {facts.map((fact) => (
          <div key={fact.label} className="flex items-start gap-3.5 bg-white px-5 py-4">
            <fact.icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
            <div>
              <dt className="text-xs text-ink-subtle">{fact.label}</dt>
              <dd className="mt-0.5 text-sm text-ink">{fact.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="flex items-start gap-3 rounded-card bg-surface-soft p-5">
        <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
        <div>
          <p className="text-sm font-medium text-ink">Yang terbuka setelah mulai</p>
          <ul className="mt-2 grid gap-1 text-sm text-ink-muted">
            {brief.tasks.map((task) => (
              <li key={task.title}>{task.title}</li>
            ))}
            <li>{brief.materials.length} materi pendukung, rubrik lengkap, dan form submission</li>
          </ul>
        </div>
      </div>

      <div>
        <Button size="pill-lg" className="active:scale-[0.98]" onClick={() => setIsConfirmOpen(true)}>
          Mulai mengerjakan
        </Button>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Mulai mengerjakan sekarang?"
        description="Brief lengkap, materi pendukung, dan form submission akan terbuka dan bisa dikerjakan sesuai waktumu."
        confirmLabel="Mulai sekarang"
        onConfirm={() =>
          startWork.mutate(enrollment.id, { onSuccess: () => setIsConfirmOpen(false) })
        }
        isPending={startWork.isPending}
      />
    </section>
  );
}
