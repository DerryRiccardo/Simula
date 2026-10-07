'use client';

import { Loader2, LogOut } from 'lucide-react';

import { ErrorState, Skeleton } from '@/components';
import { PageHeading } from '@/components/student';
import { Button } from '@/components/ui';
import { FIELD_BY_KEY } from '@/constants/fields';
import { STUDENT_STATUS_OPTIONS } from '@/constants/studentStatus';
import { useLogout } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { getInitials } from '@/lib/formatters';
import type { IProfile } from '@/types';
import { DataSharingSection } from './DataSharingSection';
import { DetailsForm } from './DetailsForm';
import { NotificationsForm } from './NotificationsForm';
import { SettingsSection } from './SettingsSection';

function ProfileSkeleton() {
  return (
    <div className="grid gap-10" role="status" aria-label="Memuat">
      <Skeleton className="h-20 rounded-card" />
      {[0, 1, 2].map((index) => (
        <div key={index} className="grid gap-5 lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-10">
          <div className="grid content-start gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-56 rounded-card" />
        </div>
      ))}
    </div>
  );
}

// Ringkasan identitas seperti yang dilihat mitra setelah kamu mengizinkan berbagi profil.
function IdentitySummary({ profile }: { profile: IProfile }) {
  const { user, institution } = profile;
  const status = STUDENT_STATUS_OPTIONS.find((option) => option.value === user.studentStatus);
  const meta = [status?.label, user.major, institution].filter(Boolean).join(', ');

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-card border border-line bg-white p-5">
      <span className="grid size-12 shrink-0 place-items-center rounded-control bg-brand text-base font-semibold text-white">
        {getInitials(user.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-semibold text-ink">{user.name}</p>
        <p className="truncate text-sm text-ink-muted">{meta || user.email}</p>
      </div>
      {user.fieldKeys.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {user.fieldKeys.map((key) => (
            <li
              key={key}
              className="rounded-tag bg-surface-soft px-2 py-1 text-xs font-medium text-ink-muted"
            >
              {FIELD_BY_KEY[key]?.label ?? key}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AccountSection({ email }: { email: string }) {
  const logout = useLogout();
  return (
    <SettingsSection id="account" title="Akun" description="Sesi masuk di perangkat ini.">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-line bg-white p-5">
        <div className="min-w-0">
          <p className="text-xs text-ink-subtle">Masuk sebagai</p>
          <p className="mt-0.5 truncate text-sm font-medium text-ink">{email}</p>
        </div>
        <Button
          variant="outline"
          size="pill"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
        >
          {logout.isPending ? <Loader2 className="animate-spin" /> : <LogOut />}
          Keluar
        </Button>
      </div>
    </SettingsSection>
  );
}

export function ProfileView() {
  const { data: profile, isLoading, isError, refetch } = useProfile();

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 pb-10">
      <PageHeading
        title="Profil"
        description="Atur data diri, bidang, notifikasi, dan izin berbagi profil ke perusahaan mitra."
      />

      {isLoading ? (
        <ProfileSkeleton />
      ) : isError || !profile ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-10">
          <IdentitySummary profile={profile} />
          <DetailsForm profile={profile} />
          <NotificationsForm initial={profile.notifications} />
          <DataSharingSection profile={profile} />
          <AccountSection email={profile.user.email} />
        </div>
      )}
    </div>
  );
}
