import type { NextConfig } from 'next';

// Server-side only: browsers communicate with this Next.js origin.
const upstream = (
  process.env.LEARNING_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'https://learning-api.mochiflix.com/api'
).replace(/\/+$/, '');

if (!/^https:\/\//.test(upstream) && process.env.NODE_ENV === 'production') {
  throw new Error('LEARNING_API_URL must use HTTPS in production');
}

const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Admin pages must never be framed (clickjacking on delete / publish buttons)
  // or cached by shared proxies.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), payment=()' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
        ],
      },
      {
        source: '/admin/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
    ];
  },

  // /api/admin/auth/* is handled by our server-side Route Handler,
  // which validates incoming browser origins before proxying cookies.
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${upstream}/:path*`,
      },
    ];
  },
};

export default nextConfig;
