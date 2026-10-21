'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { RotateCcw } from 'lucide-react';
import { useForm, useWatch, type FieldPath } from 'react-hook-form';

import { ConfirmDialog } from '@/components';
import { TextField } from '@/components/forms';
import { Button } from '@/components/ui';
import {
  SETTING_GROUPS,
  SETTING_LABEL,
  type INumberSettingMeta,
} from '@/constants/platformSettings';
import { useSaveSettings } from '@/hooks/useAdminPlatform';
import { getApiFieldErrors } from '@/lib/apiError';
import type { IAdminSettings, IPlatformSettings, TPlatformSettingKey } from '@/types';
import { settingsSchema } from '@/app/admin/settings/_schema';

interface SettingsFormProps {
  settings: IAdminSettings;
}

function SettingGroup({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-white p-5 sm:p-6">
      <h2 className="text-[1.0625rem] md:text-[1.0625rem]">{title}</h2>
      <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-ink-muted">{description}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// Form nilai bawaan platform. Simpan selalu lewat dialog konfirmasi yang merangkum perubahan.
export function SettingsForm({ settings }: SettingsFormProps) {
  const save = useSaveSettings();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const form = useForm<IPlatformSettings>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings.values,
  });
  const { register, handleSubmit, reset, setError, control, formState } = form;
  const { errors, isDirty } = formState;
  const values = useWatch({ control });

  // Peringatan saat menutup tab dengan perubahan yang belum disimpan.
  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  const changedKeys = (Object.keys(SETTING_LABEL) as TPlatformSettingKey[]).filter(
    (key) => values[key] !== undefined && values[key] !== settings.values[key]
  );

  const hint = (meta: INumberSettingMeta) => {
    const fallback = settings.defaults[meta.key];
    const isDefault = values[meta.key] === fallback;
    return `${meta.hint} ${isDefault ? 'Nilai bawaan.' : `Bawaan: ${fallback} ${meta.unit}.`}`;
  };

  const handleConfirm = () =>
    save.mutate(form.getValues(), {
      onSuccess: (saved) => {
        reset(saved.values);
        setIsConfirmOpen(false);
      },
      onError: (error) => {
        setIsConfirmOpen(false);
        getApiFieldErrors(error).forEach(({ field, message }) =>
          setError(field as FieldPath<IPlatformSettings>, { message })
        );
      },
    });

  return (
    <form noValidate onSubmit={handleSubmit(() => setIsConfirmOpen(true))} className="grid gap-6">
      {SETTING_GROUPS.map((group) => (
        <SettingGroup key={group.id} title={group.title} description={group.description}>
          {group.fields.map((meta) => (
            <TextField
              key={meta.key}
              id={`setting-${meta.key}`}
              type="number"
              inputMode="numeric"
              min={meta.min}
              max={meta.max}
              label={meta.label}
              hint={hint(meta)}
              error={errors[meta.key]?.message}
              className="pr-24 font-mono tabular-nums"
              endAdornment={
                <span className="pointer-events-none pr-3 text-xs text-ink-subtle">
                  {meta.unit}
                </span>
              }
              {...register(meta.key, { valueAsNumber: true })}
            />
          ))}
        </SettingGroup>
      ))}

      <SettingGroup
        title="Bantuan"
        description="Kontak yang dibuka tombol Bantuan melayang di dashboard peserta."
      >
        <TextField
          id="setting-whatsapp"
          inputMode="numeric"
          label="Nomor WhatsApp"
          placeholder="6281234567890"
          hint="Format internasional tanpa spasi dan tanda +, diawali 62."
          error={errors.whatsappNumber?.message}
          className="font-mono tabular-nums"
          {...register('whatsappNumber')}
        />
      </SettingGroup>

      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-white/95 px-5 py-4 shadow-lift backdrop-blur-sm">
        <p className="text-sm text-ink-muted">
          {changedKeys.length > 0
            ? `${changedKeys.length} nilai belum disimpan.`
            : 'Belum ada perubahan.'}
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="pill"
            disabled={!isDirty || save.isPending}
            onClick={() => reset(settings.values)}
          >
            <RotateCcw className="size-3.5" />
            Batalkan
          </Button>
          <Button type="submit" size="pill" disabled={changedKeys.length === 0 || save.isPending}>
            Simpan pengaturan
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onOpenChange={setIsConfirmOpen}
        title="Simpan pengaturan?"
        description="Nilai baru berlaku untuk seluruh platform dan tercatat di riwayat perubahan."
        confirmLabel="Ya, simpan"
        isPending={save.isPending}
        onConfirm={handleConfirm}
      >
        <ul className="grid gap-1.5 rounded-control bg-surface-soft px-4 py-3 text-sm">
          {changedKeys.map((key) => (
            <li key={key} className="flex justify-between gap-4">
              <span className="text-ink-muted">{SETTING_LABEL[key]}</span>
              <span className="shrink-0 font-mono text-ink tabular-nums">
                {String(settings.values[key])} → {String(values[key])}
              </span>
            </li>
          ))}
        </ul>
      </ConfirmDialog>
    </form>
  );
}
