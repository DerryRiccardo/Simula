import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { AuthShowcase } from './_components/AuthShowcase';

// Dua panel berbingkai berdampingan dengan proporsi hampir setara. Mulai lebar tablet tinggi
// keduanya dikunci setinggi viewport: panel form menggulir di dalam bingkainya sendiri,
// panel brand diam di tempat.
export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="grid min-h-dvh flex-1 gap-3 p-3 md:h-dvh md:max-h-dvh md:min-h-0 md:grid-cols-2 md:grid-rows-[minmax(0,1fr)] md:overflow-hidden lg:grid-cols-[minmax(0,0.94fr)_minmax(0,1.06fr)]">
      <div className="flex min-h-[calc(100dvh-1.5rem)] flex-col rounded-3xl border border-line bg-white px-5 py-5 sm:px-8 md:min-h-0 md:[scrollbar-width:thin] md:overflow-y-auto lg:px-10">
        <header>
          <Link
            href={PATHS.home}
            className="group inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-ink"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Beranda
          </Link>
        </header>

        <main className="@container mx-auto w-full max-w-[28rem] flex-1 py-12 md:py-10">
          {children}
        </main>

        <footer className="text-center text-xs text-ink-subtle md:text-left">
          © {new Date().getFullYear()} {SITE.name}
        </footer>
      </div>
      <AuthShowcase />
    </div>
  );
}
