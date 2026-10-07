import { PATHS } from '@/constants/paths';
import { createPageMetadata } from '@/lib/seo';
import { CertificateView } from './_components/CertificateView';

export async function generateMetadata({ params }: PageProps<'/certificates/[id]'>) {
  const { id } = await params;
  const certificateId = decodeURIComponent(id);
  return createPageMetadata({
    title: `Verifikasi Sertifikat ${certificateId}`,
    description: 'Cek keaslian sertifikat kelulusan case study dari Simula.',
    path: PATHS.certificate(certificateId),
    // Berisi nama penerima; dibagikan lewat tautan, tidak untuk diindeks mesin pencari.
    noIndex: true,
  });
}

export default async function CertificatePage({ params }: PageProps<'/certificates/[id]'>) {
  const { id } = await params;
  return <CertificateView id={decodeURIComponent(id)} />;
}
