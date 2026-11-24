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

/** Mencocokkan nama partner dengan logo SVG di `public/partner/`. */
export function resolvePartnerLogo(partnerName?: string | null): string | null {
  if (!partnerName) return null;
  const key = partnerName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return PARTNER_LOGO_BY_KEY[key] ?? null;
}
