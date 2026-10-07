'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button, Switch } from '@/components/ui';
import { NOTIFICATION_CHANNELS, NOTIFICATION_EVENTS } from '@/constants/profile';
import { useUpdateNotifications } from '@/hooks/useProfile';
import type { TNotificationChannel, TNotificationEvent, TNotificationPreferences } from '@/types';
import { SettingsSection } from './SettingsSection';

// Matriks jenis notifikasi × kanal (CONTEXT.md 4.12). Disimpan sekali lewat tombol, bukan per klik.
export function NotificationsForm({ initial }: { initial: TNotificationPreferences }) {
  const updateNotifications = useUpdateNotifications();
  const [saved, setSaved] = useState(initial);
  const [prefs, setPrefs] = useState(initial);
  const isDirty = JSON.stringify(prefs) !== JSON.stringify(saved);

  const toggle = (event: TNotificationEvent, channel: TNotificationChannel, isOn: boolean) =>
    setPrefs((current) => ({ ...current, [event]: { ...current[event], [channel]: isOn } }));

  const handleSave = () =>
    updateNotifications.mutate(prefs, {
      onSuccess: (profile) => setSaved(profile.notifications),
    });

  return (
    <SettingsSection
      id="notifications"
      title="Notifikasi"
      description="Pilih kabar yang dikirim ke email dan yang muncul di dashboard."
    >
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-3 border-b border-line bg-surface-soft/60 px-5 py-2.5 text-xs text-ink-subtle sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem]">
          <span>Jenis</span>
          {NOTIFICATION_CHANNELS.map((channel) => (
            <span key={channel.value} className="text-center">
              {channel.label}
            </span>
          ))}
        </div>
        <ul className="divide-y divide-line">
          {NOTIFICATION_EVENTS.map((event) => (
            <li
              key={event.value}
              className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-center gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem]"
            >
              <div className="min-w-0">
                <p id={`notif-${event.value}`} className="text-sm font-medium text-ink">
                  {event.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-subtle">
                  {event.description}
                </p>
              </div>
              {NOTIFICATION_CHANNELS.map((channel) => (
                <div key={channel.value} className="flex justify-center">
                  <Switch
                    checked={prefs[event.value][channel.value]}
                    onCheckedChange={(isOn) => toggle(event.value, channel.value, isOn)}
                    aria-label={`${event.label} lewat ${channel.label.toLowerCase()}`}
                  />
                </div>
              ))}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
          <p className="text-xs text-ink-subtle">
            Email penting soal akun dan keamanan tetap dikirim.
          </p>
          <div className="flex items-center gap-2">
            {isDirty && (
              <Button
                variant="ghost"
                size="pill"
                className="text-ink-muted"
                onClick={() => setPrefs(saved)}
                disabled={updateNotifications.isPending}
              >
                Batalkan
              </Button>
            )}
            <Button
              size="pill"
              onClick={handleSave}
              disabled={!isDirty || updateNotifications.isPending}
            >
              {updateNotifications.isPending && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
