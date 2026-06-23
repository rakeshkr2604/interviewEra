# GSC Authoritative Audit — Status Report

**Date:** 2026-06-23  
**Source:** `docs/interviewera.com-Coverage-2026-06-23/Critical issues.csv`  
**Script:** `npx tsx scripts/gsc-authoritative-audit.ts`

---

## Data availability

| Export type | Present? | Authoritative for |
|-------------|----------|-------------------|
| `Critical issues.csv` | Yes | Issue counts (71 URLs) |
| `Chart.csv` | Yes | Trend (175 indexed / 71 not indexed on Jun 12) |
| Drill-down `Table.csv` per issue | **No** | **Individual URLs** |

The Coverage export you placed in `docs/interviewera.com-Coverage-2026-06-23/` is GSC’s **summary export**. It confirms issue types and counts but does **not** include the 71 affected URLs. Per [Google’s export docs](https://support.google.com/webmasters/answer/12919797), URL lists require a **drill-down export** from each issue row (yields `Table.csv`).

**Per-URL audit cannot proceed without probabilistic assumptions until drill-down files are added.** See [README.md](../docs/interviewera.com-Coverage-2026-06-23/README.md) for export steps.

---

## Authoritative issue summary (from GSC CSV)

| Issue | Count | Source | Validation | Evidence-based action |
|-------|-------|--------|------------|----------------------|
| Discovered – currently not indexed | 48 | Google systems | Not Started | Strengthen crawl signals (internal links, IndexNow); do not remove from sitemap without URL-level proof |
| Crawled – currently not indexed | 8 | Google systems | Failed | Fix metadata/content on each URL once exported; Google already rejected these after crawl |
| Page with redirect | 3 | Website | Failed | Keep valid 301s; fix internal links to redirect sources; request GSC validation |
| Excluded by noindex | 10 | Website | Not Started | **No change** — intentional |
| Blocked by robots.txt | 1 | Website | Not Started | Confirm URL matches intentional disallow; no robots.txt change unless indexable URL is blocked |
| Not found (404) | 1 | Website | Started | Fix broken href or restore page once URL is exported |

**Total not indexed:** 71 | **Indexed (Chart.csv Jun 12):** 175

---

## Per-URL audit table

**Blocked** — 0 of 71 URLs loaded. Run after adding 6 `Table.csv` drill-down exports.

When drill-down files are present, the script produces per URL:

- Page type, should index, canonical, sitemap presence  
- Internal link count, crawl depth, incoming links (from link graph)  
- Duplicate similarity, content uniqueness, structured data, meta quality, word count  
- GSC last crawled (from Table.csv)  
- Classification: Keep / Improve / Merge / Redirect / noindex / Remove from sitemap  
- Root cause, exact fix, expected impact  

---

## Code fixes already applied (from prior codebase evidence)

These address known redirect/404 sources; impact applies when GSC URLs match:

| Fix | Files |
|-----|-------|
| `spring` → `spring-boot`, `css` → `html-css`, `dsa` → `algorithms` | hub + article files |
| `companies/tcs` → `/interview-questions/tcs` | `solera-hub.ts` |
| Nav/footer internal linking for agentic cluster | `MarketingHeader.tsx`, `nav.ts`, `related.ts` |
| Metadata trim on 7 crawl-flagged pages | help-center, blog, wipro, html-css, star mentoring |

---

## Next step (required for per-URL table)

Export 6 drill-down CSVs from GSC → save under `docs/interviewera.com-Coverage-2026-06-23/<issue>/Table.csv` → run:

```bash
npx tsx scripts/gsc-authoritative-audit.ts
```

Expected output: `scripts/gsc-authoritative-audit.md` with all 71 rows classified.
