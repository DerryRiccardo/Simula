import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Ada package-lock.json lain di folder home, jadi root proyek ditetapkan eksplisit.
  turbopack: { root: __dirname },
};

export default nextConfig;
