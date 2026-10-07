'use client';

import { useState } from 'react';
import { Info, X } from 'lucide-react';

const STORAGE_KEY = 'ws-dismiss-welcome-banner';

function readIsDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// Halaman dashboard hanya dirender di client (di balik RequireAuth), jadi aman membaca localStorage.
export function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(() => !readIsDismissed());
  if (!isVisible) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Abaikan: banner tetap tertutup selama sesi ini.
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-card border border-brand-muted bg-brand-soft py-3 pr-3 pl-4 text-sm">
      <Info className="mt-0.5 size-4 shrink-0 text-brand" />
      <p className="flex-1 text-ink">
        <span className="font-semibold">Akunmu sudah aktif.</span>{' '}
        <span className="text-ink-muted">
          Rekomendasi case di bawah mengikuti bidang pilihanmu, dan AI Case Study selalu gratis.
        </span>
      </p>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup pemberitahuan"
        className="grid size-7 shrink-0 place-items-center rounded-tag text-ink-subtle transition-colors hover:bg-white hover:text-ink focus-visible:ring-3 focus-visible:ring-brand/30 focus-visible:outline-none"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
