import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { StructuredData } from "@/components/seo/StructuredData";
import { DeferredVercelMetrics } from "@/components/shared/DeferredVercelMetrics";
import { DeferredWebManifest } from "@/components/shared/DeferredWebManifest";
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
 * Mono — marketing hero + scorecard use tabular metrics; preload so first paint matches final font metrics.
 */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700"],
  preload: true,
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
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: [{ url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ rel: "mask-icon", url: "/favicon/safari-pinned-tab.svg", color: "#6366F1" }],
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
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('ie-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = saved === 'light' ? 'light' : saved === 'dark' ? 'dark' : (prefersDark ? 'dark' : 'light');
                  var root = document.documentElement;
                  root.setAttribute('data-theme', theme);
                  if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
        <StructuredData />
        <ThemeProvider>
          <OfflineBanner />
          {children}
        </ThemeProvider>
        <DeferredWebManifest />
        <DeferredVercelMetrics />
      </body>
    </html>
  );
}
