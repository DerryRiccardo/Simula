'use client';

import Link from 'next/link';
import { Construction, LogOut } from 'lucide-react';

import { Container, Logo } from '@/components/layout';
import { Button } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { PATHS } from '@/constants/paths';
import { useCurrentUser, useLogout } from '@/hooks/useAuth';
import type { TRole } from '@/types';

const ROLE_LABEL: Record<TRole, string> = {
  student: 'Mahasiswa',
  reviewer: 'Reviewer',
  admin: 'Admin',
};

interface WorkspacePlaceholderProps {
  title: string;
  description: string;
}

// Halaman sementara agar alur login → tujuan per peran bisa didemokan.
// Diganti dengan dashboard/portal sebenarnya pada tahap berikutnya.
export function WorkspacePlaceholder({ title, description }: WorkspacePlaceholderProps) {
  const { user } = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-white">
      <header className="border-b border-line bg-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-muted sm:inline">
              {user.name} · <span className="font-medium text-brand">{ROLE_LABEL[user.role]}</span>
            </span>
            <Button
              variant="outline"
              size="pill"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut />
              Keluar
            </Button>
          </div>
        </Container>
      </header>

      <main className="flex-1 py-16">
        <Container className="max-w-3xl">
          <p className="font-mono text-xs text-ink-subtle">Portal {ROLE_LABEL[user.role]}</p>
          <h1 className="mt-2 text-page-title">
            Hai {user.name.split(' ')[0]}, {title}
          </h1>
          <p className="mt-3 max-w-[60ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
            {description}
          </p>

          {user.fieldKeys.length > 0 && (
            <div className="mt-8 rounded-card border border-line bg-white p-5">
              <p className="text-sm font-medium text-ink">Bidang pilihanmu</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {user.fieldKeys.map((key) => {
                  const field = FIELD_BY_KEY[key];
                  if (!field) return null;
                  const Icon = field.icon;
                  return (
                    <li
                      key={key}
                      className="flex items-center gap-1.5 rounded-tag bg-surface-soft px-2.5 py-1 text-xs font-medium text-ink-muted"
                    >
                      <Icon className="size-3.5" strokeWidth={1.75} />
                      {field.label}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="mt-4 flex items-start gap-4 rounded-card border border-dashed border-line bg-white p-5">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-soft text-ink-muted">
              <Construction className="size-[1.125rem]" strokeWidth={1.75} />
            </span>
            <div>
              <p className="text-sm font-medium text-ink">Halaman ini sedang dibangun</p>
              <p className="mt-1 text-sm text-ink-muted">
                Konten lengkap akan hadir di tahap berikutnya. Sementara itu, kamu bisa kembali ke{' '}
                <Link href={PATHS.home} className="text-brand underline-offset-4 hover:underline">
                  beranda
                </Link>
                .
              </p>
            </div>
          </div>
        </Container>
      </main>
    </div>
  );
}
