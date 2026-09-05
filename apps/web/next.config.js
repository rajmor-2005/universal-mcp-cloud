/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@umcp/shared'],
  async rewrites() {
    const rawApiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const apiUrl = rawApiUrl.replace(/\/$/, '');
    const destination = apiUrl.endsWith('/api/v1')
      ? `${apiUrl}/:path*`
      : `${apiUrl}/api/v1/:path*`;

    return [
      {
        source: '/api/v1/:path*',
        destination,
      },
    ];
  },
};

module.exports = nextConfig;
