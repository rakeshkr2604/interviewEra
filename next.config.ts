import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

/** Vercel sets `preview` only for Preview deployments — never on Production (`production`). */
const IS_VERCEL_PREVIEW = process.env.VERCEL_ENV === "preview";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
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
  serverExternalPackages: ['pdfjs-dist', '@react-pdf/renderer', '@napi-rs/canvas'],
  // Force NFT to trace pdfjs-dist font + cmap assets into every Node server
  // bundle that needs them. A single `/*` key avoids route-key mismatch for
  // server actions vs API routes on Vercel (picomatch must match the traced
  // route id exactly — easy to get wrong per deployment).
  outputFileTracingIncludes: {
    '/**': [
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/pdfjs-dist/cmaps/**',
      './node_modules/@napi-rs/canvas/**',
    ],
  },
  // Performance
  compress: true,
  poweredByHeader: false,
  /** Same as vercel.json — ensures www → apex even if platform redirects run later. */
  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/favicon/favicon-32x32.png',
        permanent: false,
      },
      {
        source: '/manifest.json',
        destination: '/site.webmanifest',
        permanent: false,
      },
      {
        source: '/onboarding/avatar',
        destination: '/onboarding',
        permanent: true,
      },
      {
        source: '/onboarding/briefing',
        destination: '/onboarding',
        permanent: true,
      },
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'www.interviewera.com' }],
        destination: 'https://interviewera.com/:path*',
        permanent: true,
      },
    ];
  },
  // HTTP security headers: single source of truth (middleware does not duplicate these).
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
    // - Razorpay Web Checkout: nested iframes (api); static host serves chunks/fonts for hosted checkout.
    // - framing: Production uses `frame-ancestors 'none'` + X-Frame-Options: DENY.
    //   Preview (VERCEL_ENV=preview): frame-ancestors https://vercel.com https://vercel.live only — no `'self'`, no wildcards.
    const razorpayScript =
      'https://checkout.razorpay.com https://cdn.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://checkout-static-next.razorpay.com';
    const razorpayConnect =
      'https://checkout.razorpay.com https://lottie.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://checkout-static-next.razorpay.com';

    /** Embed only from Vercel dashboard origins (no `self`; avoids same-origin nesting edge cases). */
    const FRAME_ANCESTORS_PREVIEW =
      'frame-ancestors https://vercel.com https://vercel.live';

    const frameAncestorsDirective = IS_VERCEL_PREVIEW
      ? FRAME_ANCESTORS_PREVIEW
      : "frame-ancestors 'none'";

    const cspDirectives = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${siteTwin} ${razorpayScript} https://va.vercel-scripts.com`,
      `style-src 'self' 'unsafe-inline' ${siteTwin} https://fonts.googleapis.com`,
      `font-src 'self' data: ${siteTwin} https://fonts.gstatic.com https://checkout-static-next.razorpay.com`,
      `img-src 'self' data: blob: ${siteTwin} https://*.supabase.co`,
      "media-src 'self' blob:",
      `connect-src 'self' ${siteTwin} https://*.supabase.co wss://*.supabase.co ${razorpayConnect} https://va.vercel-scripts.com`,
      "frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "child-src 'self' https://checkout.razorpay.com https://api.razorpay.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.razorpay.com",
      frameAncestorsDirective,
    ].join("; ");

    const securityHeaders = [
      { key: "Content-Security-Policy", value: cspDirectives },
      ...(IS_VERCEL_PREVIEW ? [] : ([{ key: "X-Frame-Options", value: "DENY" }] satisfies { key: string; value: string }[])),
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      // Matches prior vercel.json HSTS intent; single STS source-of-truth here (headers block removed there).
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withBundleAnalyzer(nextConfig);