'use client';

import Link from 'next/link';
import { ArrowUpRight, Info } from 'lucide-react';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { Skeleton } from '@/components';
import { TextField } from '@/components/forms';
import { Label, NativeSelect } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { usePartnerDirectory } from '@/hooks/useAdminPartners';
import type { IAdminCase, IAdminCaseInput, IAdminPartnerDirectory } from '@/types';
import { BuilderSection, toNumberInput } from './BuilderParts';

/** Dibuka di tab baru agar isian pembuat case yang belum disimpan tidak hilang. */
function ManageLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      className="inline-flex items-center gap-0.5 text-xs font-medium text-brand hover:underline"
    >
      {label}
      <ArrowUpRight className="size-3" />
    </Link>
  );
}

interface AssignedReviewersProps {
  adminCase: IAdminCase | null;
  partnerId: string;
  directory: IAdminPartnerDirectory;
}

// Hanya info: reviewer ditugaskan dari halaman penugasan reviewer, bukan dari pembuat case.
function AssignedReviewers({ adminCase, partnerId, directory }: AssignedReviewersProps) {
  const assigned = adminCase
    ? directory.reviewers.filter((reviewer) => reviewer.caseIds.includes(adminCase.id))
    : [];
  const isPartnerChanged = !!adminCase && adminCase.partnerId !== partnerId;
  const willDrop = isPartnerChanged
    ? assigned.filter((reviewer) => reviewer.partnerId !== partnerId)
    : [];
  const kept = assigned.filter((reviewer) => !willDrop.includes(reviewer));

  const message = !adminCase
    ? 'Simpan case dulu, lalu tugaskan reviewer dari menu Reviewer & Mitra. Draft juga bisa ditugaskan.'
    : kept.length > 0
      ? `Ditugaskan ke ${kept.map((reviewer) => reviewer.name).join(', ')}.`
      : 'Belum ada reviewer. Submission peserta akan menunggu tanpa reviewer sampai ditugaskan.';

  return (
    <div className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-ink">Reviewer</p>
        {partnerId && (
          <ManageLink
            href={`${PATHS.adminPartners}?tab=reviewers&partner=${encodeURIComponent(partnerId)}`}
            label="Tugaskan reviewer"
          />
        )}
      </div>
      <p className="flex gap-2.5 rounded-control border border-line bg-surface-soft/60 px-4 py-3 text-sm text-ink-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
        <span>
          {message}
          {willDrop.length > 0 && (
            <span className="mt-1 block text-ink">
              Mitra diganti: penugasan {willDrop.map((reviewer) => reviewer.name).join(', ')}{' '}
              dilepas saat case disimpan.
            </span>
          )}
        </span>
      </p>
    </div>
  );
}

// Komersial (bagian 6, B2B saja): harga, tenggat, dan mitra dari menu Reviewer & Mitra.
export function CommercialSection({ adminCase }: { adminCase: IAdminCase | null }) {
  const { control, register, formState } = useFormContext<IAdminCaseInput>();
  const { errors } = formState;
  const partnerId = useWatch({ control, name: 'partnerId' });
  const { data: directory, isLoading, isError, refetch } = usePartnerDirectory();
  const partner = directory?.partners.find((item) => item.id === partnerId);

  return (
    <BuilderSection
      id="commercial"
      title="Komersial dan mitra"
      description="Harga dibayar peserta. Tenggat dihitung sejak peserta klik Mulai mengerjakan. Mitra dipilih dari menu Reviewer & Mitra."
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Controller
          control={control}
          name="price"
          render={({ field, fieldState }) => (
            <TextField
              id="case-price"
              label="Harga (Rp)"
              min={0}
              step={1000}
              error={fieldState.error?.message}
              {...toNumberInput(field)}
            />
          )}
        />
        <Controller
          control={control}
          name="deadlineDays"
          render={({ field, fieldState }) => (
            <TextField
              id="case-deadline"
              label="Tenggat pengerjaan (hari)"
              min={1}
              error={fieldState.error?.message}
              {...toNumberInput(field)}
            />
          )}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3" role="status" aria-label="Memuat mitra">
          <Skeleton className="h-11 rounded-control" />
          <Skeleton className="h-16 rounded-control" />
        </div>
      ) : isError || !directory ? (
        <p className="text-sm text-ink-muted">
          Daftar mitra gagal dimuat.{' '}
          <button
            type="button"
            onClick={() => refetch()}
            className="font-medium text-brand hover:underline"
          >
            Coba lagi
          </button>
        </p>
      ) : (
        <>
          <div className="grid gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <Label htmlFor="case-partner" className="text-sm font-medium text-ink">
                Mitra
              </Label>
              <ManageLink href={PATHS.adminPartners} label="Kelola mitra" />
            </div>
            <NativeSelect
              id="case-partner"
              aria-invalid={errors.partnerId ? true : undefined}
              aria-describedby={errors.partnerId ? 'case-partner-error' : 'case-partner-hint'}
              {...register('partnerId')}
            >
              <option value="">Pilih mitra</option>
              {directory.partners.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </NativeSelect>
            {errors.partnerId ? (
              <p id="case-partner-error" className="text-xs text-destructive" role="alert">
                {errors.partnerId.message}
              </p>
            ) : (
              <p id="case-partner-hint" className="text-xs text-ink-subtle">
                {partner
                  ? `${partner.industry}. ${partner.about}`
                  : 'Profil mitra tampil di detail case dan sertifikat berlogo mitra.'}
              </p>
            )}
          </div>

          <AssignedReviewers adminCase={adminCase} partnerId={partnerId} directory={directory} />
        </>
      )}

      <TextField
        id="reviewer-role"
        label="Peran penilai"
        placeholder="Senior Backend Engineer"
        hint="Tampil ke peserta di detail case dan sertifikat, misalnya jabatan reviewer dari mitra."
        error={errors.reviewerRole?.message}
        {...register('reviewerRole')}
      />
    </BuilderSection>
  );
}
