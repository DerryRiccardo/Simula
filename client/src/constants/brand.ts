// Aset brand Simula di public/brand. "dark" = untuk latar gelap (warna terang), "light" = latar terang.
// Ukuran mengikuti viewBox SVG agar rasio aspek tetap benar.
export const BRAND_ASSETS = {
  logo: { src: '/brand/simula-logo-light.svg', width: 324, height: 100 },
  logoOnDark: { src: '/brand/simula-logo-dark.svg', width: 324, height: 100 },
  symbol: { src: '/brand/simula-symbol-light.svg', width: 120, height: 120 },
  symbolOnDark: { src: '/brand/simula-symbol-dark.svg', width: 120, height: 120 },
} as const;
