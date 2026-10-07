'use client';

import { Loader2 } from 'lucide-react';

import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { Button } from '@/components/ui';
import { useGoogleLogin } from '@/hooks/useAuth';

interface GoogleButtonProps {
  next: string | null;
  isDisabled?: boolean;
}

export function GoogleButton({ next, isDisabled = false }: GoogleButtonProps) {
  const googleLogin = useGoogleLogin(next);

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
      Lanjutkan dengan Google
    </Button>
  );
}
