import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { Logo } from '@/components/layout';
import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-1 flex-col overflow-hidden px-4">
      <div
        className="absolute inset-0 -z-10 bg-grid mask-fade-radial opacity-60"
        aria-hidden="true"
      />
      <div
        className="absolute -top-48 left-1/2 -z-10 size-[34rem] -translate-x-1/2 rounded-full bg-brand-soft blur-3xl"
        aria-hidden="true"
      />

      <header className="mx-auto flex h-16 w-full max-w-5xl items-center">
        <Logo />
      </header>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center pb-24 text-center">
        <p className="font-mono text-sm text-ink-subtle tabular-nums">404</p>
        <h1 className="mt-3 text-page-title">Halaman tidak ditemukan</h1>
        <p className="mt-3 max-w-[48ch] text-[0.9375rem] leading-relaxed text-pretty text-ink-muted">
          Tautannya mungkin salah ketik, atau halamannya sudah dipindahkan.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="pill-lg" className="group active:scale-[0.98]">
            <Link href={PATHS.home}>
              <ArrowLeft className="transition-transform group-hover:-translate-x-0.5" />
              Kembali ke beranda
            </Link>
          </Button>
          <Button asChild variant="outline" size="pill-lg">
            <Link href={PATHS.dashboard}>Buka dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
