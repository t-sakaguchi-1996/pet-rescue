import type { NextConfig } from 'next'
import path from 'path'

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
  turbopack: {
    root: path.resolve(__dirname, '../..'),
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
