import { RefreshCw, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui';

interface ErrorStateProps {
  onRetry: () => void;
  title?: string;
  description?: string;
}

export function ErrorState({
  onRetry,
  title = 'Data gagal dimuat',
  description = 'Periksa koneksimu, lalu coba lagi.',
}: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center rounded-card border border-line bg-white px-6 py-16 text-center"
      role="alert"
    >
      <span className="grid size-11 place-items-center rounded-control border border-line bg-surface-soft text-ink-muted">
        <TriangleAlert className="size-5" strokeWidth={1.75} />
      </span>
      <p className="mt-4 text-[0.9375rem] font-semibold text-ink">{title}</p>
      <p className="mt-1.5 text-sm text-ink-muted">{description}</p>
      <Button variant="outline" size="pill" className="mt-6" onClick={onRetry}>
        <RefreshCw />
        Coba lagi
      </Button>
    </div>
  );
}
