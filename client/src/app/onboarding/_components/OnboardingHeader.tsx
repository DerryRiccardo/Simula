'use client';

import { LogOut } from 'lucide-react';

import { Container, Logo } from '@/components/layout';
import { Button } from '@/components/ui';
import { useLogout } from '@/hooks/useAuth';

export function OnboardingHeader() {
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
