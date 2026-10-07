import type { MetadataRoute } from 'next';

import { PATHS } from '@/constants/paths';
import { env } from '@/lib/env';

// URL dinamis (detail case) ditambahkan setelah service katalog tersedia.
export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [PATHS.home, PATHS.login, PATHS.register];
  return staticPaths.map((path) => ({ url: `${env.siteUrl}${path}`, lastModified: new Date() }));
}
