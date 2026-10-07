import Link from 'next/link';

import { MARKETING_NAV } from '@/constants/navigation';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { Container } from './Container';
import { Logo } from './Logo';

const FOOTER_COLUMNS = [
  {
    title: 'Products',
    links: [
      { label: 'AI Case Study', href: `${PATHS.cases}?tier=ai` },
      { label: 'B2B Case Study', href: `${PATHS.cases}?tier=b2b` },
      { label: 'Jelajahi Case', href: PATHS.cases },
    ],
  },
  {
    title: 'Platform',
    links: MARKETING_NAV.filter((item) => item.label !== 'Products').map(({ label, href }) => ({
      label,
      href,
    })),
  },
  {
    title: 'Kontak',
    links: [
      { label: SITE.email, href: `mailto:${SITE.email}` },
      { label: 'Instagram', href: '#' },
      { label: 'LinkedIn', href: '#' },
    ],
  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="overflow-hidden border-t border-line bg-white">
      <Container className="grid gap-12 py-16 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            Pengalaman kerja tersimulasi untuk mahasiswa tingkat akhir dan fresh graduate di
            Indonesia.
          </p>
        </div>
        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title}>
            <h2 className="text-xs font-semibold tracking-widest text-ink uppercase md:text-xs">
              {column.title}
            </h2>
            <ul className="mt-4 grid gap-3">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-brand"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <Container className="flex flex-col gap-3 border-t border-line py-6 text-xs text-ink-subtle sm:flex-row sm:justify-between">
        <p>
          © {year} {SITE.name}. Prototype.
        </p>
        <p>Dibuat untuk mahasiswa dan fresh graduate Indonesia.</p>
      </Container>

      <p
        aria-hidden="true"
        className="pointer-events-none -mb-[0.22em] bg-linear-to-b from-brand-soft to-white bg-clip-text text-center text-[17vw] leading-none font-semibold tracking-tighter whitespace-nowrap text-transparent select-none"
      >
        {SITE.name}
      </p>
    </footer>
  );
}
