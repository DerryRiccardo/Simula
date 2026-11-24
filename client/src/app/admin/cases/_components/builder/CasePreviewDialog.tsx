'use client';

import { useState } from 'react';

import { CaseHeader } from '@/app/(student)/cases/[slug]/_components/CaseHeader';
import { CaseOverview } from '@/app/(student)/cases/[slug]/_components/CaseOverview';
import { CasePriceCard } from '@/app/(student)/cases/[slug]/_components/CasePriceCard';
import {
  BriefContext,
  BriefMaterials,
  BriefRequirements,
  BriefRubric,
  BriefTasks,
  FilterTabs,
  TierBadge,
} from '@/components/student';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { usePartnerDirectory } from '@/hooks/useAdminPartners';
import { formatFileSize } from '@/lib/formatters';
import type { IAdminCaseInput, ICaseBrief, ICaseDetail, ICasePartner } from '@/types';

type TPreviewMode = 'detail' | 'work';
type TBriefTab = 'context' | 'tasks' | 'materials' | 'slots' | 'rubric';

const BODY_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-14';

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
      name: material.name || `Materi ${index + 1}`,
      format: material.format,
      sizeLabel: material.sizeBytes === null ? '-' : formatFileSize(material.sizeBytes),
      description: material.description,
    })),
    rubric: input.rubric.map((criterion, index) => ({
      name: criterion.name.trim() || `Kriteria ${index + 1}`,
      weight: criterion.weight,
      description: criterion.description,
    })),
    slots: input.slots.map((slot, index) => ({
      id: `${toSlotKey(slot.title, index)}-${index}`,
      title: slot.title.trim() || `Deliverable ${index + 1}`,
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
  };
}

function toDetail(input: IAdminCaseInput, partner: ICasePartner | null): ICaseDetail {
  const skills = input.skills
    .split(',')
    .map((skill) => skill.trim())
    .filter(Boolean);

  return {
    id: 'preview',
    slug: 'preview',
    title: input.title.trim() || 'Judul case belum diisi',
    summary: input.summary.trim() || 'Ringkasan singkat case belum diisi.',
    tier: input.tier,
    fieldKey: input.fieldKey,
    level: input.level,
    deliverableCount: input.slots.length,
    partnerName: partner?.name ?? null,
    price: input.tier === 'ai' ? null : input.price,
    participantCount: 0,
    rating: 0,
    about: input.about.trim() || 'Deskripsi lengkap tentang case belum diisi.',
    activities: splitLines(input.activities),
    deliverables: input.slots.map((slot, index) => ({
      title: slot.title.trim() || `Deliverable ${index + 1}`,
      description: slot.description.trim() || 'Deskripsi deliverable belum diisi.',
    })),
    skills,
    prerequisites: splitLines(input.prerequisites),
    criteria: input.rubric.map((criterion, index) => ({
      name: criterion.name.trim() || `Kriteria ${index + 1}`,
      weight: criterion.weight,
    })),
    reviewerRole: input.tier === 'b2b' ? input.reviewerRole.trim() || 'Reviewer Mitra' : null,
    partner,
    myEnrollment: null,
  };
}

interface CasePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  input: IAdminCaseInput;
}

/**
 * Pratinjau memakai komponen halaman detail dan brief yang sama persis dengan tampilan peserta,
 * sehingga admin melihat hasil akhir dari perspektif user sebelum menerbitkan case.
 */
export function CasePreviewDialog({ isOpen, onOpenChange, input }: CasePreviewDialogProps) {
  const [mode, setMode] = useState<TPreviewMode>('detail');
  const [briefTab, setBriefTab] = useState<TBriefTab>('context');
  const { data: partnerDirectory } = usePartnerDirectory();

  const selectedPartner =
    input.tier === 'b2b' && input.partnerId
      ? partnerDirectory?.partners.find((partner) => partner.id === input.partnerId)
      : undefined;

  const partner: ICasePartner | null =
    input.tier === 'b2b'
      ? selectedPartner
        ? {
            name: selectedPartner.name,
            industry: selectedPartner.industry,
            about: selectedPartner.about,
          }
        : {
            name: 'Mitra belum dipilih',
            industry: '-',
            about: 'Pilih perusahaan mitra pada bagian Komersial.',
          }
      : null;

  const detail = toDetail(input, partner);
  const brief = toBrief(input);
  const field = FIELD_BY_KEY[input.fieldKey];

  const modeTabs: { value: TPreviewMode; label: string }[] = [
    { value: 'detail', label: 'Halaman Detail Case' },
    { value: 'work', label: 'Halaman Pengerjaan (Brief)' },
  ];

  const briefTabs: { value: TBriefTab; label: string; count?: number }[] = [
    { value: 'context', label: 'Konteks' },
    { value: 'tasks', label: 'Tugas', count: brief.tasks.length },
    { value: 'materials', label: 'Materi', count: brief.materials.length },
    { value: 'slots', label: 'Deliverable', count: brief.slots.length },
    { value: 'rubric', label: 'Rubrik' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-6xl overflow-y-auto p-0">
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white/95 px-6 py-4 pr-12 backdrop-blur">
          <div>
            <DialogTitle className="text-base">Pratinjau Tampilan Peserta</DialogTitle>
            <DialogDescription className="text-xs text-ink-subtle">
              Tampilan halaman yang dilihat peserta sebelum dan saat mengerjakan case.
            </DialogDescription>
          </div>
          <FilterTabs
            ariaLabel="Mode pratinjau"
            options={modeTabs}
            value={mode}
            onChange={setMode}
          />
        </div>

        {mode === 'detail' ? (
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 p-6 sm:p-8">
            <CaseHeader detail={detail} />
            <div className={BODY_GRID}>
              <aside className="lg:col-start-2 lg:row-start-1 lg:self-start">
                <CasePriceCard detail={detail} isPreview />
              </aside>
              <div className="min-w-0 lg:col-start-1 lg:row-start-1">
                <CaseOverview detail={detail} />
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 p-6 sm:p-8">
            <header className="grid gap-2 border-b border-line pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <TierBadge tier={input.tier} />
                {field && <span className="text-sm text-ink-muted">{field.label}</span>}
              </div>
              <h2 className="text-xl tracking-[-0.02em] sm:text-2xl">{detail.title}</h2>
              <p className="max-w-[65ch] text-sm leading-relaxed text-ink-muted">
                {detail.summary}
              </p>
            </header>

            <FilterTabs
              ariaLabel="Bagian brief"
              options={briefTabs}
              value={briefTab}
              onChange={setBriefTab}
            />

            <div role="tabpanel" className="min-h-60 pb-4">
              {briefTab === 'context' && <BriefContext brief={brief} partner={partner} />}
              {briefTab === 'tasks' && <BriefTasks brief={brief} />}
              {briefTab === 'materials' && <BriefMaterials brief={brief} />}
              {briefTab === 'slots' && <BriefRequirements brief={brief} />}
              {briefTab === 'rubric' && <BriefRubric brief={brief} />}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
