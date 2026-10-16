# SEO / GSC indexing recovery — 2026-10-16

> Status: AUDIT (point-in-time + post-release verification)
> Last Verified: 2026-10-16
> Verification Scope:
> - **Baseline (pre–PR #177):** live crawl under production `e10f351…`; PRs #174–#176; registry/indexing source; supplied GSC screenshots (no GSC API export)
> - **Post-release (after PR #177):** production deploy of merge commit `e601e21567e654351217fbbd93ea5a78f7116b8f`; live sitemap index + four children; sample robots/`lastmod` probes
> Authority: Engineering evidence for the GSC indexing recovery change set. Canonical policy: [SEO_AEO_GEO](../Core/SEO_AEO_GEO.md).
>
> **Important:** This file was first committed *inside* PR #177, so at merge tip `e601e21` the “Current state” tables still described the **pre-release** baseline (`e10f351`, 204 URLs). Post-release counts and SHA below were verified **after** production deploy (2026-10-16T08:01Z UTC). Do not read the baseline tables as post-deploy facts.

## Purpose

Reconcile GSC sitemap/indexing numbers with live production, classify the supplied exclusion examples, record justified code fixes, and separate verified facts from access-blocked gaps. **Do not treat technical sitemap correctness as GSC indexing recovery** until fresh Search Console exports confirm it.

Evidence legend: **G** = GSC screenshot (supplied) · **C** = live HTTP/crawl · **S** = source · **H** = hypothesis · **B** = blocked (no credential/export) · **P** = post-release re-measure (2026-10-16 after `e601e21` deploy).

---

## A. Baseline — before PR #177 (production `e10f351`)

Measured while `origin/main` / production still served the #176 tip. These rows are **historical** relative to the post-release section.

| Item | Value | Source |
|---|---|---|
| `origin/main` tip (then) | `e10f351560cfb78bb05c362b37c89fde83cd0960` — #176 billing/nav/gates | Git |
| PR #174 / #175 / #176 | All **MERGED**; CI green on merge (Build + E2E Auth + Vercel preview SUCCESS for #176) | GitHub |
| Production GitHub deployment (then) | `e10f351…` created 2026-10-16T06:45:04Z (id `7112786990`) | GitHub Deployments API |
| Vercel MCP production list | **403** for team scope | B |
| Live robots.txt | 200; disallows `/api/`, `/admin/`, `/interview/`, `/settings`, tool `results`, etc.; Sitemap → `https://interviewera.com/sitemap.xml` | C |
| Live sitemap index | 4 children: pages, blog, tools, questions | C |
| Live URL counts (then) | pages **19** · blog **17** · tools **76** · questions **92** · **total 204** | C |
| Registry with Coming Soon fail-closed (pre-deploy prediction) | pages omit `/campus` + `/teams` → **202** | S |

### Font build note (recorded during PR #177)

Preview failure (`next/font/google` → `Cannot read properties of null (reading '1')`) hit PR #176 (cleared by empty re-trigger `60c92a3`) and **recurred** on this branch’s first Vercel preview (`dpl_9MVunqCxKj3SUHCqNUhQrjXZDWoc`). Local `npm run build` succeeded. Root cause: build-time Google Fonts CSS fetch/parse returning null in `next/font` google loader. **Fix shipped in #177:** self-host latin `woff2` under `src/fonts/**` and load via `next/font/local` in `src/app/layout.tsx`.

### Sitemap reconciliation: GSC 284 vs live 204 (baseline)

| Report | Count | Interpretation |
|---|---:|---|
| Pre–PR #174 live sitemap (2026-10-15 audit) | 285 | C (prior audit) |
| Post–PR #174 live + build | 204 | C + S |
| Live production 2026-10-16 **before** #177 | **204** (19+17+76+92) | C |
| GSC `sitemap.xml` “discovered pages” | **284** (last read 2026-10-16) | G |
| GSC `pages-sitemap.xml` | **19** | G — matched live pages child **at baseline** |

**Baseline verified fact:** Before #177, production served **204** indexable URLs (PR #174 gate: 81 near-duplicates removed).

**Best-supported explanation for GSC 284 (unchanged):** stale/cumulative index-level “discovered” vs pre-gate ~285 — not a second live inventory of 285. **Not GSC recovery evidence.**

---

## B. Post-release verification — after PR #177

Re-measured 2026-10-16 after the production deployment for the merge commit completed.

### Deploy / Git identity

| Item | Value | Source |
|---|---|---|
| PR | [#177](https://github.com/rakesh2604/InterviewEra/pull/177) **MERGED** 2026-10-16T07:59:00Z | GitHub |
| Merge / `main` tip (full SHA) | `e601e21567e654351217fbbd93ea5a78f7116b8f` | Git / GitHub |
| Parent | `e10f351560cfb78bb05c362b37c89fde83cd0960` | Git |
| Production GitHub deployment | id `7114029142`, sha `e601e21567e654351217fbbd93ea5a78f7116b8f`, created 2026-10-16T08:01:18Z | GitHub Deployments API |
| Deployment status | **`success`** — “Deployment has completed” at 2026-10-16T08:01:19Z (`environment=Production`) | GitHub deployment statuses |
| Vercel project list via MCP | Still **403** for team scope | B |
| Host serving measurements | `https://interviewera.com` (canonical production host) | C |

PR #177 required checks before merge (from the recovery session): Lint & Type Check, Security Audit, Secret Scan, PDF extract, Build, E2E Auth, Merge Readiness Summary, Vercel preview — all **SUCCESS**. (Post-merge `main` check-run list may show docs-path skips; do not confuse with the PR gate.)

### Live sitemap inventory (P)

All responses **HTTP 200**, `Content-Type: application/xml` (pages child `application/xml; charset=utf-8`). Sitemap index lists the same four children; index `<lastmod>` observed `2026-10-16T08:00:37.084Z` (sitemap *file* freshness, not page content dates).

| Child | Status | URL count |
|---|---:|---:|
| `https://interviewera.com/pages-sitemap.xml` | 200 | **17** |
| `https://interviewera.com/blog-sitemap.xml` | 200 | **17** |
| `https://interviewera.com/tools-sitemap.xml` | 200 | **76** |
| `https://interviewera.com/questions-sitemap.xml` | 200 | **92** |
| **Total** | | **202** |

**204 → 202 reconciliation (exact):** baseline pages **19** included `/campus` and `/teams`. Post-release pages **17** omit both while Coming Soon mode is fail-closed. Blog/tools/questions counts unchanged (17+76+92). Difference = **2** URLs.

#### Pages sitemap URLs (17) — exact

`/`, `/interviewera`, `/how-it-works`, `/pricing`, `/signup`, `/about`, `/community`, `/google-apprenticeship`, `/help-center`, `/contact`, `/resources`, `/resources/chatgpt-interview-preparation`, `/resources/hr-interview-answer-framework`, `/resources/online-assessment-preparation`, `/privacy`, `/terms`, `/refund`  
(all under `https://interviewera.com`)

Absent vs baseline pages list: `/campus`, `/teams`.

#### Other children (counts only; full locs fetched 2026-10-16)

- Blog **17** — hub + 16 posts (unchanged vs baseline inventory pattern).
- Tools **76** — 4 landings + QGen role/company variants + STAR topics; **no** ATS role variants (still gated).
- Questions **92** — hub + roles + companies + **9** editorial intersections + indexable topics; template intersections remain out.

#### Sample live probes (P)

| Probe | Result |
|---|---|
| `/` robots | `index, follow` |
| `/campus` robots | `noindex, follow` |
| `/teams` robots | `noindex, follow` |
| `/` pages-sitemap `<lastmod>` | `2026-10-14T00:00:00.000Z` (stable; not request-time) |
| `/settings/billing` | **307** → `/login?next=%2Fsettings%2Fbilling` |

### What this does **not** prove

- GSC “Indexed” / “Not indexed” / crawled-not-indexed counts have **not** been re-exported after deploy (**B**).
- Indexing has **not** been claimed recovered.
- Authenticated `/settings/billing` UI was **not** exercised (login-only account unavailable).

---

## C. Indexing analysis (baseline classification; still applicable)

### Access limit

No GSC API and no URL-level export of the **117** “Crawled – currently not indexed” rows (**B**). Classification uses the supplied **18 noindex examples**, route inventory, and PR #174’s 81 de-listed URLs.

### A. Excluded by `noindex` (18 examples — classified)

| Example / group | Live robots (C / P) | Intent | Action |
|---|---|---|---|
| `/dashboard` | 307 → login `noindex, follow` | Auth / app | Keep |
| `/login`, `/forgot-password` | `noindex, follow` | Auth | Keep |
| `/join` | `noindex, nofollow` | Invite/join | Keep |
| `/help` | `noindex, follow`, canonical → `/help-center` | FAQ alias | Keep (also explains **alternate canonical**) |
| Empty topics: `low-level-design`, `pandas`, `azure` (+ `agile`, `jira`, `redis`, `ios`) | `noindex, follow` | Content gate | Keep until questions ship |
| Populated topics in GSC noindex list: `typescript`, `google-cloud`, `angular`, `mysql`, `postgresql`, `graphql`, `machine-learning`, `django` | Live **`index, follow`** + in questions sitemap | **Stale GSC classification** (hypothesis until Validate fix) | Owner: GSC URL inspection — **do not** strip intentional noindex elsewhere |
| Template intersections e.g. `tcs/java-developer`, `google/software-engineer` | `noindex, follow` | Not in `EDITORIAL_INTERSECTION_KEYS` | Keep |
| `/campus`, `/teams` Coming Soon | **`noindex, follow`** post-release (P); were `index, follow` at baseline | Thin shells | Keep until landing mode `live` |

### B–F. Other exclusion buckets (no URL export)

| Bucket | Count (G) | Status |
|---|---:|---|
| Page with redirect | 4 | **B** — exact URLs unknown |
| Alternate canonical | 1 | **Likely `/help` → `/help-center`** |
| 404 / soft 404 / other 4xx | 6 / 2 / 1 | **B** |
| Robots.txt blocked | 3 | **H** — intentional disallows |
| Discovered – not indexed | 6 | **B** |
| Crawled – not indexed | 117 | **H** — overlap with 81 PR #174 de-listings expected; **unconfirmed** |

### Homepage H1

Single `<h1 id="landing-hero-heading">` with lead + `sr-only` first rotating phrase + decorative CSS rotation (**S** + C). Concatenated text extraction is **not** multiple H1s.

---

## D. Fixes shipped in PR #177

| # | Severity | Finding | Fix | Test / post-release |
|---|---|---|---|---|
| 1 | High | Sitemap `lastmod` used request `Date` | Stable dates; omit invented `now` | Unit + live `/` lastmod `2026-10-14T00:00:00.000Z` (P) |
| 2 | Medium | Coming Soon `/campus`/`/teams` indexable + in sitemap | `noindex,follow` + pages sitemap only when mode `live` | Live robots + pages count 17 (P) |
| 3 | Medium | Recurring Vercel `next/font/google` null crash | Self-host `src/fonts/**` + `next/font/local` | Preview then prod deploy success |
| 4 | Low | Editorial H1 span word-join | `{' '}` between line/accent spans | Source |

---

## E. SEO / AEO / GEO status

| Area | Status |
|---|---|
| Technical sitemap / robots / Coming Soon gate | **Post-release verified** on `interviewera.com` under `e601e21…` |
| GSC indexed / not-indexed counts | **Unverified after deploy** — no fresh export |
| AI-referral / generative citations | **Unmeasured** |
| Organic CTR / query map | Still from 2026-10-15 audit baseline (**G**) |

## F. Owner follow-ups (Search Console)

See the concise checklist in the PR / agent report. Summary:

1. Resubmit `https://interviewera.com/sitemap.xml` if GSC still shows ~284 discovered on the index.
2. Export the **117** crawled-not-indexed URLs; diff vs the **81** PR #174 de-listings.
3. Inspect promoted topics that are live `index,follow` (e.g. `/interview-questions/topics/typescript`).
4. **Do not** claim indexing recovery until those GSC reads update.

## Related Documents

[SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [seo-aeo-geo-2026-10-15](./seo-aeo-geo-2026-10-15.md)
