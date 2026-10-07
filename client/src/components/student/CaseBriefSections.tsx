'use client';

import { Download, FileText, FolderGit2, Link2, Type } from 'lucide-react';
import { toast } from 'sonner';

import type { ICaseBrief, ICasePartner, ISubmissionSlot, TSlotKind } from '@/types';

// Bagian-bagian brief case. Dipakai halaman pengerjaan mahasiswa dan halaman review, supaya
// reviewer menilai terhadap soal dan ketentuan yang persis sama dengan yang dibaca kandidat.

interface BriefContextProps {
  brief: ICaseBrief;
  partner: ICasePartner | null;
}

export function BriefContext({ brief, partner }: BriefContextProps) {
  return (
    <div className="grid max-w-[68ch] gap-4">
      {brief.context.map((paragraph) => (
        <p key={paragraph} className="text-[0.9375rem] leading-[1.75] text-pretty text-ink-muted">
          {paragraph}
        </p>
      ))}
      {partner && (
        <p className="mt-2 border-l-2 border-line pl-4 text-sm text-ink-muted">
          <span className="font-medium text-ink">{partner.name}</span>. {partner.about}
        </p>
      )}
    </div>
  );
}

export function BriefTasks({ brief }: { brief: ICaseBrief }) {
  return (
    <ol className="grid gap-6">
      {brief.tasks.map((task, index) => (
        <li key={task.title} className="flex gap-4">
          <span className="w-6 shrink-0 pt-0.5 font-mono text-xs text-ink-subtle tabular-nums">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="max-w-[65ch]">
            <p className="text-[0.9375rem] font-medium text-ink">{task.title}</p>
            <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-muted">
              {task.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

const SLOT_KIND: Record<TSlotKind, { icon: typeof FileText; label: string }> = {
  file: { icon: FileText, label: 'unggah berkas' },
  link: { icon: Link2, label: 'tautan' },
  text: { icon: Type, label: 'isian teks' },
};

function getSlotRule(slot: ISubmissionSlot) {
  if (slot.kind === 'file') {
    const formats = slot.formats?.map((format) => format.toUpperCase()).join(', ');
    return [formats, slot.maxSizeMb && `maks. ${slot.maxSizeMb} MB`].filter(Boolean).join(', ');
  }
  if (slot.kind === 'link') return slot.linkHint ? `Contoh: ${slot.linkHint}` : 'Tautan publik';
  return 'Ditulis langsung di form';
}

/** Ketentuan deliverable: slot yang harus dikirim beserta jenis, format, dan ukurannya. */
export function BriefRequirements({ brief }: { brief: ICaseBrief }) {
  const hasLink = brief.slots.some((slot) => slot.kind === 'link');
  return (
    <div className="grid gap-5">
      <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
        {brief.slots.map((slot) => {
          const kind = slot.linkHint?.includes('github')
            ? { icon: FolderGit2, label: 'Repositori GitHub' }
            : SLOT_KIND[slot.kind];
          return (
            <li key={slot.id} className="flex items-start gap-3.5 bg-white px-4 py-3.5">
              <kind.icon className="mt-0.5 size-4 shrink-0 text-ink-subtle" strokeWidth={1.75} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-ink">
                  {slot.title}
                  <span className="text-xs font-normal text-ink-subtle">
                    {slot.isRequired ? 'Wajib' : 'Opsional'}, {kind.label}
                  </span>
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{slot.description}</p>
                <p className="mt-1 font-mono text-xs break-all text-ink-subtle">
                  {getSlotRule(slot)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="grid gap-1.5 text-sm text-ink-muted">
        <p className="font-medium text-ink">Pernyataan yang dicentang kandidat</p>
        <p>Hasil ini adalah pekerjaan saya sendiri.</p>
        {hasLink && <p>Saya sudah memastikan semua tautan dapat diakses publik.</p>}
      </div>
    </div>
  );
}

export function BriefMaterials({ brief }: { brief: ICaseBrief }) {
  // Prototype: berkas materi belum tersedia. Backend nanti mengirim URL unduhan per materi.
  const handleDownload = (name: string) =>
    toast.info('Materi belum tersedia di prototype', { description: name });

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-card border border-line">
      {brief.materials.map((material) => (
        <li key={material.id} className="flex items-center gap-4 px-4 py-3.5">
          <FileText className="size-5 shrink-0 text-ink-subtle" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-ink">{material.name}</p>
            <p className="mt-0.5 text-xs text-ink-muted">{material.description}</p>
          </div>
          <span className="hidden shrink-0 font-mono text-xs text-ink-subtle tabular-nums sm:block">
            {material.format}, {material.sizeLabel}
          </span>
          <button
            type="button"
            onClick={() => handleDownload(material.name)}
            aria-label={`Unduh ${material.name}`}
            className="grid size-9 shrink-0 place-items-center rounded-control border border-line text-ink-muted transition-colors outline-none hover:border-ink/25 hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.97]"
          >
            <Download className="size-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function BriefRubric({ brief }: { brief: ICaseBrief }) {
  return (
    <div className="grid gap-5">
      <p className="text-sm text-ink-muted">
        Lulus jika skor akhir minimal{' '}
        <span className="font-mono font-semibold text-ink tabular-nums">{brief.passingScore}</span>{' '}
        dari 100. Setiap kriteria dinilai 1 sampai 5, lalu dikalikan bobotnya.
      </p>
      <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line">
        {brief.rubric.map((criterion) => (
          <li key={criterion.name} className="flex items-start gap-4 bg-white px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink">{criterion.name}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                {criterion.description}
              </p>
            </div>
            <span className="shrink-0 font-mono text-sm text-ink tabular-nums">
              {criterion.weight}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
