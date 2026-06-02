import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  transpilePackages: ['@pet-rescue/shared'],
  experimental: {
    optimizePackageImports: ['date-fns'],
  },
}

export default nextConfig
