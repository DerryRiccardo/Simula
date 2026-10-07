import type { MetadataRoute } from 'next';

import { env } from '@/lib/env';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/dashboard',
        '/cases',
        '/my-cases',
        '/my-certificates',
        '/onboarding',
        '/profile',
        '/reviewer',
        '/admin',
      ],
    },
    sitemap: `${env.siteUrl}/sitemap.xml`,
  };
}
