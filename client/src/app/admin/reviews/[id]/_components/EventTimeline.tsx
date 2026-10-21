import { formatDateTime } from '@/lib/formatters';
import type { IStatusEvent, TStatusEventType } from '@/types';

const EVENT_LABEL: Record<TStatusEventType, (event: IStatusEvent) => string> = {
  paid: () => 'Pembayaran berhasil',
  started: () => 'Mulai mengerjakan',
  submitted: (event) =>
    event.attempt && event.attempt > 1 ? `Submit ulang (percobaan ${event.attempt})` : 'Submit',
  revision_requested: () => 'Dikembalikan untuk revisi',
  reviewed: () => 'Dinilai',
  retried: () => 'Mencoba lagi',
};

// Riwayat enrollment dari yang terbaru, untuk menelusuri keluhan peserta.
export function EventTimeline({ events }: { events: IStatusEvent[] }) {
  if (events.length === 0) return null;
  const ordered = [...events].reverse();

  return (
    <section aria-labelledby="event-timeline" className="rounded-card border border-line bg-white">
      <h2
        id="event-timeline"
        className="border-b border-line px-5 py-3.5 text-[0.9375rem] md:text-[0.9375rem]"
      >
        Riwayat
      </h2>
      <ol className="grid px-5 py-4">
        {ordered.map((event, index) => (
          <li key={`${event.type}-${event.at}`} className="relative flex gap-3 pb-4 last:pb-0">
            {index < ordered.length - 1 && (
              <span
                className="absolute top-3 bottom-0 left-[0.21875rem] w-px bg-line"
                aria-hidden="true"
              />
            )}
            <span
              className="relative mt-1.5 size-2 shrink-0 rounded-full bg-ink-subtle"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className="text-[0.8125rem] text-ink">{EVENT_LABEL[event.type](event)}</p>
              <time dateTime={event.at} className="font-mono text-xs text-ink-subtle tabular-nums">
                {formatDateTime(event.at)}
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
