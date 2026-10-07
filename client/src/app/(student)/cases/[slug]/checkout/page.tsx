import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CheckoutView } from './_components/CheckoutView';

export async function generateMetadata({ params }: PageProps<'/cases/[slug]/checkout'>) {
  const { slug } = await params;
  return createPageMetadata({
    title: 'Checkout',
    description: 'Ringkasan pesanan dan pembayaran B2B Case Study.',
    path: PATHS.caseCheckout(decodeURIComponent(slug)),
    noIndex: true,
  });
}

export default async function CaseCheckoutPage({ params }: PageProps<'/cases/[slug]/checkout'>) {
  const { slug } = await params;
  return <CheckoutView slug={decodeURIComponent(slug)} />;
}
