const PARTNER_LOGO_BY_KEY: Record<string, string> = {
  astral: '/partner/astral.svg',
  bcaa: '/partner/bcaa.svg',
  belibeli: '/partner/belibeli.svg',
  danah: '/partner/danah.svg',
  halodek: '/partner/halodek.svg',
  kopimemory: '/partner/kopi_memory.svg',
  paragonecorp: '/partner/paragonecorp.svg',
  sayap: '/partner/sayap.svg',
  travelokal: '/partner/travelokal.svg',
  univeler: '/partner/univeler.svg',
};

export interface IPartnerExecutive {
  name: string;
  role: string;
}

const PARTNER_CEO_BY_KEY: Record<string, IPartnerExecutive> = {
  astral: { name: 'Pratama Wijaya', role: 'CEO, Astral' },
  bcaa: { name: 'Hendrawan Sutanto', role: 'CEO, BCAA' },
  belibeli: { name: 'Kusuma Atmaja', role: 'CEO, Belibeli' },
  danah: { name: 'Vino Prasetyo', role: 'CEO, Danah' },
  halodek: { name: 'Jonathan Halim', role: 'CEO, Halodek' },
  kopimemory: { name: 'Adrian Tirtawinata', role: 'CEO, Kopi Memory' },
  paragonecorp: { name: 'Ratna Subakti', role: 'CEO, Paragone Corp' },
  sayap: { name: 'Wibowo Santoso', role: 'CEO, Sayap' },
  travelokal: { name: 'Dimas Hartono', role: 'CEO, Travelokal' },
  univeler: { name: 'Ananda Kusnadi', role: 'CEO, Univeler' },
};

function normalizePartnerKey(partnerName?: string | null): string {
  return (partnerName ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Mencocokkan nama partner dengan logo SVG di `public/partner/`. */
export function resolvePartnerLogo(partnerName?: string | null): string | null {
  const key = normalizePartnerKey(partnerName);
  return key ? (PARTNER_LOGO_BY_KEY[key] ?? null) : null;
}

/** Mengambil nama & jabatan CEO perusahaan mitra untuk tanda tangan sertifikat B2B. */
export function resolvePartnerCeo(partnerName?: string | null): IPartnerExecutive {
  const key = normalizePartnerKey(partnerName);
  if (key && PARTNER_CEO_BY_KEY[key]) {
    return PARTNER_CEO_BY_KEY[key];
  }
  const label = partnerName?.trim() || 'Perusahaan Mitra';
  return { name: 'Perwakilan Mitra', role: `CEO, ${label}` };
}
