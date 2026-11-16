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
