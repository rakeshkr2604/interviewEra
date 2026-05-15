# Content Quality Report — InterviewEra
**Date:** 2026-05-15  
**Scope:** All indexable public pages  
**Purpose:** Identify pages that may be suppressing site-wide quality signals or are at risk of non-indexation due to thin content

---

## Methodology

Assessed each indexable URL for:
- Word count estimate (from JSX content analysis)
- Uniqueness vs. generic internet content
- Intent match (does the content satisfy the query implied by the URL/title?)
- Schema presence
- Internal link density
- CTA relevance

---

## Page-Level Assessment

### Homepage (`/`)
- **Quality:** Good
- **Content:** Hero + how-it-works + testimonials placeholder + features + for-colleges section + CTAs
- **Risk:** Low
- **Notes:** TESTIMONIALS is an empty array in `home-content.ts` — a testimonials section with zero content may render as a visually missing block. Confirm it's conditionally rendered.

### `/pricing`
- **Quality:** Good
- **Content:** Full pricing cards, feature comparison table, FAQ (4 Q&A pairs), billing toggle
- **Risk:** Low (new site timing issue only)
- **Schema:** FAQPage + BreadcrumbList now added ✅
- **Gap:** No outbound links to blog posts or tools from the pricing page. Add a "Resources" section with 3–4 links to relevant guides.

### `/campus`
- **Quality:** Good
- **Content:** Hero, before/after, features, how-it-works, comparison table, FAQ, pricing context, CTA
- **Risk:** Low (new site timing issue only)
- **Schema:** FAQPage + BreadcrumbList now added ✅
- **Gap:** Only links to `/join` (referral redirect) and `/pricing`. Should link to tool pages to improve crawl depth.

### `/about`
- **Quality:** Moderate
- **Content:** Mission pillars, founder info, product positioning
- **Risk:** Low-Medium — about pages are often thin and Google may deprioritize them
- **Notes:** The page has structured content but it's relatively short (~500 words of visible text). Not a problem for indexation but not a traffic driver.

### `/blog` (hub page)
- **Quality:** Good
- **Content:** Article listing with descriptions, read times, category tags
- **Risk:** Low — blog hubs that link to quality posts are indexed
- **Notes:** As more posts are added, ensure new posts are added to the `BLOG_POSTS` array here.

### Blog Posts — Individual Assessment

| Post | Quality | Unique? | Intent Match | Risk |
|------|---------|---------|--------------|------|
| `top-10-interview-questions-freshers-india-2026` | High | Yes — Indian context, sample answers | ✅ Exact | Low |
| `ai-mock-interviews-smartest-prep-2026` | High | Yes — product angle | ✅ Strong | Low |
| `top-dsa-interview-questions` | High | Yes — topic map + charts | ✅ Exact | Low |
| `hr-interview-answer-tips-and-tricks` | High | Yes — radar model + delivery flow | ✅ Exact | Low |
| `how-to-prepare-for-placement-interviews` | High | Yes — comprehensive | ✅ Exact | Low |
| `top-interview-questions-for-software-engineers` | High | Yes — SWE-specific Q&A | ✅ Exact | Low |
| `what-is-star-method-with-examples` | High | Yes — 5 full STAR examples | ✅ Exact | Low |

**Verdict:** All 7 blog posts are substantive, unique, and well-matched to their target queries. No thin content risk here.

### `/tools/question-generator`
- **Quality:** Good (tool page — content is interactive, not prose)
- **Risk:** Low
- **Schema:** WebApplication + BreadcrumbList now added ✅
- **GSC:** Already indexed

### `/tools/ats-checker`
- **Quality:** Good
- **Risk:** Low-Medium — lacks supporting informational content cluster
- **Schema:** WebApplication + BreadcrumbList now added ✅
- **Gap:** No blog posts targeting "ATS resume" cluster. Tool has no content reinforcement. See PROGRAMMATIC_SEO_PLAN.md §3.

### `/tools/star-builder`
- **Quality:** Good
- **Risk:** Low-Medium — similar to ATS checker
- **Schema:** WebApplication + BreadcrumbList now added ✅
- **Cross-links:** Links to question-generator and STAR method blog post ✅

### `/privacy`, `/terms`, `/refund`
- **Quality:** Adequate (legal pages are inherently thin)
- **Risk:** Low — legal pages are in a known-thin category. Google generally indexes them but rarely ranks them for queries. They serve as trust signals, not traffic drivers.
- **No action needed**

### `/join`
- **Quality:** N/A — it's a redirect (308 → `/signup`)
- **Risk:** Medium — previously had no noindex, showing as "Discovered" in GSC
- **Fix:** noindex metadata added ✅

---

## Duplicate Content Assessment

No duplicate content detected:
- Each blog post covers a distinct topic with unique framing
- Tool pages are meaningfully different from each other (ATS vs. question generation vs. STAR method)
- Pricing page and homepage don't repeat each other
- Results pages (`/tools/*/results`) are `noindex` — correct

---

## AI-Looking Content Risk

Assessed blog posts for AI-typical patterns (excessive hedging, generic lists, filler transitions). Findings:

- **Low risk:** `hr-interview-answer-tips-and-tricks` — has custom visualizations (radar chart, flow diagram) which are strong differentiation signals
- **Low risk:** `top-dsa-interview-questions` — has custom charts (topic frequency, prep timeline)
- **Low risk:** `ai-mock-interviews-smartest-prep-2026` — has visual elements + personal framing
- **Medium risk:** `how-to-prepare-for-placement-interviews` — pure text guide, no differentiation visuals. Not AI-looking per se, but competes in a high-content density space. Add a visual (checklist, timeline diagram) on next editorial pass.
- **Medium risk:** `top-interview-questions-for-software-engineers` — similar to above. Pure Q&A format is competitive. Consider adding a difficulty progression chart or company frequency table.

---

## Pages Likely Suppressing Impressions

None identified. The "Discovered - currently not indexed" status for key pages is a new-site crawl queue issue, not a quality issue. The 7-day-old GSC property has good signals (28.3% CTR, avg position 3.9 for queries that reached SERP).

However, these two items could become impression suppressors if not addressed:

1. **ATS tool without informational cluster** — The `/tools/ats-checker` page has no blog posts linking to it from an informational cluster. Without topical authority around "ATS resume" content, Google has less reason to surface the tool for mid-funnel queries.

2. **PRICING_FAQ content accuracy** — The FAQ answer states "Free includes 5 lifetime credits" but the actual free tier is 3 credits (CLAUDE.md §CREDIT-BASED MODEL). If Google crawls this FAQ and a user verifies the claim is wrong, it reduces trust. **This should be fixed by the product team, not Claude.**

---

## Recommendations Priority

| Priority | Action | Effort | Impact |
|----------|--------|--------|--------|
| High | Fix PRICING_FAQ "5 credits" → "3 credits" (product decision) | 5 min | Trust signal |
| High | Add ATS informational blog cluster (2 posts min) | 2-3 hrs/post | Impressions for ATS cluster |
| Medium | Add "Resources" links on pricing page | 15 min | Crawl equity |
| Medium | Add differentiating visual to `how-to-prepare` post | 30 min | Content uniqueness |
| Low | Add differentiating visual to `top-interview-questions-for-software-engineers` | 30 min | Content uniqueness |
| Low | Verify homepage testimonials section renders conditionally (no empty block) | 10 min | Page quality |
