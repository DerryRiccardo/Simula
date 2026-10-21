import { History } from 'lucide-react';

import { formatDateTime } from '@/lib/formatters';
import type { ISettingsLogEntry } from '@/types';

// Riwayat perubahan pengaturan: siapa, kapan, dan nilai lama ke nilai baru.
export function SettingsLog({ entries }: { entries: ISettingsLogEntry[] }) {
  return (
    <section aria-labelledby="settings-log" className="rounded-card border border-line bg-white">
      <h2
        id="settings-log"
        className="border-b border-line px-5 py-3.5 text-[0.9375rem] md:text-[0.9375rem]"
      >
        Riwayat perubahan
      </h2>
      {entries.length === 0 ? (
        <p className="flex items-start gap-2.5 px-5 py-5 text-sm text-ink-muted">
          <History className="mt-0.5 size-4 shrink-0 text-ink-subtle" />
          Belum ada perubahan. Semua nilai masih memakai bawaan platform.
        </p>
      ) : (
        <ol className="divide-y divide-line">
          {entries.map((entry) => (
            <li key={entry.id} className="px-5 py-4">
              <p className="text-sm text-ink">
                <span className="font-medium">{entry.actorName}</span>{' '}
                <span className="text-ink-muted">mengubah {entry.changes.length} nilai</span>
              </p>
              <time dateTime={entry.at} className="font-mono text-xs text-ink-subtle tabular-nums">
                {formatDateTime(entry.at)}
              </time>
              <ul className="mt-2.5 grid gap-1.5">
                {entry.changes.map((change) => (
                  <li key={change.key} className="text-[0.8125rem] leading-snug">
                    <span className="text-ink-muted">{change.label}</span>
                    <span className="mt-0.5 block font-mono text-xs text-ink tabular-nums">
                      <span className="text-ink-subtle line-through">{change.from}</span>
                      <span className="mx-1.5 text-ink-subtle" aria-hidden="true">
                        →
                      </span>
                      <span className="sr-only"> menjadi </span>
                      {change.to}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
