import { ENROLLMENT_STATUS, type TStatusTone } from '@/constants/enrollmentStatus';
import { cn } from '@/lib/utils';
import type { TEnrollmentStatus, TTier } from '@/types';

// Tag kecil bersudut 6px. Warna hanya dari palet: netral, biru brand, hijau (lulus / AI).
const TAG_BASE =
  'inline-flex items-center rounded-tag px-2 py-0.5 text-[0.6875rem] leading-5 font-medium whitespace-nowrap';

const TONE_CLASS: Record<TStatusTone, string> = {
  neutral: 'bg-surface-soft text-ink-muted',
  brand: 'bg-brand-soft text-brand',
  // Butuh tindakan: bergaris, agar menonjol tanpa blok warna solid.
  attention: 'bg-white text-brand ring-1 ring-inset ring-brand/50 font-semibold',
  success: 'bg-ai-soft text-ai',
};

interface StatusBadgeProps {
  status: TEnrollmentStatus;
  /** Label dan warna dari sudut pandang lain, misalnya reviewer ("Dikembalikan"). */
  label?: string;
  tone?: TStatusTone;
}

export function StatusBadge({ status, label, tone }: StatusBadgeProps) {
  const meta = ENROLLMENT_STATUS[status];
  return <span className={cn(TAG_BASE, TONE_CLASS[tone ?? meta.tone])}>{label ?? meta.label}</span>;
}

const TIER_LABEL: Record<TTier, string> = { ai: 'AI Case Study', b2b: 'B2B Case Study' };

export function TierBadge({ tier, className }: { tier: TTier; className?: string }) {
  return (
    <span
      className={cn(
        TAG_BASE,
        tier === 'ai' ? 'bg-ai-soft text-ai' : 'bg-b2b-soft text-b2b',
        className
      )}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}
