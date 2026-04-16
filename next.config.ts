import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Dev: allow loading /_next/* when the app is opened via LAN IP (not only localhost).
  allowedDevOrigins: ['http://169.254.186.50:3000', '169.254.186.50:3000'],
  experimental: {
    // middleware.ts matches /api/* — Next buffers the body for middleware + route (default 10MB).
    // Large PDF multipart uploads to /api/editions need a higher limit or FormData.parse() fails.
    middlewareClientMaxBodySize: '100mb',
  },
  serverExternalPackages: ['pdf-to-img', 'pdfjs-dist', '@napi-rs/canvas'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Allow access to remote image placeholder.
  images: {
    // Next.js 15 defaults to attachment on /_next/image; inline lets "Open image in new tab" display in-browser.
    contentDispositionType: 'inline',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-416c5f7c39ea418b8489ced14502c0e8.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'pub-435668dd3e6b40aaaa40027433b74b4a.r2.dev',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.yellowsingam.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  output: 'standalone',
  transpilePackages: ['motion'],
  webpack: (config, {dev}) => {
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
