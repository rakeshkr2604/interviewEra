import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
  // Opening the HTML report in a browser doubles webpack memory on Windows.
  openAnalyzer: process.env.ANALYZE_OPEN === "true",
});

/** Vercel sets `preview` only for Preview deployments — never on Production (`production`). */
const IS_VERCEL_PREVIEW = process.env.VERCEL_ENV === "preview";

/**
 * PDF asset tracing — ROUTE-SCOPED ONLY.
 *
 * Never attach these to `'/**'`. A global include forces ~45MB+ of pdfjs-dist /
 * pdf-parse / canvas files into every serverless function (health, payments,
 * auth, …), which multiplies Vercel Deployment + Functions storage across
 * every deploy. NFT does not follow pdfjs runtime font/cmap paths, so these
 * globs are required — but only on routes that execute PDF parsing.
 *
 * Required by runtime:
 * - standard_fonts / cmaps → getDocument asset URLs in src/lib/pdf/parser.ts
 * - legacy/build pdf(+worker).mjs → dynamic import + fake-worker resolve
 * - @napi-rs/canvas → DOMMatrix/Path2D/ImageData globals for Node pdfjs
 * - pdf-parse → fallback when canvas globals missing / pdfjs fails
 */
function pdfTraceGlobs(): string[] {
  return [
    "./node_modules/pdfjs-dist/standard_fonts/**",
    "./node_modules/pdfjs-dist/cmaps/**",
    "./node_modules/pdfjs-dist/legacy/build/pdf.mjs",
    "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    "./node_modules/@napi-rs/canvas/**",
    // index + lib only — do not ship pdf-parse/test fixtures (~5MB) into Lambdas
    "./node_modules/pdf-parse/package.json",
    "./node_modules/pdf-parse/index.js",
    "./node_modules/pdf-parse/lib/**",
  ];
}

/** v2.1 script engine prompts — must ship into serverless /var/task (NFT). */
function scriptEngineTraceGlobs(): string[] {
  return ["./src/lib/ai/scripts/*.md"];
}

/** Routes that call extractText / page-count / ATS PDF layout inspect. */
const PDF_TRACE_ROUTES = [
  "/api/resume/upload",
  "/api/job-description/extract",
  "/tools/ats-checker",
] as const;

/** Routes that read SCRIPT_*.md via script-loader at runtime. */
const SCRIPT_TRACE_ROUTES = [
  "/api/interview/script/turn",
  "/api/interview/script/auto-structure",
  "/api/interview/script/start",
] as const;

const nextConfig: NextConfig = {
  devIndicators: {
    position: 'bottom-right',
  },
  turbopack: {
    root: __dirname,
  },
  // Local Playwright / LAN preview hosts — without these, Next blocks /_next assets
  // and client components never hydrate (cookie consent banner stays data-ready=0).
  allowedDevOrigins: ['192.168.1.104', '127.0.0.1', 'localhost'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
    /** App Router + multipart uploads: default ~1 MB body — PDFs fail before the handler with HTML/plain errors. Keep ≤ Vercel ~4.5 MB. */
    serverActions: {
      bodySizeLimit: '4.5mb',
    },
  },
  webpack: (config) => config,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Brand vertical lockup uses quality={95}; default allowlist is [75] only.
    qualities: [75, 95],
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
  serverExternalPackages: ['pdfjs-dist', '@react-pdf/renderer', '@napi-rs/canvas', 'pdf-parse'],
  // Route-scoped NFT includes only. See pdfTraceGlobs() — never use '/**' for PDF.
  outputFileTracingIncludes: {
    ...Object.fromEntries(PDF_TRACE_ROUTES.map((route) => [route, pdfTraceGlobs()])),
    ...Object.fromEntries(SCRIPT_TRACE_ROUTES.map((route) => [route, scriptEngineTraceGlobs()])),
  },
  // Performance
  compress: true,
  poweredByHeader: false,
  /** Same as vercel.json — ensures www → apex even if platform redirects run later. */
  async redirects() {
    return [
      {
        source: '/manifest.json',
        destination: '/site.webmanifest',
        permanent: true,
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
      /** Legacy product-update email CTA — /interview is not a page; preserve ?query on redirect. */
      {
        source: '/interview',
        destination: '/onboarding',
        permanent: true,
      },
      {
        source: '/interview-questions/companies/tcs',
        destination: '/interview-questions/tcs',
        permanent: true,
      },
      {
        source: '/interview-questions/topics/react-js',
        destination: '/interview-questions/topics/react',
        permanent: true,
      },
      /** Legacy T&P marketing landing — canonical campus funnel is `/campus`. */
      {
        source: '/college',
        destination: '/campus',
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

    // CSP notes (defense-in-depth; escaped output + sanitization on write remain required):
    // - 'unsafe-inline' on script-src is required for Next.js hydration chunks and the
    //   theme-init blocking script in layout.tsx. Nonce-based CSP is a future improvement.
    // - 'unsafe-eval' is added in development only — React dev mode uses eval() for stack
    //   trace reconstruction. React never uses eval() in production.
    // - 'unsafe-inline' on style-src is required for Tailwind CSS-in-JS and Recharts inline styles.
    // - wss://*.supabase.co covers Supabase Realtime subscriptions.
    // - siteTwin: allow assets when page is on www but chunks target apex (or vice versa).
    // - Razorpay Web Checkout: nested iframes (api); static host serves chunks/fonts for hosted checkout.
    // - framing: Production HTML uses `frame-ancestors 'none'` + X-Frame-Options: DENY.
    //   Preview (VERCEL_ENV=preview): frame-ancestors https://vercel.com https://vercel.live only — no `'self'`, no wildcards.
    //   Speaking-practice PDFs under /resources/guides are the exception: same-origin
    //   pages may embed them. Those files use a separate headers() entry.
    const razorpayScript =
      'https://checkout.razorpay.com https://cdn.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://checkout-static-next.razorpay.com';
    const razorpayConnect =
      'https://checkout.razorpay.com https://lottie.razorpay.com https://api.razorpay.com https://lumberjack.razorpay.com https://checkout-static-next.razorpay.com';

    // Google Analytics 4 (gtag.js via layout.tsx — not a GTM container tag).
    // Blocked production request (Network tab): GET …/a?v=3&t=l&pid=…&gtm.load…
    // on www.google-analytics.com (gtag GTM-load beacon). GA4 also routes collection
    // to unpredictable regional hosts (region1, region2, … .google-analytics.com) and
    // analytics.google.com based on user geo — hardcoding individual regionN hosts is
    // fragile. Google's official GA4 CSP guide explicitly recommends these wildcards:
    // https://developers.google.com/tag-platform/security/guides/csp#google-analytics-4
    // img-src was also missing GA/GTM hosts entirely, blocking pixel-style fallbacks.
    const ga4Script = 'https://www.googletagmanager.com';
    const ga4Connect =
      'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';
    const ga4Img = 'https://*.google-analytics.com https://*.googletagmanager.com';
    // Google OAuth profile photos (lh3.googleusercontent.com, etc.) used in Navbar/settings.
    const googleOauthImg = 'https://*.googleusercontent.com';

    // Clarity: tag/collect/img on *.clarity.ms subdomains; session pixels via c.bing.com.
    const clarityHosts = 'https://*.clarity.ms';
    const clarityScript = clarityHosts;
    const clarityConnect = clarityHosts;
    const clarityImg = `${clarityHosts} https://c.bing.com`;

    /** Embed only from Vercel dashboard origins (no `self`; avoids same-origin nesting edge cases). */
    const FRAME_ANCESTORS_PREVIEW =
      'frame-ancestors https://vercel.com https://vercel.live';

    const frameAncestorsDirective = IS_VERCEL_PREVIEW
      ? FRAME_ANCESTORS_PREVIEW
      : "frame-ancestors 'none'";

    const cspDirectives = [
      "default-src 'self'",
      // blob: is required for AudioWorklet .addModule(blobUrl) calls (Deepgram STT processor).
      // AudioWorklet module loading is governed by script-src, not worker-src.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} blob: ${siteTwin} ${razorpayScript} ${ga4Script} ${clarityScript} https://va.vercel-scripts.com`,
      `style-src 'self' 'unsafe-inline' ${siteTwin} https://fonts.googleapis.com`,
      `font-src 'self' data: ${siteTwin} https://fonts.gstatic.com https://checkout-static-next.razorpay.com`,
      `img-src 'self' data: blob: ${siteTwin} https://*.supabase.co ${clarityImg} ${ga4Img} ${googleOauthImg}`,
      "media-src 'self' blob:",
      // wss://api.deepgram.com: Deepgram STT WebSocket connection.
      // https://api.elevenlabs.io: ElevenLabs TTS API requests.
      // VideoSDK Coach (/coach): API + signaling/media/TURN hosts.
      // Firewall reference: https://docs.videosdk.live/javascript/guide/video-and-audio-calling-api-sdk/security/firewall-setup
      `connect-src 'self' ${siteTwin} https://*.supabase.co wss://*.supabase.co ${razorpayConnect} ${ga4Connect} ${clarityConnect} https://va.vercel-scripts.com wss://api.deepgram.com https://api.elevenlabs.io https://*.videosdk.live wss://*.videosdk.live`,
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
      { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      // Matches prior vercel.json HSTS intent; single STS source-of-truth here (headers block removed there).
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];

    const nonIndexAssetHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] as const;
    /** App shell — allow crawl so Google sees noindex (avoids GSC "indexed though blocked"). */
    const privateAppHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] as const;
    const speakingPdfHeaders = securityHeaders.flatMap((header) => {
      if (header.key === "X-Frame-Options") {
        return [{ key: header.key, value: "SAMEORIGIN" }];
      }
      if (header.key === "Content-Security-Policy") {
        return [{
          key: header.key,
          value: header.value
            .replaceAll("frame-ancestors 'none'", "frame-ancestors 'self'")
            .replaceAll(FRAME_ANCESTORS_PREVIEW, "frame-ancestors 'self'"),
        }];
      }
      return [header];
    });
    if (!speakingPdfHeaders.some((header) => header.key === "X-Frame-Options")) {
      speakingPdfHeaders.push({ key: "X-Frame-Options", value: "SAMEORIGIN" });
    }

    return [
      { source: "/site.webmanifest", headers: [...nonIndexAssetHeaders] },
      { source: "/manifest.json", headers: [...nonIndexAssetHeaders] },
      { source: "/_next/static/media/:path*", headers: [...nonIndexAssetHeaders] },
      { source: "/dashboard", headers: [...privateAppHeaders] },
      // HTML stays unframeable. Practice PDFs are excluded here and allowed
      // below so /prepare can embed them on the same origin.
      { source: "/((?!resources/guides/).*)", headers: securityHeaders },
      { source: "/resources/guides/:path*", headers: speakingPdfHeaders },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);