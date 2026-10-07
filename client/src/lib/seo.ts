import type { Metadata } from 'next';

import { SITE } from '@/constants/site';

interface PageMetadataOptions {
  title: string;
  description?: string;
  path: string;
  ogImage?: string;
  type?: 'website' | 'article';
  noIndex?: boolean;
  /** true = judul dipakai apa adanya tanpa template "%s | Nama Situs" (mis. beranda). */
  isAbsoluteTitle?: boolean;
}

export function createPageMetadata({
  title,
  description = SITE.description,
  path,
  ogImage,
  type = 'website',
  noIndex = false,
  isAbsoluteTitle = false,
}: PageMetadataOptions): Metadata {
  const images = ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : undefined;

  return {
    title: isAbsoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type,
      siteName: SITE.name,
      locale: SITE.locale,
      images,
    },
    twitter: { card: 'summary_large_image', title, description, images },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}
