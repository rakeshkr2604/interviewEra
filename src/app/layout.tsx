import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { StructuredData } from "@/components/seo/StructuredData";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
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
});

/** Body font — restrict to weights we actually render. */
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
  preload: true,
});

/**
 * Mono font — only used by `<code>` / `<pre>` / `.font-mono` (rare on landing).
 * Skip preload + drop heavier weights to win LCP / network budget.
 */
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
  weight: ["400"],
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.defaultDescription,
  manifest: "/manifest.json",
  alternates: { canonical: siteConfig.url },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: siteConfig.defaultTitle,
    description: siteConfig.defaultDescription,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.defaultTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
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
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
