import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {},
  output: 'standalone', // Add this line for containerization
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        hostname: 'lh3.googleusercontent.com', // Google profile images
      },
      {
        hostname: 'www.gravatar.com', // Gravatar images
      },
    ],
  },
  env: {
    AUTH_TRUST_HOST: 'true',
  },
  async rewrites() {
    return [
      {
        source: '/wiki',
        destination: '/docs',
      },
      {
        source: '/wiki/:path*',
        destination: '/docs/:path*',
      },
      {
        source: '/offers/wiki/:owner/:repo',
        destination: '/docs/public/:owner/:repo',
      },
      {
        source: '/offers/wiki/:owner/:repo/:path*',
        destination: '/docs/public/:owner/:repo/:path*',
      },
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
  trailingSlash: false,
};

export default nextConfig;
