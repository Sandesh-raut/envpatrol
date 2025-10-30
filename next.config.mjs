/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_EXPORT ? 'export' : undefined,
  reactStrictMode: true,
  images: { unoptimized: true },
  experimental: { serverActions: false }
};
export default nextConfig;
