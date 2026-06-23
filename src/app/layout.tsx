import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import { Suspense } from "react";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { NavbarSlot } from "@/components/layout/NavbarSlot";
import { CommunityGlobalSlot } from "@/components/community/CommunityGlobalSlot";
import { AuthStateWatcher } from "@/components/shared/AuthStateWatcher";
import { AuthHashCallbackHandler } from "@/components/shared/AuthHashCallbackHandler";
import { PostAuthRedirect } from "@/components/shared/PostAuthRedirect";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { StructuredData } from "@/components/seo/StructuredData";
import { DeferredVercelMetrics } from "@/components/shared/DeferredVercelMetrics";
import { DeferredWebManifest } from "@/components/shared/DeferredWebManifest";
import { Clarity } from "@/components/Clarity";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
import { CtaAuthCache } from "@/components/analytics/CtaAuthCache";
import { FunnelQueryCapture } from "@/components/analytics/FunnelQueryCapture";
import { GoogleAnalyticsPageView } from "@/components/analytics/GoogleAnalyticsPageView";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";
import { siteConfig } from "@/lib/seo/metadata";
import "./globals.css";

/**
 * Marketing/heading font — keep above-the-fold weights only.
 * Hero typography uses 600/700/800; 400/500 weren't in use.
 */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700", "800"],
  preload: true,
  adjustFontFallback: true,
});

/** Body font — 700 for `font-bold` on non-heading copy; avoid loading 800/900 here (use heading font for display nums). */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
  preload: true,
  adjustFontFallback: true,
});

/**
 * Mono — used for code + landing metrics. Not LCP-critical on blog/marketing; avoid render-blocking preload.
 */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  preload: false,
  adjustFontFallback: true,
});

/**
 * Editorial serif — used sparingly for emphasis (hero simulator score total).
 * Single weight, italic; not LCP-critical so no preload.
 */
const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  style: ["normal", "italic"],
  preload: false,
  adjustFontFallback: true,
});

const defaultOgTitle = `${siteConfig.name} | ${siteConfig.socialDefaultHeadline}`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: `${siteConfig.name} | %s`,
  },
  description: siteConfig.defaultDescription,
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon/safari-pinned-tab.svg",
        color: "#6366F1",
      },
    ],
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: defaultOgTitle,
    description: siteConfig.defaultDescription,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: defaultOgTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultOgTitle,
    description: siteConfig.defaultDescription,
    images: [siteConfig.ogImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
  verification: {
    google: "_-S00rkG1vATqHhgyRYi-MiJknsM72kIN0tM4L4MiVE",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0f1e" },
    { media: "(prefers-color-scheme: light)", color: "#fafafb" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="dark"
      data-scroll-behavior="smooth"
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable} ${instrumentSerif.variable} dark h-full antialiased`}
    >
      <head>
        <StructuredData />
      </head>
      <body className="min-h-full flex flex-col">
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ie-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='light'?'light':s==='dark'?'dark':(d?'dark':'light');var r=document.documentElement;r.setAttribute('data-theme',t);if(t==='dark')r.classList.add('dark');else r.classList.remove('dark');}catch(e){}})();`,
          }}
        />
        <ThemeProvider>
          <NavbarSlot />
          <AuthStateWatcher />
          <PostAuthRedirect />
          <AuthHashCallbackHandler />
          <OfflineBanner />
          {children}
          <CommunityGlobalSlot />
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
        <DeferredWebManifest />
        <DeferredVercelMetrics />
        <Suspense fallback={null}>
          <AttributionCapture />
          <CtaAuthCache />
          <FunnelQueryCapture />
        </Suspense>
        {process.env.NODE_ENV === "production" && GA_MEASUREMENT_ID ? (
          <>
            <Script
              id="google-analytics-gtag"
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            />
            <Script
              id="google-analytics-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });
                `,
              }}
            />
            <Suspense fallback={null}>
              <GoogleAnalyticsPageView />
            </Suspense>
          </>
        ) : null}
        <Clarity />
      </body>
    </html>
  );
}
