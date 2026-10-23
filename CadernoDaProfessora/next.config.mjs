/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  outputFileTracingIncludes: { '/api/importar': ['./dados-iniciais/**/*'] },
};
export default nextConfig;
