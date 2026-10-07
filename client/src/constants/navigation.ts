import { PATHS } from './paths';

// Anchor section di landing page. Ditulis dengan "/" di depan agar tetap berfungsi dari halaman lain.
export const LANDING_SECTIONS = {
  products: 'products',
  howItWorks: 'cara-kerja',
  reviewers: 'reviewer',
  benefits: 'keunggulan',
  testimonials: 'testimoni',
  forCompanies: 'untuk-perusahaan',
  faq: 'faq',
} as const;

export const MARKETING_NAV = [
  { label: 'Keunggulan', id: LANDING_SECTIONS.benefits },
  { label: 'Products', id: LANDING_SECTIONS.products },
  { label: 'Cara Kerja', id: LANDING_SECTIONS.howItWorks },
  { label: 'Reviewer', id: LANDING_SECTIONS.reviewers },
  { label: 'Untuk Perusahaan', id: LANDING_SECTIONS.forCompanies },
  { label: 'FAQ', id: LANDING_SECTIONS.faq },
].map((item) => ({ ...item, href: `${PATHS.home}#${item.id}` }));
