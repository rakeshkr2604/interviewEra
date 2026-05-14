# CLAUDE CODE: InterviewEra Production Issue Diagnosis & Fix

## CONTEXT

InterviewEra (interviewera.com) is a Next.js 16.2.4 app deployed on Vercel. The latest production deployment from branch `main` (commit `507a64f`, merge PR #10 `fix/pdf-parser-vercel-bundling`) shows **"Ready"** on Vercel but the site is broken in production.

### Observed Symptoms

1. **Vercel dashboard preview thumbnail shows "Error: Forbidden" / "403 Forbidden"** — even though deployment status is "Ready" with 0% error rate.
2. **Live site (interviewera.com) renders completely unstyled** — raw text only, no CSS applied, nav items stacked vertically as plain links, hero section shows only text with no layout/design/images.
3. **Lighthouse Performance score: 72** with these critical failures:
   - LCP: 4.2s (red — must be under 2.5s)
   - FCP: 1.3s (orange)
   - Speed Index: 2.0s (orange)
   - JS execution time: 1.3s
   - Main-thread work: 3.3s
   - **490 KiB unused JavaScript**
   - **167 KiB unused CSS**
   - "Modern HTTP" flagged with est. 2,410ms savings
   - Forced reflows detected
   - Back/forward cache restoration prevented (3 reasons)
   - Legacy JavaScript detected (est. 22 KiB savings)
   - 7 non-composited animations
   - 3 long main-thread tasks
4. **Accessibility: 91** — Buttons missing accessible names, headings not in sequential order, no `<main>` landmark element.
5. **Best Practices: 92** — Browser console errors logged, Chrome DevTools Issues panel has logged issues, CSP not effective against XSS, no COOP headers, no Trusted Types.
6. **Build log shows** nearly all routes (50/54) are dynamic (`ƒ`) including pages that should be static like `/about`, `/blog`, and individual blog posts. Warning: "Using edge runtime on a page currently disables static generation."
7. **Build cache is 297 MB** — unusually large.

### Recent Change Context

The last merge was PR #10 `fix/pdf-parser-vercel-bundling` — a bundling fix for PDF parser. This may have introduced side effects on asset serving, middleware behavior, or CSS bundling.

---

## PHASE 1: DIAGNOSE THE 403 / UNSTYLED PAGE (CRITICAL — DO THIS FIRST)

### 1.1 Middleware Investigation

The site returning 403 in the Vercel preview strongly suggests middleware is blocking requests. The unstyled page suggests CSS/JS assets are being blocked or redirected.

**Actions:**
- Open `middleware.ts` (or `middleware.js`) at the project root.
- Check every `matcher` pattern — is it accidentally matching `/_next/static/*` or other asset paths?
- Check if middleware returns `NextResponse.rewrite()`, `NextResponse.redirect()`, or a `new Response('Forbidden', { status: 403 })` for any routes.
- Check authentication/authorization logic — is it blocking unauthenticated requests to pages that should be public (like `/`, `/about`, `/blog`)?
- Check if middleware reads cookies or headers that aren't available during Vercel's preview screenshot (which is an unauthenticated bot request).
- **Fix:** Ensure middleware explicitly excludes static assets and public pages. Add to matcher config:

```typescript
export const config = {
  matcher: [
    // Only match app routes, exclude all static files and assets
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
```

### 1.2 CSS/Asset Loading

- Check if `_next/static/css/` files are accessible by curling the production URL: run `curl -I https://interviewera.com/_next/static/css/` and check response headers.
- Check `next.config.js` / `next.config.mjs` for any `assetPrefix`, `basePath`, or custom `headers()` configuration that might interfere.
- Check if the pdf-parser bundling fix (PR #10) modified `next.config.js` — specifically `webpack`, `experimental`, `serverExternalPackages`, or `transpilePackages` settings that could affect client-side CSS bundling.
- Check for any `Content-Security-Policy` headers in `next.config.js` or `vercel.json` that might block inline styles or stylesheet loading.

### 1.3 Edge Runtime Check

- Search the entire codebase: `grep -r "runtime.*edge" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" src/ app/`
- Identify which page(s) use edge runtime. The build warning said edge runtime disables static generation.
- Unless the page genuinely needs edge (geolocation, streaming from edge), remove `export const runtime = 'edge'`.

---

## PHASE 2: PERFORMANCE FIXES (LCP from 4.2s → under 2.5s)

### 2.1 Unused JavaScript (490 KiB)

- Run `npx @next/bundle-analyzer` or add `@next/bundle-analyzer` to `next.config.js` to identify the largest JS chunks.
- Check for heavy libraries loaded on the homepage that aren't used on initial render (PDF parser, chart libraries, etc.).
- Dynamically import heavy components:

```typescript
const HeavyComponent = dynamic(() => import('@/components/HeavyComponent'), {
  ssr: false,
  loading: () => <Skeleton />,
});
```

- Check if `pdf-parser` or related PDF libraries are being bundled into client-side code. They should be server-only. Add to `next.config.js`:

```javascript
serverExternalPackages: ['pdf-parse', 'pdf-lib', /* any other PDF libs */],
```

### 2.2 Unused CSS (167 KiB)

- Check if you're importing full CSS libraries (like a full Tailwind build with no purge, or a UI component library's complete stylesheet).
- Verify `tailwind.config.js` has correct `content` paths so unused classes are purged in production.
- Check for any globally imported CSS files in `layout.tsx` or `_app.tsx` that include styles for components not on the homepage.

### 2.3 LCP Element

- Identify what the LCP element is on the homepage — likely a hero image or large text block.
- If it's an image: use `<Image priority />` from `next/image` and ensure it's not lazy-loaded.
- If it's text dependent on a font: preload the font in `layout.tsx` using `next/font`.
- If it's a component behind a loading state: eliminate the loading spinner for above-the-fold content.

### 2.4 Modern HTTP / HTTP2

- Check `vercel.json` for any custom server configuration that might force HTTP/1.1.
- Ensure assets are served from Vercel's CDN (no custom asset prefix pointing to a non-HTTP/2 origin).

### 2.5 Forced Reflows

- Search for JavaScript that reads layout properties (offsetHeight, getBoundingClientRect, scrollTop) and then writes to the DOM in the same frame.
- Check for animations or transitions triggered on page load that cause layout recalculation.

---

## PHASE 3: STATIC vs DYNAMIC ROUTE AUDIT

The following pages are currently dynamic but should be static:

| Page | Should Be | Action |
|------|-----------|--------|
| `/about` | Static | Remove any `cookies()`, `headers()`, `searchParams` usage or `dynamic = 'force-dynamic'` |
| `/blog` | Static | Same as above |
| `/blog/how-to-prepare-for-placement-interviews` | Static | Same — blog content is static |
| `/blog/hr-interview-answer-tips-and-tricks` | Static | Same |
| `/blog/top-dsa-interview-questions` | Static | Same |
| `/blog/top-interview-questions-for-software-engineers` | Static | Same |
| `/blog/what-is-star-method-with-examples` | Static | Same |
| `/pricing` | Static (or ISR) | If pricing data is hardcoded, make it static. If fetched, use ISR with `revalidate`. |
| `/` (homepage) | Static or ISR | The homepage should not be dynamically rendered on every request. |

**How to check:** In each page's `page.tsx`, look for:
- `cookies()` or `headers()` imports/calls from `next/headers`
- `searchParams` being used as a prop
- `export const dynamic = 'force-dynamic'`
- Any `fetch()` without `cache` option (defaults to no-cache in Next.js 15+)

**Common culprit in Next.js 15+/16:** If your root `layout.tsx` calls `cookies()` (e.g., for auth/theme), it forces EVERY page to be dynamic. Move cookie reading to a client component or a specific layout that only wraps authenticated routes.

---

## PHASE 4: ACCESSIBILITY FIXES

### 4.1 Buttons Without Accessible Names
- Find all `<button>` elements that only contain an icon (no text).
- Add `aria-label` to each: `<button aria-label="Toggle menu">`.
- Check the hamburger menu button, theme toggle button, and any icon-only buttons.

### 4.2 Heading Order
- Ensure headings follow sequential order: h1 → h2 → h3. Never skip levels.
- Each page should have exactly ONE `<h1>`.
- Search: `grep -rn "<h[1-6]" --include="*.tsx" --include="*.jsx" app/ components/`

### 4.3 Main Landmark
- Wrap the primary content area in `<main>`:

```tsx
// In layout.tsx or page layout
<main id="main-content">
  {children}
</main>
```

---

## PHASE 5: BEST PRACTICES FIXES

### 5.1 Console Errors
- Run the production site locally (`next build && next start`) and check browser console for errors.
- Common culprits: hydration mismatches, failed API calls, missing environment variables in client-side code.

### 5.2 Security Headers
Add to `next.config.js` or `vercel.json`:

```javascript
// next.config.js
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;",
        },
      ],
    },
  ];
},
```

---

## EXECUTION ORDER (PRIORITY)

1. **PHASE 1 FIRST** — Fix the 403/unstyled issue. Nothing else matters if the site doesn't render.
2. **PHASE 3** — Fix static/dynamic routes. This directly impacts performance and Vercel costs.
3. **PHASE 2** — Performance optimizations to get LCP under 2.5s.
4. **PHASE 4** — Accessibility fixes.
5. **PHASE 5** — Best practices and security headers.

## VERIFICATION

After each phase, run:
- `next build` locally — check the route table output for static (○) vs dynamic (ƒ) changes.
- `next start` locally — verify the site renders with full styling.
- Deploy to Vercel preview branch — confirm the preview thumbnail shows the actual site, not a 403.
- Run Lighthouse again — target: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95.

## IMPORTANT CONSTRAINTS

- Do NOT refactor unrelated code. Focus only on the issues listed above.
- Do NOT change the tech stack or upgrade Next.js version.
- Do NOT modify any API route logic — only page rendering and middleware.
- Test every change locally before pushing.
- Commit each phase separately with clear commit messages.
