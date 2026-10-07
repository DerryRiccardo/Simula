import { Check, LoaderCircle } from 'lucide-react';

import { formatTime } from '@/lib/formatters';

const STATUS_CLASS = 'flex items-center gap-1.5 text-xs text-ink-subtle';

interface DraftStatusProps {
  isSaving: boolean;
  savedAt: string | null;
}

/** Penanda simpan otomatis di samping tombol kirim. */
export function DraftStatus({ isSaving, savedAt }: DraftStatusProps) {
  if (isSaving) {
    return (
      <p className={STATUS_CLASS} aria-live="polite">
        <LoaderCircle className="size-3.5 motion-safe:animate-spin" />
        Menyimpan draft
      </p>
    );
  }
  if (!savedAt) return null;
  return (
    <p className={STATUS_CLASS} aria-live="polite">
      <Check className="size-3.5" />
      Draft tersimpan <span className="font-mono tabular-nums">{formatTime(savedAt)}</span>
    </p>
  );
}
