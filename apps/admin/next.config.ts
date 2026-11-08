
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    const apiBaseUrl = (
      process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:4000/api'
    ).replace(/\/+$/, '');

    // Proxy auth through the CMS origin so browsers can reliably retain the
    // HttpOnly refresh cookie, without exposing it to JavaScript.
    return [
      {
        source: '/api/admin/auth/:path*',
        destination: `${apiBaseUrl}/admin/auth/:path*`,
      },
    ];
  },
};

export default nextConfig;
