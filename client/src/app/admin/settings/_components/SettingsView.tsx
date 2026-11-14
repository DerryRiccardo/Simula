'use client';

import { ErrorState, Skeleton } from '@/components';
import { PageHeading } from '@/components/student';
import { useAdminSettings } from '@/hooks/useAdminPlatform';
import { SettingsForm } from './SettingsForm';
import { SettingsLog } from './SettingsLog';

const SETTINGS_GRID = 'grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]';

// Pengaturan (CONTEXT.md 4.13): nilai bawaan platform yang sebelumnya konstanta di kode.
export function SettingsView() {
  const { data: settings, isLoading, isError, refetch } = useAdminSettings();

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8">
      <PageHeading
        title="Pengaturan"
        description="Nilai bawaan yang berlaku untuk seluruh platform. Ubah dengan hati-hati: sebagian nilai adalah janji ke peserta, misalnya SLA review dan batas revisi."
      />

      {isLoading ? (
        <div className={SETTINGS_GRID} role="status" aria-label="Memuat">
          <div className="grid gap-6">
            <Skeleton className="h-64 rounded-card" />
            <Skeleton className="h-56 rounded-card" />
          </div>
          <Skeleton className="h-48 rounded-card" />
        </div>
      ) : isError || !settings ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <div className={SETTINGS_GRID}>
          <div className="min-w-0">
            <SettingsForm settings={settings} />
          </div>
          <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <SettingsLog entries={settings.log} />
          </aside>
        </div>
      )}
    </div>
  );
}
