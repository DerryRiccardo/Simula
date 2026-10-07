'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { PasswordField, TextField } from '@/components/forms';
import { Button, Checkbox, Label } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useRegister } from '@/hooks/useAuth';
import { getApiFieldErrors } from '@/lib/apiError';
import { withNext } from '@/lib/authRedirect';
import { registerSchema, type RegisterFormValues } from '../_schemas';
import { AuthDivider, AuthHeader } from './AuthHeader';
import { GoogleButton } from './GoogleButton';

export function RegisterForm() {
  const next = useSearchParams().get('next');
  const registerUser = useRegister(next);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', hasAgreed: false },
  });

  const onSubmit = ({ name, email, password }: RegisterFormValues) =>
    registerUser.mutate(
      { name, email, password },
      {
        onError: (error) =>
          getApiFieldErrors(error).forEach(({ field, message }) =>
            setError(field as keyof RegisterFormValues, { message })
          ),
      }
    );

  return (
    <div className="grid gap-7">
      <AuthHeader
        title="Buat akun gratis"
        description="Mulai dari AI Case Study gratis dan kenali skill gap-mu dalam hitungan jam."
      />

      <GoogleButton next={next} isDisabled={registerUser.isPending} />
      <AuthDivider />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4" noValidate>
        <TextField
          id="name"
          label="Nama lengkap"
          autoComplete="name"
          placeholder="Nama sesuai sertifikat"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <div className="grid items-start gap-4 @sm:grid-cols-2">
          <PasswordField
            id="password"
            label="Kata sandi"
            autoComplete="new-password"
            placeholder="Minimal 8 karakter"
            hint="Kombinasikan huruf dan angka."
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordField
            id="confirmPassword"
            label="Konfirmasi kata sandi"
            autoComplete="new-password"
            placeholder="Ulangi kata sandi"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />
        </div>

        <div className="grid gap-1.5">
          <div className="flex items-start gap-3">
            <Controller
              control={control}
              name="hasAgreed"
              render={({ field }) => (
                <Checkbox
                  id="hasAgreed"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  onBlur={field.onBlur}
                  aria-invalid={errors.hasAgreed ? true : undefined}
                  aria-describedby={errors.hasAgreed ? 'hasAgreed-error' : undefined}
                  className="mt-0.5"
                />
              )}
            />
            <Label
              htmlFor="hasAgreed"
              className="text-sm leading-relaxed font-normal text-ink-muted"
            >
              Saya menyetujui Syarat &amp; Ketentuan serta Kebijakan Privasi.
            </Label>
          </div>
          {errors.hasAgreed && (
            <p id="hasAgreed-error" className="text-xs text-destructive" role="alert">
              {errors.hasAgreed.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="pill-lg"
          className="mt-2 w-full"
          disabled={registerUser.isPending}
        >
          {registerUser.isPending && <Loader2 className="animate-spin" />}
          {registerUser.isPending ? 'Membuat akun…' : 'Buat akun'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        Sudah punya akun?{' '}
        <Link
          href={withNext(PATHS.login, next)}
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Masuk
        </Link>
      </p>
    </div>
  );
}
