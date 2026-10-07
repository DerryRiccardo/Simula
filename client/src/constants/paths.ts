// Satu sumber untuk semua URL halaman. Rute mengikuti peta halaman di prototype/CONTEXT.md bagian 5.
export const PATHS = {
  home: '/',
  productAi: '/products/ai-case-study',
  productB2b: '/products/b2b-case-study',
  login: '/login',
  register: '/register',
  onboarding: '/onboarding',

  cases: '/cases',
  caseDetail: (slug: string) => `/cases/${encodeURIComponent(slug)}`,
  caseCheckout: (slug: string) => `/cases/${encodeURIComponent(slug)}/checkout`,
  caseWork: (slug: string) => `/cases/${encodeURIComponent(slug)}/work`,
  caseStatus: (slug: string) => `/cases/${encodeURIComponent(slug)}/status`,
  caseResult: (slug: string) => `/cases/${encodeURIComponent(slug)}/result`,
  certificate: (id: string) => `/certificates/${encodeURIComponent(id)}`,

  dashboard: '/dashboard',
  myCases: '/my-cases',
  myCertificates: '/my-certificates',
  profile: '/profile',

  reviewer: '/reviewer',
  reviewerSubmission: (id: string) => `/reviewer/submissions/${encodeURIComponent(id)}`,

  admin: '/admin/cases',
  adminCaseNew: '/admin/cases/new',
  adminCaseEdit: (id: string) => `/admin/cases/${encodeURIComponent(id)}/edit`,
  adminReviewers: '/admin/reviewers',
} as const;
