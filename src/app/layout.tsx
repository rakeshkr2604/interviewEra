import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
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
import { ConsentGatedAnalytics } from "@/components/consent/ConsentGatedAnalytics";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { AttributionCapture } from "@/components/analytics/AttributionCapture";
import { CtaAuthCache } from "@/components/analytics/CtaAuthCache";
import { FunnelQueryCapture } from "@/components/analytics/FunnelQueryCapture";
import { siteConfig } from "@/lib/seo/metadata";
import { COMMUNITY_HUB_PATH } from "@/lib/community/community";
import { communityBannerBootScript } from "@/lib/community/storage";
import "./globals.css";

const COMMUNITY_BANNER_BOOT_SCRIPT = communityBannerBootScript(COMMUNITY_HUB_PATH);

/**
 * Self-hosted latin subsets (`src/fonts/**`) — avoids Vercel build flakes in
 * `next/font/google` when fonts.googleapis.com CSS fetch/parse returns null.
 * Variable-font files cover the listed weight ranges.
 */
const bricolage = localFont({
  src: "../fonts/bricolage-grotesque/latin.woff2",
  variable: "--font-bricolage",
  display: "swap",
  weight: "600 800",
  preload: true,
  adjustFontFallback: "Arial",
});

/** Body font — do not preload alongside Bricolage (competing preloads delay LCP on `/`). */
const dmSans = localFont({
  src: "../fonts/dm-sans/latin.woff2",
  variable: "--font-dm-sans",
  display: "swap",
  weight: "400 700",
  preload: false,
  adjustFontFallback: "Arial",
});

const jetbrains = localFont({
  src: "../fonts/jetbrains-mono/latin.woff2",
  variable: "--font-jetbrains",
  display: "swap",
  weight: "400 700",
  preload: false,
  adjustFontFallback: "Arial",
});

const instrumentSerif = localFont({
  src: [
    {
      path: "../fonts/instrument-serif/latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/instrument-serif/latin-400-italic.woff2",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  preload: false,
  adjustFontFallback: "Times New Roman",
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
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon/safari-pinned-tab.svg",
        color: "#5B21F4",
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
      data-scroll-behavior="auto"
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable} ${instrumentSerif.variable} dark h-full antialiased`}
    >
      <head>
        <StructuredData />
        {/* Inline (not next/script): FOUC-safe theme boot; avoids React 19 “script in component” overlay. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('ie-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=s==='light'?'light':s==='dark'?'dark':(d?'dark':'light');var r=document.documentElement;r.setAttribute('data-theme',t);if(t==='dark')r.classList.add('dark');else r.classList.remove('dark');}catch(e){}})();`,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: COMMUNITY_BANNER_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
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
        <CookieConsentBanner />
        <DeferredVercelMetrics />
        <ConsentGatedAnalytics />
        <Clarity />
        <Suspense fallback={null}>
          <AttributionCapture />
          <CtaAuthCache />
          <FunnelQueryCapture />
        </Suspense>
      </body>
    </html>
  );
}
