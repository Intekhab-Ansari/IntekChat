/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ['localhost', '127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '//sitemap.xml',
        destination: '/sitemap.xml',
      },
    ];
  },
};

export default nextConfig;
