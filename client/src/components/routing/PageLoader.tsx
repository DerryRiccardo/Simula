import { Logo } from '@/components/layout/Logo';

// Tampilan sementara saat sesi pengguna sedang dicek.
export function PageLoader() {
  return (
    <div
      className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-6"
      role="status"
      aria-live="polite"
    >
      <Logo />
      <div className="h-1 w-40 overflow-hidden rounded-full bg-surface-soft">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-brand-muted" />
      </div>
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
