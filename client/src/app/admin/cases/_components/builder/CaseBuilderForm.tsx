'use client';

import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useWatch, type FieldPath } from 'react-hook-form';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components';
import { Button } from '@/components/ui';
import { useSaveAdminCase } from '@/hooks/useAdmin';
import { getApiFieldErrors } from '@/lib/apiError';
import type { IAdminCase, IAdminCaseInput } from '@/types';
import { adminCaseSchema, toCaseInput } from '@/app/admin/cases/_schema';
import { BriefSection } from './BriefSection';
import { CasePreviewDialog } from './CasePreviewDialog';
import { CommercialSection } from './CommercialSection';
import { GeneralSection } from './GeneralSection';
import { RubricSection } from './RubricSection';
import { SlotsSection } from './SlotsSection';

const SECTIONS = [
  { id: 'general', label: 'Info umum' },
  { id: 'brief', label: 'Brief lengkap' },
  { id: 'materials', label: 'Materi pendukung' },
  { id: 'slots', label: 'Slot deliverable' },
  { id: 'rubric', label: 'Rubrik' },
  { id: 'commercial', label: 'Komersial', isB2bOnly: true },
];

interface CaseBuilderFormProps {
  /** null = case baru. */
  adminCase: IAdminCase | null;
  defaultValues: IAdminCaseInput;
}

// Pembuat case (CONTEXT.md 4.11): enam bagian dalam satu halaman, navigasi bagian di samping.
export function CaseBuilderForm({ adminCase, defaultValues }: CaseBuilderFormProps) {
  const form = useForm<IAdminCaseInput>({ resolver: zodResolver(adminCaseSchema), defaultValues });
  const { control, handleSubmit, trigger, getValues, setError, formState } = form;
  const tier = useWatch({ control, name: 'tier' });
  const saveCase = useSaveAdminCase();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const isPublished = adminCase?.status === 'published';
  const isStructureLocked = adminCase?.isStructureLocked ?? false;

  // Peringatan saat menutup tab dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!formState.isDirty || saveCase.isSuccess) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [formState.isDirty, saveCase.isSuccess]);

  const save = (isPublish: boolean) =>
    saveCase.mutate(
      {
        id: adminCase?.id ?? null,
        payload: { input: getValues(), isPublish },
        wasPublished: isPublished,
      },
      {
        onSuccess: (saved) => form.reset(toCaseInput(saved)),
        onError: (error) => {
          setIsConfirmOpen(false);
          getApiFieldErrors(error).forEach(({ field, message }) =>
            setError(field as FieldPath<IAdminCaseInput>, { message })
          );
        },
      }
    );

  // Draft boleh belum lengkap: cukup berjudul dan setiap materi sudah berkas (wajib di database).
  // Validasi penuh hanya saat terbitkan.
  const handleSaveDraft = async () => {
    const materialFields = getValues('materials').map(
      (_, index) => `materials.${index}.fileId` as const
    );
    if (await trigger(['title', ...materialFields], { shouldFocus: true })) save(false);
  };

  const handleInvalid = () =>
    toast.error('Case belum bisa diterbitkan', {
      description: 'Periksa isian yang ditandai merah di setiap bagian.',
    });

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={handleSubmit(() => setIsConfirmOpen(true), handleInvalid)}
        className="grid grid-cols-1 gap-8 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-12"
      >
        <nav aria-label="Bagian pembuat case" className="hidden lg:block">
          <ol className="sticky top-24 grid gap-1 text-sm">
            {SECTIONS.filter((section) => !section.isB2bOnly || tier === 'b2b').map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="block rounded-tag px-3 py-1.5 text-ink-muted transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="grid min-w-0 gap-6">
          <GeneralSection isTierLocked={adminCase?.hasEnrollments ?? false} />
          <BriefSection />
          <SlotsSection isLocked={isStructureLocked} />
          <RubricSection isLocked={isStructureLocked} />
          {tier === 'b2b' && <CommercialSection adminCase={adminCase} />}

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white/95 px-5 py-4 shadow-lift backdrop-blur-sm">
            <p className="text-sm text-ink-muted">
              {isPublished
                ? 'Case ini sudah terbit. Perubahan berlaku setelah disimpan.'
                : 'Draft hanya terlihat oleh admin sampai diterbitkan.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="pill"
                onClick={() => setIsPreviewOpen(true)}
              >
                Pratinjau
              </Button>
              {!isPublished && (
                <Button
                  type="button"
                  variant="outline"
                  size="pill"
                  disabled={saveCase.isPending}
                  onClick={handleSaveDraft}
                >
                  Simpan draft
                </Button>
              )}
              <Button type="submit" size="pill" disabled={saveCase.isPending}>
                {isPublished ? 'Simpan perubahan' : 'Terbitkan'}
              </Button>
            </div>
          </div>
        </div>

        <ConfirmDialog
          isOpen={isConfirmOpen}
          onOpenChange={setIsConfirmOpen}
          title={isPublished ? 'Simpan perubahan case?' : 'Terbitkan case ini?'}
          description={
            isPublished
              ? 'Perubahan berlaku untuk peserta yang mengambil case ini berikutnya. Peserta yang sedang mengerjakan tetap memakai brief saat mereka mulai.'
              : 'Case muncul di katalog dan bisa diambil peserta. Case terbit tidak bisa dikembalikan ke draft, dan struktur slot serta rubrik dikunci setelah ada peserta yang mulai.'
          }
          confirmLabel={isPublished ? 'Ya, simpan' : 'Ya, terbitkan'}
          onConfirm={() => save(true)}
          isPending={saveCase.isPending}
        />
        {isPreviewOpen && (
          <CasePreviewDialog
            isOpen={isPreviewOpen}
            onOpenChange={setIsPreviewOpen}
            input={getValues()}
          />
        )}
      </form>
    </FormProvider>
  );
}
