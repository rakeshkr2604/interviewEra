# Pre-Deploy SEO Checklist

**Audit date:** 2026-06-14  
**Scope:** Internal linking architecture changes (intersection canonical links + STAR Builder landing topics)  
**Verdict:** ✅ **APPROVED FOR DEPLOYMENT** — no Critical or High regressions detected

---

## Executive summary

| Check | Result |
|-------|--------|
| Internal link graph crawl | ✅ 8,514 edges, 260 unique targets, **0 broken** |
| HIGH_VALUE_INTERSECTION engine links | ✅ **0 violations** (654 canonical intersection hrefs verified) |
| Live HTTP crawl (293 URLs) | ✅ **0 non-200**, **0 sitemap contradictions** |
| Sitemap integrity | ✅ 258 URLs, **0 duplicates**, **0 noindex in sitemap** |
| Canonical uniqueness | ✅ **0 duplicate canonical URLs** |
| Metadata uniqueness (158 programmatic pages) | ✅ **0 duplicate titles/descriptions**, **0 canonical mismatches** |
| Structured data (live sample) | ✅ JSON-LD present (6–10 blocks on intersection/STAR pages) |
| Redirects introduced by linking change | ✅ **None** |
| Critical / High blockers | ✅ **None** |

---

## 1. Internal link graph crawl

**Method:** Simulated full graph via `.crawl-priority-out/analyze.ts` + engine link extraction (same model as production templates).

| Metric | Value |
|--------|-------|
| Total edges | 8,514 |
| Unique source pages | 274 |
| Unique target paths | 260 |
| Broken internal links | **0** |
| Unreachable indexable URLs from `/` | **0** (was 79 before linking fix) |
| Max crawl depth | **4** (unchanged) |

### New internal link count (linking change)

| Change type | Count |
|-------------|-------|
| Links retargeted hub → intersection | 654 |
| New STAR landing → topic links | +20 |
| **Net new edge instances** | **+20** |
| Footer links added | 0 (still 8 IQ links) |

---

## 2. Broken links, 404s, redirects

### Static graph
- **Broken links:** 0 — every engine/nav/footer href resolves to a known route.

### Live production crawl (`scripts/full-seo-audit.ts` → 293 URLs)

| Check | Result |
|-------|--------|
| HTTP 404 | **0** |
| Redirect chains on indexable pages | **0** |
| Redirect chains on private routes | 2 (expected: `/admin/dashboard`, `/college/dashboard` → 307 `/login`) |
| Canonical mismatch (indexable) | **0** |
| Sitemap URLs returning errors | **0** |

### Live spot-check (intersection targets from engine)

```
/interview-questions/companies/tcs/software-engineer     → 200, canonical self, index,follow, 6× JSON-LD
/interview-questions/companies/infosys/software-engineer → 200, canonical self, index,follow, 10× JSON-LD
/interview-questions/companies/google/software-engineer  → 200, canonical self, index,follow, 6× JSON-LD
/tools/star-builder                                      → 200, canonical self, index,follow, 6× JSON-LD
/tools/star-builder/team-conflict                        → 200, canonical self, index,follow, 10× JSON-LD
```

### Internal links pointing to redirected URLs
- **None detected** in the link graph or live crawl for indexable targets.

---

## 3. HIGH_VALUE_INTERSECTION canonical link verification

**Method:** Isolated audit of engine sections only (`role-section`, `company-section`, `intersection-section`, `tool-qgen`, `tool-qgen-co`).

| Check | Result |
|-------|--------|
| Engine intersection-intent sections pointing to hub URLs | **0** |
| Links not in `HIGH_VALUE_INTERSECTIONS` | **0** |
| Canonical intersection hrefs verified | **654** |

**Sample engine output (Software Engineer role page):**
```
/interview-questions/companies/tcs/software-engineer
/interview-questions/companies/infosys/software-engineer
/interview-questions/companies/google/software-engineer
…
```

Parent hub links on intersection pages (`All TCS questions`, `All SWE questions`) intentionally remain — correct upward navigation.

---

## 4. Duplicate canonical URLs

**Method:** Metadata generator audit across 158 indexable programmatic pages.

| Check | Result |
|-------|--------|
| Duplicate canonical URLs | **0** |
| Path ≠ canonical mismatches in metadata | **0** |

---

## 5. Sitemap — indexable URLs only

**Scripts:** `scripts/noindex-audit.ts`, `scripts/deployment-audit.ts`, live `full-seo-audit.ts`

| Check | Result |
|-------|--------|
| Sitemap URL count | 258 |
| Duplicate sitemap entries | **0** |
| Sitemap URL with noindex metadata | **0** (noindex-audit PASS) |
| Live sitemap URLs with HTTP errors | **0** |
| Registry orphans | **0** |

---

## 6. Noindex pages in sitemap

| Check | Result |
|-------|--------|
| Contradictions (in sitemap + noindex) | **0** |
| Thin skill pages (15) in sitemap | **0** — correctly excluded |
| `/interview-questions/tcs` pillar hub | ✅ In sitemap, indexable (special TCS hub route — not a regression) |

---

## 7. Structured data validity

| Check | Result |
|-------|--------|
| Live intersection pages | JSON-LD present (6–10 blocks) |
| Live STAR pages | JSON-LD present (6–10 blocks) |
| Pages with JsonLdScript in codebase | 31 (deployment-audit) |
| Invalid/missing JSON-LD on indexable sample | **None** |

**Note (pre-existing, Low):** Intersection, role, and skill pages have 8–10 JsonLdScript blocks — review for consolidation is optional, not a deploy blocker.

---

## 8. Metadata — unique title, description, canonical

**Scripts:** `scripts/validate-seo-metadata.ts`, programmatic metadata uniqueness scan

| Check | Result |
|-------|--------|
| Title/description length violations (codebase) | **0** |
| Duplicate titles (158 pages) | **0** |
| Duplicate descriptions (158 pages) | **0** |
| Duplicate canonicals | **0** |

### Pre-existing live quality issues (Medium — not deploy blockers)

These exist on **production today** and are **not introduced** by the linking change:

| URL | Issue |
|-----|-------|
| `/help-center` | Description 162 chars (>160) |
| `/blog/what-is-star-method-with-examples` | Description 170 chars |
| `/interview-questions/topics/html-css` | Title 62 chars, description 161 chars |
| `/tools/star-builder/mentoring` | Title 61 chars |

---

## 9. Regression summary

### Broken links
**0**

### Redirects introduced by linking change
**0** — auth-only redirects unchanged.

### New internal links
- **+20 net** (STAR landing topic grid)
- **654 rewired** from company/role hubs to canonical intersection URLs

### Regression risks (post-deploy verification)

| Risk | Severity | Notes |
|------|----------|-------|
| STAR landing topic grid not yet on production | Low | Production `/tools/star-builder` currently shows ~1 topic href; expect **20** after deploy. Re-run spot-check. |
| Hub pages lose intersection-intent inbound links | Low | By design — equity consolidates to intersection URLs. Monitor GSC hub vs intersection impressions. |
| Role skill pills link to noindex thin topics (52 edges) | Medium (pre-existing) | Intentional `noindex, follow` — not introduced by this change. |
| Title/description length on 4 pages | Medium (pre-existing) | Quality issue only; no crawl/index breakage. |

---

## 10. Automated audit results

| Script | Exit | Result |
|--------|------|--------|
| `npx tsx scripts/noindex-audit.ts` | 0 | PASS |
| `npx tsx scripts/validate-seo-metadata.ts` | 0 | PASS |
| `npx tsx scripts/deployment-audit.ts` | 0 | AUDIT_PASS |
| `npx tsx .crawl-priority-out/analyze.ts` | 0 | 0 unreachable, 0 broken |
| `npx tsx scripts/full-seo-audit.ts` | 0 | 258 indexable, 0 sitemap issues |
| Engine intersection isolation check | 0 | 0 violations |

**Artifacts:**
- `scripts/seo-audit-report.json` — full live crawl
- `.crawl-priority-out/all-audits.json` — link graph metrics
- `.crawl-priority-out/all-audits-before.json` — pre-change baseline
- `INTERNAL_LINKING_DIFF.md` — linking change documentation

---

## Post-deploy smoke checks (recommended)

Run within 24h of deploy:

```bash
npx tsx .crawl-priority-out/analyze.ts
npx tsx scripts/noindex-audit.ts
npx tsx scripts/full-seo-audit.ts
```

**Manual HTML checks:**
1. `/interview-questions/software-engineer` — “Companies hiring” section uses `/companies/{co}/{role}` URLs (not `/companies/{co}`).
2. `/tools/star-builder` — “Popular STAR Interview Questions” section lists **20** topic links.
3. Submit updated sitemap in GSC (unchanged URL count; graph density improved).

---

## Sign-off

| Gate | Status |
|------|--------|
| Critical issues | **0 — PASS** |
| High issues | **0 — PASS** |
| Linking implementation safe | **YES** |
| Sitemap / canonical / metadata intact | **YES** |
| **Deployment approval** | **✅ APPROVED** |
