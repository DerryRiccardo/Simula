'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui';
import { PATHS } from '@/constants/paths';
import { useCurrentUser, useMarkTourSeen } from '@/hooks/useAuth';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import { cn } from '@/lib/utils';

interface ITourStep {
  route: string;
  selector?: string;
  fallbackSelector?: string;
  title: string;
  description: string;
  placement?: 'right' | 'left' | 'bottom' | 'top' | 'auto';
  centered?: boolean;
  ctaLabel?: string;
}

const TOUR_STEPS: ITourStep[] = [
  {
    route: PATHS.dashboard,
    selector: 'aside a[href="/dashboard"]',
    fallbackSelector: 'main h1',
    title: 'Ini halaman Dashboard-mu',
    description:
      'Di sini kamu bisa melihat ringkasan aktivitas belajarmu, case yang sedang dikerjakan, dan progres akunmu di Simula.',
    placement: 'right',
  },
  {
    route: PATHS.cases,
    selector: 'aside li:has(> a[href="/cases"])',
    fallbackSelector: 'aside a[href="/cases"]',
    title: 'Jelajahi AI & B2B Case',
    description:
      'Tersedia AI Case Study (gratis, dinilai otomatis oleh AI) dan B2B Case Study (studi kasus dari mitra industri yang dinilai langsung oleh praktisi).',
    placement: 'right',
  },
  {
    route: PATHS.myCases,
    selector: 'aside li:has(> a[href="/my-cases"])',
    fallbackSelector: 'aside a[href="/my-cases"]',
    title: 'Kelola di Case Saya',
    description:
      'Semua case yang kamu ambil berkumpul di sini. Alurnya singkat: kerjakan brief, submit hasil kerjamu, lalu dapatkan skor dan feedback.',
    placement: 'right',
  },
  {
    route: PATHS.myCertificates,
    selector: 'aside a[href="/my-certificates"]',
    fallbackSelector: 'main h1',
    title: 'Sertifikat Kelulusan',
    description:
      'Setiap case yang berhasil kamu selesaikan dan lulus akan menerbitkan sertifikat resmi yang bisa disimpan atau dibagikan.',
    placement: 'right',
  },
  {
    route: PATHS.cases,
    centered: true,
    title: 'Siap mulai case pertamamu?',
    description:
      'Semua fitur utama sudah kamu lihat. Sekarang yuk pilih satu case sesuai bidangmu dan mulai kerjakan!',
    ctaLabel: 'Mulai pilih case',
  },
];

interface IRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

type TPlacement = 'right' | 'left' | 'bottom' | 'top';

const HIGHLIGHT_PAD = 6;
const VIEWPORT_GAP = 16;
const ARROW_GAP = 14;
const CARD_MAX_WIDTH = 350;
const EST_CARD_HEIGHT = 205;

function findVisibleElement(selector?: string, fallbackSelector?: string): Element | null {
  for (const query of [selector, fallbackSelector]) {
    if (!query) continue;
    try {
      const matches = document.querySelectorAll(query);
      for (const el of matches) {
        const box = el.getBoundingClientRect();
        if (box.width > 0 && box.height > 0) return el;
      }
    } catch {
      // Abaikan selector jika browser tidak mendukung :has().
    }
  }
  return null;
}

function resolvePlacement(
  rect: IRect,
  preferred: ITourStep['placement'],
  vw: number,
  vh: number,
  cardWidth: number
): TPlacement {
  if (preferred && preferred !== 'auto') {
    if (preferred === 'right' && rect.left + rect.width + ARROW_GAP + cardWidth + VIEWPORT_GAP <= vw) {
      return 'right';
    }
    if (preferred === 'left' && rect.left - ARROW_GAP - cardWidth - VIEWPORT_GAP >= 0) {
      return 'left';
    }
    if (preferred === 'bottom' && rect.top + rect.height + ARROW_GAP + EST_CARD_HEIGHT <= vh) {
      return 'bottom';
    }
    if (preferred === 'top' && rect.top - ARROW_GAP - EST_CARD_HEIGHT >= 0) {
      return 'top';
    }
  }
  const spaceBelow = vh - (rect.top + rect.height + HIGHLIGHT_PAD);
  if (spaceBelow >= EST_CARD_HEIGHT + ARROW_GAP) return 'bottom';
  if (rect.top - HIGHLIGHT_PAD >= EST_CARD_HEIGHT + ARROW_GAP) return 'top';
  if (rect.left + rect.width + ARROW_GAP + cardWidth + VIEWPORT_GAP <= vw) return 'right';
  return 'bottom';
}

function getCardGeometry(
  rect: IRect,
  preferred: ITourStep['placement'],
  vw: number,
  vh: number
) {
  const width = Math.min(CARD_MAX_WIDTH, vw - VIEWPORT_GAP * 2);
  const placement = resolvePlacement(rect, preferred, vw, vh, width);

  let top = 0;
  let left = 0;

  if (placement === 'right') {
    left = rect.left + rect.width + HIGHLIGHT_PAD + ARROW_GAP;
    top = Math.max(
      VIEWPORT_GAP,
      Math.min(rect.top + rect.height / 2 - 48, vh - EST_CARD_HEIGHT - VIEWPORT_GAP)
    );
  } else if (placement === 'left') {
    left = rect.left - HIGHLIGHT_PAD - ARROW_GAP - width;
    top = Math.max(
      VIEWPORT_GAP,
      Math.min(rect.top + rect.height / 2 - 48, vh - EST_CARD_HEIGHT - VIEWPORT_GAP)
    );
  } else if (placement === 'top') {
    top = Math.max(VIEWPORT_GAP, rect.top - HIGHLIGHT_PAD - ARROW_GAP - EST_CARD_HEIGHT);
    left = Math.max(
      VIEWPORT_GAP,
      Math.min(rect.left + rect.width / 2 - width / 2, vw - width - VIEWPORT_GAP)
    );
  } else {
    top = Math.min(
      rect.top + rect.height + HIGHLIGHT_PAD + ARROW_GAP,
      vh - EST_CARD_HEIGHT - VIEWPORT_GAP
    );
    left = Math.max(
      VIEWPORT_GAP,
      Math.min(rect.left + rect.width / 2 - width / 2, vw - width - VIEWPORT_GAP)
    );
  }

  return { top, left, width, placement };
}

function TooltipArrow({ placement }: { placement: TPlacement }) {
  const base = 'absolute size-3 rotate-45 border-line bg-white';
  if (placement === 'right') {
    return <span aria-hidden="true" className={cn(base, 'top-8 -left-1.5 border-b border-l')} />;
  }
  if (placement === 'left') {
    return <span aria-hidden="true" className={cn(base, 'top-8 -right-1.5 border-t border-r')} />;
  }
  if (placement === 'top') {
    return (
      <span
        aria-hidden="true"
        className={cn(base, '-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b')}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(base, '-top-1.5 left-1/2 -translate-x-1/2 border-t border-l')}
    />
  );
}

export function StudentOnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const { user } = useCurrentUser();
  const markTourSeen = useMarkTourSeen();

  const [started, setStarted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<IRect | null>(null);

  const canAutoStart = Boolean(
    user && user.role === 'student' && user.isOnboarded && !user.hasSeenTour && !dismissed
  );
  const isOpen = canAutoStart && (started || pathname === PATHS.dashboard);
  const currentStep = TOUR_STEPS[stepIndex];

  // Bekukan scroll halaman selama tour aktif.
  useLockBodyScroll(isOpen);

  const handleClose = useCallback(() => {
    setDismissed(true);
    setStarted(false);
    if (user && !user.hasSeenTour && !markTourSeen.isPending) {
      markTourSeen.mutate();
    }
  }, [user, markTourSeen]);

  const goToStep = useCallback(
    (nextIndex: number) => {
      if (!started) setStarted(true);
      const nextStep = TOUR_STEPS[nextIndex];
      if (!nextStep) {
        handleClose();
        return;
      }
      setStepIndex(nextIndex);
      if (pathname !== nextStep.route) {
        setRect(null);
        router.push(nextStep.route);
      }
    },
    [started, pathname, router, handleClose]
  );

  const measure = useCallback(() => {
    if (!currentStep || currentStep.centered || pathname !== currentStep.route) return;
    const target = findVisibleElement(currentStep.selector, currentStep.fallbackSelector);
    if (!target) return;
    const box = target.getBoundingClientRect();
    setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
  }, [currentStep, pathname]);

  // Saat berpindah halaman, tunggu DOM selesai dimuat lalu sorot elemen target.
  useEffect(() => {
    if (!isOpen || !currentStep || currentStep.centered || pathname !== currentStep.route) {
      return;
    }

    let attempts = 0;
    const tryMeasure = () => {
      const target = findVisibleElement(currentStep.selector, currentStep.fallbackSelector);
      if (target) {
        const box = target.getBoundingClientRect();
        setRect({ top: box.top, left: box.left, width: box.width, height: box.height });
      }
      attempts += 1;
    };

    tryMeasure();
    const interval = window.setInterval(() => {
      tryMeasure();
      if (attempts >= 12) window.clearInterval(interval);
    }, 120);

    window.addEventListener('resize', measure);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
    };
  }, [isOpen, currentStep, pathname, measure]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      } else if (event.key === 'ArrowRight') {
        goToStep(stepIndex + 1);
      } else if (event.key === 'ArrowLeft' && stepIndex > 0) {
        goToStep(stepIndex - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, stepIndex, goToStep, handleClose]);

  if (!isOpen || !currentStep || pathname !== currentStep.route || typeof document === 'undefined') {
    return null;
  }
  if (!currentStep.centered && !rect) {
    return null;
  }

  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const geom =
    !currentStep.centered && rect
      ? getCardGeometry(rect, currentStep.placement, window.innerWidth, window.innerHeight)
      : null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label={`Panduan Simula: ${currentStep.title}`}
      onWheel={(event) => event.preventDefault()}
    >
      {/* Backdrop gelap; untuk step terpusat pakai overlay langsung, untuk spotlight pakai box-shadow */}
      <div
        className={cn('fixed inset-0', currentStep.centered && 'bg-slate-900/45')}
        onClick={handleClose}
        aria-hidden="true"
      />

      {!currentStep.centered && rect && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed rounded-control ring-2 ring-brand"
          initial={false}
          animate={{
            top: rect.top - HIGHLIGHT_PAD,
            left: rect.left - HIGHLIGHT_PAD,
            width: rect.width + HIGHLIGHT_PAD * 2,
            height: rect.height + HIGHLIGHT_PAD * 2,
          }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
          style={{
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.45)',
          }}
        />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={`${stepIndex}-${currentStep.route}`}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.16 }}
          className={cn(
            'fixed z-10 rounded-card border border-line bg-white shadow-xl',
            currentStep.centered
              ? 'top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 p-6'
              : 'p-5'
          )}
          style={geom ? { top: geom.top, left: geom.left, width: geom.width } : undefined}
        >
          {geom && <TooltipArrow placement={geom.placement} />}

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              {currentStep.centered && (
                <span className="grid size-7 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
                  <Sparkles className="size-4" />
                </span>
              )}
              <h3 className="text-[0.9375rem] font-semibold text-ink">{currentStep.title}</h3>
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Tutup panduan"
              className="grid size-6 shrink-0 place-items-center rounded-tag text-ink-subtle transition-colors hover:bg-surface-soft hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </div>

          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-muted">
            {currentStep.description}
          </p>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-1.5"
                aria-label={`Langkah ${stepIndex + 1} dari ${TOUR_STEPS.length}`}
              >
                {TOUR_STEPS.map((step, index) => (
                  <span
                    key={`${step.route}-${index}`}
                    className={cn(
                      'size-1.5 rounded-full transition-colors',
                      index === stepIndex ? 'bg-brand' : 'bg-line'
                    )}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-xs font-medium text-ink-subtle transition-colors hover:text-ink"
              >
                Lewati
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {stepIndex > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => goToStep(stepIndex - 1)}
                >
                  <ArrowLeft className="size-3.5" />
                  Kembali
                </Button>
              )}
              <Button type="button" size="sm" onClick={() => goToStep(stepIndex + 1)}>
                {currentStep.ctaLabel ?? (isLast ? 'Selesai' : 'Lanjut')}
                {!isLast && <ArrowRight className="size-3.5" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
