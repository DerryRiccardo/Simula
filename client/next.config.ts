import type { NextConfig } from 'next';

const backendUrl = process.env.BACKEND_URL?.replace(/\/+$/, '');

const nextConfig: NextConfig = {
  // Ada package-lock.json lain di folder home, jadi root proyek ditetapkan eksplisit.
  turbopack: { root: __dirname },
  // Proxy /api/* ke backend agar cookie sesi (SameSite=Lax) tetap same-origin di Vercel.
  async rewrites() {
    if (!backendUrl) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
