# Programmatic SEO Architecture — InterviewEra
**Date:** 2026-05-15  
**Scope:** Post-MVP indexing acceleration + topical authority expansion  
**Constraint:** Do not implement until Phase 1–4 core features are stable. This is a planning doc.

---

## 1. Topical Authority Map

InterviewEra must own 3 topical clusters to build domain authority for the target keywords:

```
Cluster 1: Placement Interview Prep (Indian campus context)
  └── fresher interview questions
  └── campus placement tips
  └── placement preparation guide
  └── how to answer HR questions
  └── STAR method interview examples

Cluster 2: ATS & Resume Optimization
  └── ATS resume checker free
  └── how to beat ATS
  └── resume keywords for software engineer
  └── ATS-friendly resume format India
  └── applicant tracking system explained

Cluster 3: Role-Specific Interview Prep
  └── software engineer interview questions
  └── DSA interview questions
  └── system design interview India
  └── product manager interview questions India
  └── data analyst interview questions India
```

Current coverage: Cluster 1 (4/5 topics), Cluster 3 (1/5 topics), Cluster 2 (0/5 topics — only tool, no informational content).

---

## 2. High-Intent Landing Page Architecture

### 2.1 Role × Difficulty matrix pages

**Pattern:** `/interview-prep/[role]`

```
/interview-prep/software-engineer
/interview-prep/data-analyst  
/interview-prep/product-manager
/interview-prep/business-analyst
/interview-prep/core-engineering
```

**Why:** These are high-intent "job seeker" queries with buying intent. A student looking for "software engineer interview prep" is 2 weeks from interview season.

**Each page includes:**
- H1: "[Role] Interview Questions & Preparation Guide for Indian Freshers"
- 3–5 sample questions with STAR-format hints
- CTA to generate role-specific questions (links to `/tools/question-generator`)
- Link to AI mock interview (conversion)
- FAQ schema with 4–5 role-specific Q&A
- BreadcrumbList schema
- Internal links to relevant blog posts + tools

### 2.2 Company-specific interview prep pages

**Pattern:** `/interview-prep/[company]`

```
/interview-prep/tcs
/interview-prep/infosys
/interview-prep/wipro
/interview-prep/accenture
/interview-prep/amazon
/interview-prep/google
/interview-prep/microsoft
```

**Why:** Queries like "TCS interview questions for freshers" get 10,000+ monthly searches in India with very low competition. These are bottom-of-funnel — users are 1–2 weeks from their interview.

**Each page includes:**
- Company-specific interview format description
- Sample technical + HR questions
- CTA to practice with AI mock interview
- FAQ schema (company-specific)

**Implementation approach:** Start with 5–7 high-traffic companies, manually verify accuracy of process descriptions. Do not generate these pages without research.

### 2.3 Domain/stream-specific prep pages

**Pattern:** `/interview-prep/[stream]`

```
/interview-prep/cse-freshers          (CS/IT graduates)
/interview-prep/ece-freshers          (Electronics/Electrical)
/interview-prep/mba-placements        (MBA campus)
/interview-prep/bca-graduates         (BCA)
```

**Why:** Indian campus hiring is stream-specific. "Interview questions for ECE freshers" and "MBA campus placement interview questions" are distinct audiences with dedicated search volume.

---

## 3. ATS + Resume Content Cluster

The `/tools/ats-checker` is the highest-intent free tool but has no supporting informational content to pull organic traffic.

**Gap pages to create:**

| URL | Target Query | Monthly searches (est.) |
|-----|-------------|------------------------|
| `/blog/how-to-make-resume-ats-friendly` | how to make resume ATS friendly | 5,000+ |
| `/blog/ats-resume-format-india` | ATS resume format India | 3,000+ |
| `/blog/resume-keywords-software-engineer` | resume keywords software engineer | 4,000+ |
| `/blog/what-is-ats-system` | what is ATS applicant tracking | 8,000+ |

**Linking strategy:** Each article ends with a CTA to `/tools/ats-checker` and internal links to the others. The tool page links back to these guides.

---

## 4. URL Structure Standards

**Current structure (keep):**
```
/tools/[tool-slug]       — free tools
/blog/[post-slug]        — informational content
/pricing                 — conversion
/campus                  — B2B
```

**New routes to add (when content is ready):**
```
/interview-prep/[role-or-company]    — role/company landing pages
/blog/[ats-cluster-slug]             — ATS content cluster
```

**Rules:**
- All slugs: lowercase, hyphen-separated, no underscores
- Canonical: `https://interviewera.com[path]` (no trailing slash)
- Keep path depth ≤ 3 levels for crawl efficiency

---

## 5. Schema Strategy by Page Type

| Page Type | Required Schemas |
|-----------|-----------------|
| Homepage | Organization, WebSite, SoftwareApplication |
| Pricing | FAQPage, BreadcrumbList |
| Campus | FAQPage, BreadcrumbList |
| Tool pages | WebApplication, BreadcrumbList |
| Blog posts | Article, BreadcrumbList (+ FAQPage if FAQ section exists) |
| Role landing pages | FAQPage, BreadcrumbList |
| Company prep pages | FAQPage, BreadcrumbList |

---

## 6. Internal Linking Architecture

```
Homepage ──→ Pricing, Campus, All 3 tools, Blog hub
             │
Blog hub ──→ All blog posts
             │
Blog posts ─→ Related tools (via BlogRelatedToolsStrip)
            ──→ Related blog posts (via in-post related section)
             │
Tool pages ─→ Related blog articles (via ToolsRelatedBlogStrip)
            ──→ Other tools (via inline footerSlot)
             │
Pricing ────→ (TODO: link to blog + tools)
Campus ─────→ (TODO: link to pricing)
```

**Gap:** Pricing page has no outgoing links to blog content or tools. This wastes an indexed page's link equity. Add "Resources" section with links to top blog posts and free tools.

---

## 7. Indexing Prioritization

Process all pages in this priority order when submitting for re-crawl:

1. `/pricing` — high commercial intent, linked from everywhere
2. `/campus` — B2B, fresh FAQ schema added
3. `/tools/ats-checker` — high-intent free tool
4. `/tools/star-builder` — high-intent free tool
5. `/tools/question-generator` — already indexed per GSC data
6. Blog posts (in order of impressions: `/blog/ai-mock-interviews-smartest-prep-2026` → others)

**How to request re-crawl:** GSC URL Inspection → "Request Indexing" for each URL after deploying these changes.

---

## 8. Content Calendar (Next 3 Months)

**Month 1 (May–Jun 2026):** Fill ATS content cluster
- `/blog/what-is-ats-system` (high volume, top-of-funnel)
- `/blog/how-to-make-resume-ats-friendly` (mid-funnel)

**Month 2 (Jun–Jul 2026):** Add role landing pages
- `/interview-prep/software-engineer` (highest volume)
- `/interview-prep/data-analyst`

**Month 3 (Jul–Aug 2026):** Company pages (placement season prep)
- `/interview-prep/tcs` (highest volume)
- `/interview-prep/infosys`
- `/interview-prep/wipro`

**Quality gate before any publish:**
- Minimum 800 words of unique, researched content
- At least 1 FAQ section (4+ Q&A pairs)
- Article JSON-LD + BreadcrumbList
- Internal links to ≥2 other pages
- CTA pointing to a tool or the mock interview

---

## 9. Deliberate Non-Actions

- **No keyword stuffing** in existing content — current metadata is clean
- **No auto-generated company pages** — company interview prep pages must be manually researched and verified
- **No thin pages** — every new URL must have ≥800 words and a clear intent match
- **No link buying** — domain is too new for paid links to matter; organic is the only safe path at this stage
- **No hreflang** — English-only until there's a Hindi version to point to
