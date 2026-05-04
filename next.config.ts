import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

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
  serverExternalPackages: ['pdfjs-dist', '@react-pdf/renderer'],
  // Force NFT to trace pdfjs-dist font + cmap assets into every Node server
  // bundle that needs them. A single `/*` key avoids route-key mismatch for
  // server actions vs API routes on Vercel (picomatch must match the traced
  // route id exactly — easy to get wrong per deployment).
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/pdfjs-dist/cmaps/**',
    ],
  },
  // Performance
  compress: true,
  poweredByHeader: false,
  /** Same as vercel.json — ensures www → apex even if platform redirects run later. */
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.interviewera.com' }],
        destination: 'https://interviewera.com/:path*',
        permanent: true,
      },
    ];
  },
  // HTTP security headers applied to all routes
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';

    // Both apex + www: document may briefly load on www; Next may emit absolute
    // chunk URLs for the other host — CSP 'self' only matches the document origin.
    const siteApex = 'https://interviewera.com';
    const siteWww = 'https://www.interviewera.com';
    const siteTwin = `${siteApex} ${siteWww}`;

    // CSP notes:
    // - 'unsafe-inline' on script-src is required for Next.js hydration chunks and the
    //   theme-init blocking script in layout.tsx. Nonce-based CSP is a future improvement.
    // - 'unsafe-eval' is added in development only — React dev mode uses eval() for stack
    //   trace reconstruction. React never uses eval() in production.
    // - 'unsafe-inline' on style-src is required for Tailwind CSS-in-JS and Recharts inline styles.
    // - wss://*.supabase.co covers Supabase Realtime subscriptions.
    // - siteTwin: allow assets when page is on www but chunks target apex (or vice versa).
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${siteTwin} https://checkout.razorpay.com https://va.vercel-scripts.com`,
      `style-src 'self' 'unsafe-inline' ${siteTwin} https://fonts.googleapis.com`,
      `font-src 'self' data: ${siteTwin} https://fonts.gstatic.com`,
      `img-src 'self' data: blob: ${siteTwin} https://*.supabase.co`,
      "media-src 'self' blob:",
      `connect-src 'self' ${siteTwin} https://*.supabase.co wss://*.supabase.co https://checkout.razorpay.com https://lottie.razorpay.com https://api.razorpay.com https://va.vercel-scripts.com`,
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
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);