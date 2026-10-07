import {
  Benefits,
  Faq,
  FinalCta,
  ForCompanies,
  Hero,
  HowItWorks,
  PartnerMarquee,
  Products,
  Reviewers,
  Stats,
  Testimonials,
} from '@/components/landing';
import { PATHS } from '@/constants/paths';
import { SITE } from '@/constants/site';
import { env } from '@/lib/env';
import { createPageMetadata } from '@/lib/seo';
import { FAQS } from './_data';

export const metadata = createPageMetadata({
  title: `${SITE.name} — ${SITE.tagline}`,
  path: PATHS.home,
  isAbsoluteTitle: true,
});

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      name: SITE.name,
      url: env.siteUrl,
      email: SITE.email,
      description: SITE.description,
    },
    { '@type': 'WebSite', name: SITE.name, url: env.siteUrl, inLanguage: 'id-ID' },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        // Data internal statis, bukan input user.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <Hero />
      <Stats />
      <PartnerMarquee />
      <Benefits />
      <Products />
      <HowItWorks />
      <Reviewers />
      <Testimonials />
      <ForCompanies />
      <Faq />
      <FinalCta />
    </>
  );
}
