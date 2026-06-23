# GSC Page Indexing Export — interviewera.com (2026-06-23)

## What this folder contains

| File | Content |
|------|---------|
| `Critical issues.csv` | **Summary only** — issue types + page counts (71 total) |
| `Chart.csv` | Indexed vs not-indexed trend |
| `Metadata.csv` | Export metadata |
| `Non-critical issues.csv` | Non-critical summary |

These files are **authoritative for issue counts** but do **not** list individual URLs.

## Required for per-URL audit

For each issue in `Critical issues.csv`, export drill-down URLs from GSC:

1. Search Console → **Indexing** → **Pages**
2. Click the issue row (e.g. "Discovered - currently not indexed")
3. Click **Export** → **Download CSV**
4. Save as `Table.csv` in a subfolder here:

```
discovered-not-indexed/Table.csv     (48 URLs)
crawled-not-indexed/Table.csv        (8 URLs)
page-with-redirect/Table.csv         (3 URLs)
blocked-by-robots/Table.csv          (1 URL)
not-found-404/Table.csv                (1 URL)
excluded-by-noindex/Table.csv         (10 URLs)
```

Then run:

```bash
npx tsx scripts/gsc-authoritative-audit.ts
```

Output: `scripts/gsc-authoritative-audit.md` + `.json`
