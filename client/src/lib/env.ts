export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  isApiMocking: process.env.NEXT_PUBLIC_API_MOCKING === 'enabled',
} as const;
