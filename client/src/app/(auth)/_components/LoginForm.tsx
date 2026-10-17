'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { PasswordField, TextField } from '@/components/forms';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useLogin } from '@/hooks/useAuth';
import { getApiFieldErrors } from '@/lib/apiError';
import { withNext } from '@/lib/authRedirect';
import type { ILoginPayload } from '@/types';
import { loginSchema, type LoginFormValues } from '../_schemas';
import { AuthDivider, AuthHeader } from './AuthHeader';
import { DemoAccounts } from './DemoAccounts';
import { GoogleButton } from './GoogleButton';

// Kode `?error=` dari backend setelah login Google gagal.
const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  google: 'Login Google gagal atau dibatalkan. Silakan coba lagi.',
  account_disabled: 'Akun kamu dinonaktifkan. Hubungi tim Simula untuk bantuan.',
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get('next');
  const errorCode = searchParams.get('error');
  const login = useLogin(next);

  useEffect(() => {
    if (!errorCode) return;
    // id tetap agar toast tidak muncul dua kali saat effect dijalankan ulang.
    toast.error(LOGIN_ERROR_MESSAGES[errorCode] ?? LOGIN_ERROR_MESSAGES.google, {
      id: 'login-error',
    });
  }, [errorCode]);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = (values: ILoginPayload) =>
    login.mutate(values, {
      onError: (error) =>
        getApiFieldErrors(error).forEach(({ field, message }) =>
          setError(field as keyof LoginFormValues, { message })
        ),
    });

  const handleDemoSelect = (payload: ILoginPayload) => {
    setValue('email', payload.email);
    setValue('password', payload.password);
    submit(payload);
  };

  return (
    <div className="grid gap-7">
      <AuthHeader
        title="Selamat datang kembali"
        description="Masuk untuk melanjutkan case study dan melihat hasil penilaianmu."
      />

      <GoogleButton next={next} isDisabled={login.isPending} />
      <AuthDivider />

      <form onSubmit={handleSubmit(submit)} className="grid gap-4" noValidate>
        <TextField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          id="password"
          label="Kata sandi"
          autoComplete="current-password"
          placeholder="Masukkan kata sandi"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" size="pill-lg" className="mt-2 w-full" disabled={login.isPending}>
          {login.isPending && <Loader2 className="animate-spin" />}
          {login.isPending ? 'Memproses…' : 'Masuk'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted">
        Belum punya akun?{' '}
        <Link
          href={withNext(PATHS.register, next)}
          className="font-semibold text-brand underline-offset-4 hover:underline"
        >
          Daftar gratis
        </Link>
      </p>

      <DemoAccounts onSelect={handleDemoSelect} isDisabled={login.isPending} />
    </div>
  );
}
