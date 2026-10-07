'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Menu, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { MARKETING_NAV } from '@/constants/navigation';
import { PATHS } from '@/constants/paths';
import { useActiveSection, useCurrentUser, useLockBodyScroll, useScrolled } from '@/hooks';
import { getPostAuthPath } from '@/lib/authRedirect';
import { cn } from '@/lib/utils';
import { Container } from './Container';
import { Logo } from './Logo';

const SECTION_IDS = MARKETING_NAV.map((item) => item.id);
const MOBILE_MENU_ID = 'mobile-menu';

export function Navbar() {
  const pathname = usePathname();
  const isScrolled = useScrolled();
  const activeId = useActiveSection(SECTION_IDS);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user } = useCurrentUser();
  useLockBodyScroll(isMenuOpen);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMenuOpen]);

  const isLanding = pathname === PATHS.home;
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300',
        isScrolled || isMenuOpen
          ? 'border-b border-line bg-white/85 shadow-[0_1px_12px_rgb(17_24_39/0.04)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <Container className="flex h-16 items-center justify-between gap-6 lg:h-[4.5rem]">
        <Logo />

        <nav aria-label="Navigasi utama" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {MARKETING_NAV.map((item) => {
              const isActive = isLanding && activeId === item.id;
              return (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'relative rounded-full px-3.5 py-2 text-sm whitespace-nowrap transition-colors',
                      isActive ? 'text-brand' : 'text-ink-muted hover:text-ink'
                    )}
                  >
                    {item.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active"
                        className="absolute inset-0 -z-10 rounded-full bg-brand-soft"
                        transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          {user ? (
            <Button asChild size="pill" className="group">
              <Link href={getPostAuthPath(user)}>
                Buka Dashboard
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="pill">
                <Link href={PATHS.login}>Masuk</Link>
              </Button>
              <Button asChild size="pill" className="group">
                <Link href={PATHS.register}>
                  Mulai Gratis
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon-lg"
          className="xl:hidden"
          aria-label={isMenuOpen ? 'Tutup menu' : 'Buka menu'}
          aria-expanded={isMenuOpen}
          aria-controls={MOBILE_MENU_ID}
          onClick={() => setIsMenuOpen((open) => !open)}
        >
          {isMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </Button>
      </Container>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            id={MOBILE_MENU_ID}
            className="h-[calc(100dvh-4rem)] overflow-y-auto border-t border-line bg-white lg:h-[calc(100dvh-4.5rem)] xl:hidden"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Container className="flex flex-col gap-1 py-6">
              <nav aria-label="Navigasi utama (seluler)">
                <ul className="flex flex-col">
                  {MARKETING_NAV.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        onClick={closeMenu}
                        className="flex items-center justify-between border-b border-line py-4 text-base text-ink"
                      >
                        {item.label}
                        <ArrowRight className="size-4 text-ink-subtle" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-6 grid gap-3">
                {user ? (
                  <Button asChild size="pill-lg">
                    <Link href={getPostAuthPath(user)} onClick={closeMenu}>
                      Buka Dashboard
                    </Link>
                  </Button>
                ) : (
                  <>
                    <Button asChild size="pill-lg">
                      <Link href={PATHS.register} onClick={closeMenu}>
                        Mulai Gratis
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="pill-lg">
                      <Link href={PATHS.login} onClick={closeMenu}>
                        Masuk
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
