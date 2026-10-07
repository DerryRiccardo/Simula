import Image from 'next/image';
import Link from 'next/link';

import { BRAND_ASSETS } from '@/constants/brand';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** true = versi terang untuk latar gelap (simula-logo-dark.svg). */
  isInverted?: boolean;
}

// Logo Simula (simbol + wordmark) yang menautkan ke beranda.
export function Logo({ className, isInverted = false }: LogoProps) {
  return (
    <Link
      href={PATHS.home}
      className={cn('flex shrink-0 items-center', className)}
      aria-label={`${SITE.name}, ke beranda`}
    >
      <BrandLogo isInverted={isInverted} />
    </Link>
  );
}

interface BrandLogoProps {
  className?: string;
  isInverted?: boolean;
}

/** Logo tanpa tautan, misalnya untuk dokumen sertifikat. Tinggi bawaan 32px. */
export function BrandLogo({ className, isInverted = false }: BrandLogoProps) {
  const asset = isInverted ? BRAND_ASSETS.logoOnDark : BRAND_ASSETS.logo;
  return (
    <Image
      src={asset.src}
      alt={SITE.name}
      width={asset.width}
      height={asset.height}
      priority
      unoptimized
      className={cn('h-8 w-auto', className)}
    />
  );
}
