import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/providers/PostHogProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "InterviewEra — AI Mock Interviews for Indian Students",
  description: "Upload your resume. Get AI-personalized mock interview questions. Get scored instantly. Free to start.",
  manifest: "/manifest.json",
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
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
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
        <ThemeProvider>
          <OfflineBanner />
          <PostHogProvider>{children}</PostHogProvider>
        </ThemeProvider>
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
