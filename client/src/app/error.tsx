'use client';

import Link from 'next/link';
import { RotateCcw } from 'lucide-react';

import { Logo } from '@/components/layout';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';

interface ErrorPageProps {
  error: Error & { digest?: string };
  retry: () => void;
}

export default function ErrorPage({ error, retry }: ErrorPageProps) {
  return (
    <main className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden px-4">
      <div
        className="absolute inset-0 -z-10 bg-grid mask-fade-radial opacity-60"
        aria-hidden="true"
      />

      <header className="mx-auto flex h-16 w-full max-w-5xl items-center">
        <Logo />
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center pb-24 text-center">
        <h1 className="text-page-title">Halaman gagal dimuat</h1>
        <p className="mt-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
          Ada kendala saat menyiapkan halaman ini. Coba muat ulang, atau kembali ke beranda.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-ink-subtle">Kode: {error.digest}</p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button size="pill-lg" className="active:scale-[0.98]" onClick={() => retry()}>
            <RotateCcw />
            Coba lagi
          </Button>
          <Button asChild variant="outline" size="pill-lg">
            <Link href={PATHS.home}>Ke beranda</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
