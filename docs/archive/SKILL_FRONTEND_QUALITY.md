> **⚠️ ARCHIVED — stale, do not use.** Written before the stack was decided; references PostHog/Zustand/Next.js 14, none of which match the actual codebase. See `docs/archive/README.md`.

# SKILL: Frontend Quality Bar — InterviewEra

## What this is

A reusable quality checklist for any frontend work on the InterviewEra codebase (Next.js 14+ App Router, React 18, TypeScript, Tailwind, Framer Motion). When you (Claude Code) build or modify any UI, you check against this file before declaring work done.

This is **not** a tutorial. It's a quality gate. If a change fails any rule below, the change is not done.

---

## 1. Component Rules

### 1.1 Server vs Client components — default to server

- New components are **server components by default**. Add `"use client"` only when the component needs: state, effects, browser APIs, event handlers, Framer Motion, or React Context.
- If you're adding `"use client"` to a component, ask first: can the interactivity be isolated into a small leaf component, leaving the wrapper as a server component? If yes, do that.
- A landing page section should be a server component that imports a small `"use client"` component for animations only.

### 1.2 File structure

```
app/
  (marketing)/          # route group for public pages
    page.tsx            # landing — server component
    layout.tsx
  signup/
    page.tsx
components/
  ui/                   # primitives (Button, Card, Reveal, etc.)
  marketing/            # landing-specific sections
  shared/               # reused across marketing + app
lib/
  utils.ts              # cn() helper, formatters
  analytics.ts          # PostHog wrappers
  seo.ts                # metadata helpers
```

Don't dump everything in `components/`. Sections that only exist on the landing page go in `components/marketing/`.

### 1.3 Props

- Always type props with an explicit interface or type. Never `any`. Never inline `({ x }: { x: string })` for components that take more than 2 props.
- Use `React.ComponentProps<"button">` style extensions when wrapping native elements.
- Default values via destructuring, not `defaultProps`.
- Boolean props named affirmatively: `disabled`, not `notEnabled`. `loading`, not `isNotLoading`.

### 1.4 No inline style strings for layout

The current site uses massive inline `style={{ ... }}` strings (sometimes 200+ chars). Stop. Use Tailwind classes or, for truly dynamic values, CSS variables on the parent + classes on the child. Inline styles are reserved for: animated values from Framer Motion, computed values that genuinely depend on runtime state.

---

## 2. Styling Rules

### 2.1 Tailwind first, then CSS variables, then `globals.css`

Decision order when styling:
1. Can a Tailwind utility do it? Use it.
2. Does it need to respond to a theme variable (e.g. `--accent-primary`)? Use `bg-[var(--accent-primary)]` or define the variable in `tailwind.config.ts` under `theme.extend.colors`.
3. Is it a pseudo-element, complex selector, or animation keyframe? Add to `globals.css` with a clear class name prefixed `ie-` (e.g. `ie-card-premium`).

### 2.2 The `cn()` helper is mandatory for conditional classes

```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Use `cn("base-classes", condition && "extra-classes", className)` — never string concatenation, never template literals for conditional Tailwind.

### 2.3 Design tokens are sacred

The site uses a CSS variable system (`--accent-primary`, `--card-bg`, `--text-primary`, etc.). **Don't introduce hex colors mid-component.** If you need a new color, add it as a token in `globals.css`. This keeps theming consistent and makes a future dark mode possible.

### 2.4 Spacing scale

Use Tailwind's spacing scale only: `4, 6, 8, 12, 16, 20, 24, 28, 32, 40, 48, 56, 64, 80, 96`. No `p-[13px]`. If you need an off-scale value, you're probably wrong about needing it.

---

## 3. Motion Rules

### 3.1 Always respect `prefers-reduced-motion`

Every Framer Motion component must check `useReducedMotion()` and return either `initial={false}` or skip animation entirely. No exceptions.

```tsx
const prefersReduced = useReducedMotion();
<motion.div
  initial={prefersReduced ? false : { opacity: 0, y: 24 }}
  animate={{ opacity: 1, y: 0 }}
/>
```

### 3.2 Easing is `[0.16, 1, 0.3, 1]` for entrances

This is the project's standard easing curve. It's a soft expo-out — feels expensive without being slow. Use it for:
- Section reveals
- Hero element drop-ins
- Number counters
- Score bar fills

For micro-interactions (hover lift, button press), use `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot) or just default ease.

### 3.3 Duration cheatsheet

- Micro-interaction (hover, press): `0.15–0.18s`
- Element entrance: `0.5–0.7s`
- Score bar fill, number counter: `0.9–1.2s`
- Background gradient shift: `4–8s`
- **Never** longer than 1.5s for content. Users wait once, not twice.

### 3.4 Stagger total ≤ 0.4s

If you stagger 5 children at 0.1s each, that's 0.5s. Too long. Either stagger less (0.05s × 5 = 0.25s) or use parent `staggerChildren` with `delayChildren`.

### 3.5 Animations are progressive enhancement

Content must be readable and functional with all animations stripped. If a user has reduced-motion on, or JavaScript fails to hydrate, they still see all the text and CTAs at correct positions.

### 3.6 Banned animations

- Cursor that follows the mouse with a trail
- Tilt-on-hover on every card (3D parallax)
- Particle backgrounds with > 30 particles on mobile
- Looping idle animations on text content (subtle gradient shifts on a single hero word are OK)
- Scroll-jacking (capturing wheel events to control scroll speed)

---

## 4. Performance Rules

### 4.1 Images

- Always use `next/image`. Always provide `width` + `height` (or `fill` + parent with `position: relative`).
- Hero / above-the-fold images: `priority` prop set.
- Non-critical images: lazy by default (next/image already does this).
- Source format preference: AVIF → WebP → JPEG. Next.js handles this if `next.config.js` has `images.formats: ['image/avif', 'image/webp']`.
- No image larger than 200KB shipped to mobile. If your hero illustration is 800KB, it's wrong.

### 4.2 Fonts

- Use `next/font/google` with `display: 'swap'` and `subsets: ['latin']`.
- Currently loaded: Bricolage Grotesque, DM Sans, JetBrains Mono. Don't add a 4th.
- Self-host via `next/font` — never `<link>` to fonts.googleapis.com directly. `next/font` handles preconnect + caching + CLS prevention.

### 4.3 JavaScript budget

- Initial JS payload (homepage): keep < 200KB gzipped.
- Run `next build` and check `.next/analyze` if @next/bundle-analyzer is installed. If not, install it once, run, fix the obvious offenders (full lodash imports, moment.js, etc.), then move on.
- Use dynamic imports (`next/dynamic`) for heavy components below the fold. The 5-dimension scoring engine, testimonials section, and FAQ are below-the-fold candidates.

### 4.4 Core Web Vitals targets

- **LCP** (largest contentful paint): < 2.5s on mobile 4G
- **CLS** (cumulative layout shift): < 0.05
- **INP** (interaction to next paint): < 200ms

If a change pushes any of these into the "needs improvement" zone, the change is not done. Test with Lighthouse mobile (throttled) before declaring done.

### 4.5 No client-side fetching for static content

Testimonials, scoring rubric, stat numbers — all of this is static. Don't fetch it from an API on mount. Hardcode it as a TypeScript const, or put it in `content/testimonials.ts`. Server components render it at build time.

---

## 5. Accessibility Rules

### 5.1 Semantic HTML

- `<button>` for actions, `<a>` for navigation. Never `<div onClick>`.
- `<h1>` once per page. `<h2>` per major section. Don't skip levels (no `<h2>` then `<h4>`).
- Lists are `<ul>/<ol>`, not stacks of `<div>`.
- Forms use `<form>` with `<label htmlFor>` properly bound.

### 5.2 Color contrast

- Body text on background: ≥ 4.5:1 (AA).
- Large text (18px+ or 14px+ bold) on background: ≥ 3:1.
- The current `--text-secondary` on `--card-bg` is borderline — verify with a contrast checker before approving.

### 5.3 Focus states

Every interactive element has a **visible** focus ring. Use:
```css
.focus-ring {
  outline: 2px solid color-mix(in srgb, var(--accent-primary) 50%, transparent);
  outline-offset: 3px;
  border-radius: inherit;
}
```
Apply via Tailwind: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-primary)]`.

Never `outline: none` without replacing it with something visible.

### 5.4 Tap targets

Mobile: minimum 44×44px tap target. The 3-step chips ("Upload resume → Answer AI questions → Get scored") need to meet this if they're clickable.

### 5.5 Alt text

Every `<img>` and `<Image>` has `alt`. Decorative images get `alt=""` (empty string, not missing). Don't auto-generate alt text from filenames.

### 5.6 ARIA only when HTML can't express it

Don't sprinkle `role="button"` on `<div>` — use a `<button>`. ARIA is a fallback, not a default.

---

## 6. State & Data Rules

### 6.1 Zustand for global client state

The stack is locked to Zustand. Use it for: user session, modal open state, multi-step form progress. Don't use Context for these.

### 6.2 React Server Components for data fetching

If you're fetching data, do it in a server component or server action. No `useEffect(fetch())` on the landing page.

### 6.3 No `useState` for derived values

If a value can be computed from props, compute it. Don't put it in state and sync via `useEffect`.

### 6.4 Form state

For the signup form: use React Hook Form + Zod for validation. Don't roll your own form state.

---

## 7. Error & Loading States

Every async UI has 4 states. Implement all 4 or you're not done:
1. **Idle** — initial state, no fetch yet
2. **Loading** — skeleton or shimmer, never a spinner alone for content
3. **Success** — the data
4. **Error** — actionable error message, retry button if retryable

Skeletons match the shape and dimensions of the loaded content (no layout shift on load).

---

## 8. Code Quality

### 8.1 No commented-out code in commits

If you removed it, remove it. Git remembers. Commented code rots and lies.

### 8.2 No `console.log` in production paths

Use a logger wrapper if you need logging. PostHog can capture custom events.

### 8.3 Imports order

```tsx
// 1. Node/external
import { useState } from "react";
import { motion } from "framer-motion";

// 2. Aliased absolute (project)
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

// 3. Relative
import { LocalThing } from "./LocalThing";

// 4. Types (separate group, type-only imports)
import type { ScoreData } from "@/types";

// 5. Styles
import styles from "./module.css"; // if any
```

### 8.4 Naming

- Components: `PascalCase.tsx`
- Hooks: `useCamelCase.ts`
- Utilities: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE` for true constants only; otherwise `camelCase`
- Tailwind class strings: alphabetize via Prettier's tailwind plugin (install if missing)

---

## 9. Definition of Done

Before declaring any frontend change complete, verify:

- [ ] Works at 375px wide (iPhone SE size)
- [ ] Works at 1440px wide (laptop)
- [ ] Keyboard-only navigation reaches all interactive elements with visible focus
- [ ] `prefers-reduced-motion: reduce` removes all motion
- [ ] Lighthouse mobile: Performance ≥ 85, Accessibility ≥ 95
- [ ] No new console errors or warnings
- [ ] No new TypeScript errors (`tsc --noEmit` clean)
- [ ] No new ESLint errors
- [ ] Tested in Chrome AND Safari iOS (the Safari test matters — `backdrop-filter` and `color-mix` have Safari quirks)
- [ ] If you added a dependency, justify it in your changelog

Skipping any of these = the work is not done.
