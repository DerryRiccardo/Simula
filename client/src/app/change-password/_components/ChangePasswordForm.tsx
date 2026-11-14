'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { PasswordField } from '@/components/forms';
import { Button } from '@/components/ui';
import { useChangePassword, useCurrentUser } from '@/hooks/useAuth';
import { getApiFieldErrors } from '@/lib/apiError';

// Aturan kata sandi baru sama dengan pendaftaran; server memvalidasi ulang.
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Kata sandi minimal 8 karakter')
      .regex(/[A-Za-z]/, 'Kata sandi harus mengandung huruf')
      .regex(/\d/, 'Kata sandi harus mengandung angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak sama',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Gunakan kata sandi yang berbeda dari sebelumnya',
  });
type TChangePasswordValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const next = useSearchParams().get('next');
  const { user } = useCurrentUser();
  const changePassword = useChangePassword(next);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<TChangePasswordValues>({ resolver: zodResolver(schema) });

  const handleSave = handleSubmit(({ currentPassword, newPassword }) =>
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onError: (error) =>
          getApiFieldErrors(error).forEach(({ field, message }) =>
            setError(field as keyof TChangePasswordValues, { message })
          ),
      }
    )
  );

  const isRequired = user?.mustChangePassword ?? false;

  return (
    <section aria-labelledby="change-password-title" className="grid gap-8">
      <div className="grid gap-3">
        <span className="grid size-10 place-items-center rounded-control bg-brand-soft text-brand">
          <KeyRound className="size-5" strokeWidth={1.75} />
        </span>
        <h1 id="change-password-title" className="text-page-title">
          {isRequired ? 'Buat kata sandi baru' : 'Ganti kata sandi'}
        </h1>
        <p className="text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
          {isRequired
            ? 'Akunmu dibuat admin dengan kata sandi sementara. Ganti dulu sebelum melanjutkan.'
            : 'Masukkan kata sandi saat ini, lalu kata sandi baru.'}
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-4" noValidate>
        <PasswordField
          id="current-password"
          label={isRequired ? 'Kata sandi sementara' : 'Kata sandi saat ini'}
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <PasswordField
          id="new-password"
          label="Kata sandi baru"
          autoComplete="new-password"
          hint="Minimal 8 karakter, mengandung huruf dan angka."
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <PasswordField
          id="confirm-password"
          label="Ulangi kata sandi baru"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" size="pill-lg" disabled={changePassword.isPending} className="mt-2">
          {changePassword.isPending && <Loader2 className="animate-spin" />}
          Simpan kata sandi
        </Button>
      </form>
    </section>
  );
}
