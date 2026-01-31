/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Data is served from /public/data -> /data/...
  // Rewrites are optional, but we keep them explicit to avoid ambiguity if hosting changes.
  async rewrites() {
    return [
      {
        source: '/data/:path*',
        destination: '/data/:path*',
      },
    ];
  },
};

export default nextConfig;
