# SKILL: Technical SEO + Share Previews — InterviewEra

## What this is

A focused, one-time-setup checklist for technical SEO and share-preview hygiene on InterviewEra (Next.js 14+ App Router on Vercel, domain: interviewera.com).

This is **not** a content marketing playbook. We're not writing blog posts. We're not buying backlinks. We're fixing the plumbing so that when someone shares your link or Google crawls it, the result isn't broken.

---

## Audit Findings (current state of interviewera.com as of this skill's creation)

**Already in place — do not redo:**
- ✅ PostHog installed (analytics is sorted)
- ✅ `<title>` and `<meta name="description">` present and decent
- ✅ `viewport`, `favicon`, `manifest`, `lang="en"` present

**Missing — fix these:**
- ❌ **No OG image** — sharing the link on WhatsApp/LinkedIn/Twitter shows nothing. **Highest priority.**
- ❌ No `og:title`, `og:description`, `og:url`, `og:type`
- ❌ No Twitter Card meta (`twitter:card`, `twitter:image`)
- ❌ No canonical URL (Google doesn't know if `interviewera.com` or `www.interviewera.com` is primary)
- ❌ No JSON-LD structured data (Organization, WebSite, FAQPage)
- ❌ No `robots.txt`
- ❌ No `sitemap.xml`
- ❌ No font preconnect (costs ~200-400ms on first paint)

This skill addresses every item above. Total work: ~90 minutes once. Then forget it.

---

## Why each of these matters (briefly, so you don't skip the boring ones)

| Item | What breaks if missing | Real-world impact for InterviewEra |
|---|---|---|
| OG image | Link shares look empty | A senior shares your link in a college WhatsApp group → unfurls as plain text → 0 clicks |
| Canonical | Google indexes `www` and non-`www` separately, splitting authority | Your site ranks worse for its own brand |
| robots.txt | Crawlers don't know what to ignore | Vercel preview URLs may get indexed accidentally |
| sitemap.xml | Google guesses what to crawl | New routes (`/pricing`, `/blog/*`) take longer to index |
| JSON-LD | No rich results in search | Your listing looks plain vs competitors with star ratings, FAQs |
| Font preconnect | First paint delayed | Visible text takes 200-400ms longer to appear |

---

## Phase 1: Metadata & Share Previews (critical, do first)

### 1.1 Centralize metadata via `generateMetadata` API

In Next.js 14 App Router, metadata lives in `app/layout.tsx` and per-page `page.tsx` files. Create a single source of truth:

```ts
// lib/seo.ts
import type { Metadata } from "next";

const SITE_URL = "https://interviewera.com";
const SITE_NAME = "InterviewEra";
const DEFAULT_TITLE = "InterviewEra — Raise placement odds with resume-based AI interviews";
const DEFAULT_DESCRIPTION =
  "Structured mock interviews from your CV — STAR-aligned flow, five-dimension scoring, and progress built for Indian campus hiring.";

export const siteConfig = {
  name: SITE_NAME,
  url: SITE_URL,
  defaultTitle: DEFAULT_TITLE,
  defaultDescription: DEFAULT_DESCRIPTION,
  ogImage: `${SITE_URL}/og-default.png`, // 1200x630, see Phase 2
  twitterHandle: "@interviewera", // confirm with user before committing if handle exists
  locale: "en_IN",
};

export function buildMetadata(input?: {
  title?: string;
  description?: string;
  path?: string;
  ogImage?: string;
  noIndex?: boolean;
}): Metadata {
  const title = input?.title ?? siteConfig.defaultTitle;
  const description = input?.description ?? siteConfig.defaultDescription;
  const url = `${siteConfig.url}${input?.path ?? ""}`;
  const ogImage = input?.ogImage ?? siteConfig.ogImage;

  return {
    metadataBase: new URL(siteConfig.url),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: siteConfig.locale,
      url,
      siteName: siteConfig.name,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
      // creator: siteConfig.twitterHandle,  // uncomment after confirming handle
    },
    robots: input?.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
    icons: {
      icon: "/assets/favicons/favicon.svg",
      apple: "/assets/favicons/apple-touch-icon.png",
    },
    manifest: "/assets/favicons/site.webmanifest",
  };
}
```

### 1.2 Wire it into `app/layout.tsx`

```ts
// app/layout.tsx
import { buildMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata();

// ... rest of layout
```

For per-page customization (e.g. `/pricing`):

```ts
// app/pricing/page.tsx
export const metadata = buildMetadata({
  title: "Pricing — InterviewEra",
  description: "Simple pricing. Free tier with scored mock interviews. Pro for unlimited sessions.",
  path: "/pricing",
});
```

### 1.3 Remove old metadata

Delete any old `<meta>` tags or `Head` imports that duplicate what `generateMetadata` now produces. There must be **one** source of truth.

---

## Phase 2: Generate the OG image (the single highest-leverage SEO task)

You need a 1200×630 PNG that shows up when interviewera.com is shared anywhere. Two approaches — pick one.

### Option A (recommended): Dynamic OG via `next/og`

Lets you generate it at build time or on-demand, with the headline rendered in your brand fonts.

```tsx
// app/og-default.png/route.tsx
// Note: filename ends in /route.tsx — this is a Route Handler returning an image
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "InterviewEra — Know your score before the company decides for you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #faf5ff 0%, #f5f3ff 50%, #ede9fe 100%)",
          padding: "80px",
          fontFamily: "Inter",
        }}
      >
        <div style={{ fontSize: 32, fontWeight: 700, color: "#6d28d9", marginBottom: 40 }}>
          InterviewEra
        </div>
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: "#0f172a",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            marginBottom: 32,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Know your score</span>
          <span>before the company</span>
          <span style={{ color: "#7c3aed" }}>decides for you.</span>
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#475569",
            display: "flex",
            gap: 24,
            alignItems: "center",
          }}
        >
          <span>📄 Upload resume</span>
          <span>→</span>
          <span>🎙 Answer AI</span>
          <span>→</span>
          <span>📊 Get scored</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
```

After this exists, change `siteConfig.ogImage` in `lib/seo.ts` to `${SITE_URL}/og-default.png`.

### Option B: Static PNG

If `next/og` is too much, design one in Figma/Canva (1200×630), export as PNG, save to `public/og-default.png`. Acceptable, but you'll have to redo it every time copy changes.

### 2.1 Test the OG image after deploy

1. Deploy to production.
2. Test on https://www.opengraph.xyz/url/https%3A%2F%2Finterviewera.com — paste your URL, verify the image renders.
3. Test on https://cards-dev.twitter.com/validator (X/Twitter card validator).
4. Test on LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
5. Test by sharing the link to your own WhatsApp — confirm the preview shows the image.

If any of these fail, fix before declaring done.

---

## Phase 3: robots.txt and sitemap.xml

### 3.1 robots.txt — use App Router file convention

```ts
// app/robots.ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/admin/", "/_next/"],
      },
    ],
    sitemap: "https://interviewera.com/sitemap.xml",
    host: "https://interviewera.com",
  };
}
```

This auto-generates `/robots.txt` at the root.

### 3.2 sitemap.xml — same pattern

```ts
// app/sitemap.ts
import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://interviewera.com";
  const lastModified = new Date();

  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/signup`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    // Add other public routes here as they exist
  ];
}
```

After deploy, verify both:
- https://interviewera.com/robots.txt — should return text
- https://interviewera.com/sitemap.xml — should return XML

---

## Phase 4: Structured Data (JSON-LD)

Adds machine-readable context so Google can show rich results. Add to `app/layout.tsx` inside `<body>`:

```tsx
// components/seo/StructuredData.tsx
export function StructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "InterviewEra",
    url: "https://interviewera.com",
    logo: "https://interviewera.com/assets/logos/logo-light-bg.svg",
    sameAs: [
      // Add real social URLs here. If you don't have any yet, leave the array empty
      // or remove the `sameAs` field entirely. Don't put placeholder URLs.
    ],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "InterviewEra",
    url: "https://interviewera.com",
    description:
      "Structured mock interviews from your CV — STAR-aligned flow, five-dimension scoring.",
    inLanguage: "en-IN",
  };

  const product = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "InterviewEra",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    aggregateRating: {
      // Only include this if you actually have verified reviews and the count is honest.
      // Schema lying = Google penalty. Remove this whole block if uncertain.
      "@type": "AggregateRating",
      ratingValue: "4.8",
      reviewCount: "1000",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(product) }}
      />
    </>
  );
}
```

Then in `app/layout.tsx`:
```tsx
<body>
  <StructuredData />
  {children}
</body>
```

### 4.1 Important warnings on schema

- **Don't fake `aggregateRating`.** If you don't have 1,000 verifiable reviews, the user has 1,000 students total but no review count, leave `aggregateRating` out. Google penalizes structured data lies.
- **Don't add `Person` or `Author` blocks** unless those are real people with profile pages.
- **Test every schema after deploy** at https://validator.schema.org/ and https://search.google.com/test/rich-results.

---

## Phase 5: Performance fixes that affect SEO

### 5.1 Font preconnect

Currently missing. Add to `app/layout.tsx` `<head>` — but only if fonts are loaded from Google Fonts directly:

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**Better fix:** migrate to `next/font/google`. It self-hosts fonts, eliminates the preconnect need entirely, and prevents CLS:

```ts
// app/layout.tsx
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from "next/font/google";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${dmSans.variable} ${jetbrains.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
```

Then in `globals.css`:
```css
:root {
  --font-display: var(--font-bricolage), system-ui, sans-serif;
  --font-body: var(--font-dm-sans), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}
```

This is strictly better than CDN-hosted fonts. Do it.

### 5.2 Image optimization

In `next.config.js`:
```js
module.exports = {
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [375, 640, 768, 1024, 1280, 1536],
    minimumCacheTTL: 31536000, // 1 year
  },
};
```

---

## Phase 6: Analytics audit (since you weren't sure)

You already have **PostHog** installed. Don't add a second analytics tool — that's how you end up with conflicting numbers.

### 6.1 Verify PostHog is set up correctly

1. Find where PostHog is initialized (search for `posthog.init` or `import posthog`).
2. Confirm it's using `process.env.NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST`, not hardcoded values.
3. Confirm autocapture is on (it is by default).
4. Confirm PostHog's session recording either ON (and you've reviewed the privacy implications for resume content) or OFF — pick deliberately, don't leave it as default if resumes are involved.

### 6.2 Track the events that actually matter

Don't track 50 events. Track these 6:

| Event | When | Why |
|---|---|---|
| `landing_cta_click` | "Start a scored interview" clicked | Top-of-funnel conversion |
| `signup_started` | Signup page loaded | Funnel step |
| `signup_completed` | Account created | Activation |
| `resume_uploaded` | First resume upload success | Aha moment |
| `interview_started` | First scored session begins | Engagement |
| `interview_completed` | First scored session finishes | Retention predictor |

Wire these via a thin wrapper:
```ts
// lib/analytics.ts
import posthog from "posthog-js";

export const track = (event: string, properties?: Record<string, unknown>) => {
  if (typeof window !== "undefined") {
    posthog.capture(event, properties);
  }
};
```

Use it: `track("landing_cta_click", { location: "hero" })`.

### 6.3 Set up a funnel in PostHog

In the PostHog dashboard, build a funnel: `landing_cta_click → signup_completed → resume_uploaded → interview_completed`. This is your North Star funnel. Check it weekly.

### 6.4 Don't add Google Analytics

Tempting but not worth it. Two analytics tools = double the JS payload, two sources of truth that disagree. PostHog covers everything GA does plus session recordings, feature flags, and product surveys. Stick with one.

---

## Phase 7: Google Search Console (15 min, do once)

1. Go to https://search.google.com/search-console
2. Add property: `https://interviewera.com` (Domain property, not URL prefix)
3. Verify via DNS TXT record on Hostinger (Search Console gives you the value)
4. Submit your sitemap: `https://interviewera.com/sitemap.xml`
5. After 24-48 hours, check the "Coverage" report for indexing errors

That's it. You don't need to do anything else with GSC for months. Check it once a week to see if you're being indexed and which queries bring you traffic.

---

## Phase 8: Deliberate non-actions (things people will tell you to do — don't)

- ❌ **Don't write blog posts yet.** You have no audience and no domain authority. A blog post on a brand-new domain will not rank. It's a 6-month investment minimum. Do this when you have product-market fit, not before.
- ❌ **Don't buy backlinks.** Penalty risk + zero benefit at your stage.
- ❌ **Don't stuff keywords.** Your current title and description are clean. Don't ruin them.
- ❌ **Don't add a chat widget for "lead gen".** It hurts performance and is conversion-noise on a single landing page.
- ❌ **Don't add cookie banners unless legally required for your geography.** You're targeting Indian campus students — DPDP Act compliance is real but you're below the threshold for now. Revisit this when you cross 50k users or take payments at scale. (Talk to a lawyer when that happens — this skill is not legal advice.)
- ❌ **Don't add hreflang for Hindi yet.** Your site is English-only. When you add a Hindi version, then we'll add hreflang tags. Not before.

---

## Definition of Done for this skill

- [ ] `lib/seo.ts` exists with `buildMetadata()` helper
- [ ] `app/layout.tsx` exports `metadata` from `buildMetadata()`
- [ ] OG image exists at `/og-default.png` (route or static), 1200×630, validates on opengraph.xyz
- [ ] `app/robots.ts` exists, `/robots.txt` returns valid output
- [ ] `app/sitemap.ts` exists, `/sitemap.xml` returns valid XML
- [ ] Structured data added, validates at validator.schema.org
- [ ] Fonts migrated to `next/font/google` (or preconnect added if not migrating)
- [ ] PostHog event tracking wrapper at `lib/analytics.ts`
- [ ] 6 core events firing on real user actions
- [ ] Google Search Console verified, sitemap submitted
- [ ] After deploy: Lighthouse SEO score = 100, Best Practices ≥ 95
- [ ] After deploy: link shared to a real WhatsApp/Slack — preview shows correctly with image

If any item is unchecked, this skill is not done. Do not declare done until all are.
