import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => config,
  turbopack: {},
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 86400,
  },
  // Prevents Next.js from bundling packages that need Node.js internals at load time
  serverExternalPackages: ['pdf-parse', '@napi-rs/canvas', '@react-pdf/renderer'],
  // Performance
  compress: true,
  poweredByHeader: false,
  // HTTP security headers applied to all routes
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    // CSP notes:
    // - 'unsafe-inline' on script-src is required for Next.js hydration chunks and the
    //   theme-init blocking script in layout.tsx. Nonce-based CSP is a future improvement.
    // - 'unsafe-eval' is added in development only — React dev mode uses eval() for stack
    //   trace reconstruction. React never uses eval() in production.
    // - 'unsafe-inline' on style-src is required for Tailwind CSS-in-JS and Recharts inline styles.
    // - wss://*.supabase.co covers Supabase Realtime subscriptions.
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://app.posthog.com https://eu.i.posthog.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' data: https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.supabase.co",
      "media-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://app.posthog.com https://eu.i.posthog.com https://checkout.razorpay.com https://lottie.razorpay.com https://api.razorpay.com",
      "frame-src 'self' https://checkout.razorpay.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.razorpay.com",
    ].join('; ');

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: csp,
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(self), geolocation=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
        ],
      },
    ];
  },
};

export default nextConfig;