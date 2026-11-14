'use client';

import type { ReactNode } from 'react';

import {
  BriefContext,
  BriefMaterials,
  BriefRequirements,
  BriefRubric,
  BriefTasks,
} from '@/components/student';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui';
import { formatFileSize } from '@/lib/formatters';
import type { IAdminCaseInput, ICaseBrief } from '@/types';

const splitLines = (text: string) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const toSlotKey = (title: string, index: number) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || `slot_${index + 1}`;

/** Isian form dalam bentuk brief yang dibaca peserta; aturan pemisahnya sama dengan server. */
function toBrief(input: IAdminCaseInput): ICaseBrief {
  return {
    context: input.context
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean),
    tasks: input.tasks.filter((task) => task.title.trim()),
    materials: input.materials.map((material, index) => ({
      id: material.fileId ?? `material-${index}`,
      name: material.name,
      format: material.format,
      sizeLabel: material.sizeBytes === null ? '-' : formatFileSize(material.sizeBytes),
      description: material.description,
    })),
    rubric: input.rubric,
    slots: input.slots.map((slot, index) => ({
      id: `${toSlotKey(slot.title, index)}-${index}`,
      title: slot.title,
      description: slot.description,
      kind: slot.kind,
      isRequired: slot.isRequired,
      formats:
        slot.kind === 'file'
          ? slot.formats
              .split(',')
              .map((format) => format.trim().toLowerCase())
              .filter(Boolean)
          : undefined,
      maxSizeMb: slot.kind === 'file' ? slot.maxSizeMb : undefined,
    })),
    passingScore: input.passingScore,
    deadlineDays: input.tier === 'b2b' ? input.deadlineDays : null,
  };
}

function PreviewBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-line pt-6">
      <h3 className="text-[1.0625rem] md:text-[1.0625rem]">{title}</h3>
      {children}
    </section>
  );
}

interface CasePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  input: IAdminCaseInput;
}

// Pratinjau memakai komponen brief yang sama dengan halaman pengerjaan dan portal reviewer.
export function CasePreviewDialog({ isOpen, onOpenChange, input }: CasePreviewDialogProps) {
  const brief = toBrief(input);
  const skills = input.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);
  const activities = splitLines(input.activities);
  const prerequisites = splitLines(input.prerequisites);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto p-5 sm:p-8">
        <div className="grid gap-6">
          <div className="grid gap-2">
            <p className="font-mono text-xs text-ink-subtle uppercase">
              Pratinjau {input.tier === 'ai' ? 'AI Case Study' : 'B2B Case Study'}
            </p>
            <DialogTitle className="text-xl">{input.title || 'Tanpa judul'}</DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-ink-muted">
              {input.summary || 'Ringkasan belum diisi.'}
            </DialogDescription>
          </div>

          <PreviewBlock title="Tentang case">
            <p className="max-w-[68ch] text-[0.9375rem] leading-relaxed text-ink-muted">
              {input.about || 'Belum diisi.'}
            </p>
            {activities.length > 0 && (
              <ul className="grid list-disc gap-1 pl-5 text-sm text-ink-muted">
                {activities.map((activity) => (
                  <li key={activity}>{activity}</li>
                ))}
              </ul>
            )}
            {skills.length > 0 && (
              <p className="text-sm text-ink-muted">
                <span className="font-medium text-ink">Skill:</span> {skills.join(', ')}
              </p>
            )}
            {prerequisites.length > 0 && (
              <p className="text-sm text-ink-muted">
                <span className="font-medium text-ink">Prasyarat:</span> {prerequisites.join('; ')}
              </p>
            )}
          </PreviewBlock>

          <PreviewBlock title="Konteks">
            <BriefContext brief={brief} partner={null} />
          </PreviewBlock>
          <PreviewBlock title="Tugas">
            <BriefTasks brief={brief} />
          </PreviewBlock>
          {brief.materials.length > 0 && (
            <PreviewBlock title="Materi">
              <BriefMaterials brief={brief} />
            </PreviewBlock>
          )}
          <PreviewBlock title="Deliverable">
            <BriefRequirements brief={brief} />
          </PreviewBlock>
          <PreviewBlock title="Rubrik">
            <BriefRubric brief={brief} />
          </PreviewBlock>
        </div>
      </DialogContent>
    </Dialog>
  );
}
