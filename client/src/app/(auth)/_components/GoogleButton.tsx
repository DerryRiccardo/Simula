'use client';

import { Loader2 } from 'lucide-react';

import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Button } from '@/components/ui';
import { useGoogleLogin } from '@/hooks/useAuth';
import { shouldMockService } from '@/lib/env';
import { authService } from '@/services/auth';

interface GoogleButtonProps {
  next: string | null;
  isDisabled?: boolean;
}

const LABEL = 'Lanjutkan dengan Google';

export function GoogleButton({ next, isDisabled = false }: GoogleButtonProps) {
  const googleLogin = useGoogleLogin(next);

  // Dengan backend, login Google adalah navigasi penuh: backend mengarahkan ke Google, lalu
  // kembali ke halaman tujuan dengan cookie sesi terpasang.
  if (!shouldMockService('auth') && !isDisabled) {
    return (
      <Button asChild variant="outline" size="pill-lg" className="w-full bg-white">
        <a href={authService.googleLoginUrl(next)}>
          <GoogleIcon className="size-4" />
          {LABEL}
        </a>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="pill-lg"
      className="w-full bg-white"
      disabled={isDisabled || googleLogin.isPending}
      onClick={() => googleLogin.mutate()}
    >
      {googleLogin.isPending ? (
        <Loader2 className="animate-spin" />
      ) : (
        <GoogleIcon className="size-4" />
      )}
      {LABEL}
    </Button>
  );
}
