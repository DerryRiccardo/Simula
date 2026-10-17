'use client';

import { GraduationCap, ShieldCheck, UserCheck, type LucideIcon } from 'lucide-react';

import { shouldMockService } from '@/lib/env';
import { DEMO_EMAILS, DEMO_PASSWORD } from '@/mocks/demoAccounts';
import type { ILoginPayload, TRole } from '@/types';

// Panel masuk cepat untuk presentasi; hanya muncul saat auth memakai data tiruan.
const DEMO_ACCOUNTS: { role: TRole; label: string; icon: LucideIcon }[] = [
  { role: 'student', label: 'Mahasiswa', icon: GraduationCap },
  { role: 'reviewer', label: 'Reviewer', icon: UserCheck },
  { role: 'admin', label: 'Admin', icon: ShieldCheck },
];

interface DemoAccountsProps {
  onSelect: (payload: ILoginPayload) => void;
  isDisabled?: boolean;
}

export function DemoAccounts({ onSelect, isDisabled = false }: DemoAccountsProps) {
  if (!shouldMockService('auth')) return null;

  return (
    <div className="rounded-card border border-dashed border-line bg-surface-soft p-4">
      <p className="text-xs font-medium text-ink">Mode demo</p>
      <p className="mt-0.5 text-xs text-ink-subtle">Masuk cepat tanpa mengisi form:</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = account.icon;
          return (
            <button
              key={account.role}
              type="button"
              disabled={isDisabled}
              onClick={() =>
                onSelect({ email: DEMO_EMAILS[account.role], password: DEMO_PASSWORD })
              }
              className="flex flex-col items-center gap-1.5 rounded-control border border-line bg-white px-2 py-3 text-xs font-medium text-ink-muted transition-[color,border-color,transform] outline-none hover:border-brand-muted hover:text-brand focus-visible:ring-3 focus-visible:ring-brand/30 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            >
              <Icon className="size-4" />
              {account.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
