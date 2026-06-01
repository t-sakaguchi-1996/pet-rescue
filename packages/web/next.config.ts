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
    optimizePackageImports: [
      'firebase',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'firebase/storage',
      'firebase/messaging',
      '@vis.gl/react-google-maps',
      'date-fns',
    ],
  },
}

export default nextConfig
