'use client';

import { LogOut } from 'lucide-react';

import { Container } from './Container';
import { Logo } from './Logo';
import { Button } from '@/components/ui';
import { useLogout } from '@/hooks/useAuth';

/** Header halaman alur akun (onboarding, ganti kata sandi): logo dan tombol Keluar. */
export function AuthFlowHeader() {
  const logout = useLogout();

  return (
    <header className="border-b border-line bg-white/85 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between">
        <Logo />
        <Button
          variant="ghost"
          size="pill"
          className="text-ink-muted"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          <LogOut />
          Keluar
        </Button>
      </Container>
    </header>
  );
}
