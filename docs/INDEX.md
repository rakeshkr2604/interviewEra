# Documentation Index

> Status: CANONICAL
> Last Verified: 2026-10-15
> Verification Scope: Doc tree layout + agent entrypoints + security audit link + brand assets + founder launch-readiness register + performance audit folder + release-readiness checklist
> Authority: Navigation map for humans and agents

## Purpose

Single map of live documentation. Start at [`AGENTS.md`](../AGENTS.md).

## Progressive disclosure

1. **Always** — `AGENTS.md` (contract, invariants, high-risk table)
2. **Before editing a domain** — matching `docs/Core/*` doc
3. **Before process/ops change** — `docs/Guidelines/*` or `docs/Operations/*`
4. **Historical only** — `docs/archive/**` (never treat as current state)

## Core

| Doc | When to read |
|---|---|
| [SYSTEM_DESIGN.md](Core/SYSTEM_DESIGN.md) | App structure, auth, request lifecycle, DB overview |
| [INTERVIEW_ENGINE.md](Core/INTERVIEW_ENGINE.md) | V2.1 script engine lifecycle (production path) |
| [AI_PIPELINES.md](Core/AI_PIPELINES.md) | LLM routing, evaluation, reports |
| [VOICE_PIPELINE.md](Core/VOICE_PIPELINE.md) | STT/TTS, mic coordinator |
| [RESUME_PIPELINE.md](Core/RESUME_PIPELINE.md) | PDF extract → parse |
| [PAYMENTS.md](Core/PAYMENTS.md) | Razorpay dual-path activation |
| [FLOWS.md](Core/FLOWS.md) | End-to-end user journeys |
| [BACKEND_SCHEMA.md](Core/BACKEND_SCHEMA.md) | Tables / RLS notes for V2.1 + billing |
| [DECISIONS.md](Core/DECISIONS.md) | ADRs (incl. V1 removal) |
| [ROUTING.md](Core/ROUTING.md) | Key app + API routes |
| [SEO_AEO_GEO.md](Core/SEO_AEO_GEO.md) | Sitemap, noindex, analytics |
| [BRAND_ASSETS.md](Core/BRAND_ASSETS.md) | Logo Package v1 paths, favicon/PWA/OG mapping |

## Guidelines

| Doc | When to read |
|---|---|
| [DOCUMENTATION_GOVERNANCE.md](Guidelines/DOCUMENTATION_GOVERNANCE.md) | Doc impact contract (mandatory on every change) |
| [ENGINEERING_WORKFLOW.md](Guidelines/ENGINEERING_WORKFLOW.md) | Multi-phase work, deferred push, hygiene, pre-push / pre-merge / post-merge |
| [HLD_PRINCIPLES.md](Guidelines/HLD_PRINCIPLES.md) | System-level design rules |
| [LLD_PRINCIPLES.md](Guidelines/LLD_PRINCIPLES.md) | Module-level design rules |
| [SECURITY.md](Guidelines/SECURITY.md) | Authz, CSP, RLS, secrets |
| [PERFORMANCE.md](Guidelines/PERFORMANCE.md) | Bundling, caching, serverless |
| [RESPONSIVE_BROWSER.md](Guidelines/RESPONSIVE_BROWSER.md) | Browser / mobile expectations |
| [DATABASE_MIGRATIONS.md](Guidelines/DATABASE_MIGRATIONS.md) | Serial migrations, RLS+GRANT |
| [TESTING.md](Guidelines/TESTING.md) | Unit / e2e / domain rituals |
| [CODE_ORGANIZATION.md](Guidelines/CODE_ORGANIZATION.md) | Folders + edit-risk zones |
| [OBSERVABILITY.md](Guidelines/OBSERVABILITY.md) | Logging / telemetry (current) |

## Operations

| Doc | When to read |
|---|---|
| [RELEASE.md](Operations/RELEASE.md) | CI/CD, deploy, release ritual |
| [FEATURE_FLAGS.md](Operations/FEATURE_FLAGS.md) | Env-gated behavior registry |
| [QUALITY_GATES.md](Operations/QUALITY_GATES.md) | Gate levels and philosophy |
| [STAGING_PROD_ALIGNMENT_CLOSURE.md](Operations/STAGING_PROD_ALIGNMENT_CLOSURE.md) | Prod–staging alignment / privilege cleanup record (point-in-time) |
| [LEGACY_PROD_TABLES_OWNER_DECISIONS.md](Operations/LEGACY_PROD_TABLES_OWNER_DECISIONS.md) | Prod-only orphan table owner decision packet |
| [DIAGNOSTICS_STAGING_ROLLOUT_RUNBOOK.md](Operations/DIAGNOSTICS_STAGING_ROLLOUT_RUNBOOK.md) | Diagnostics 110/111 staging gates, apply sequence, E2E matrix |
| [SECURITY_AUDIT_2026-10-04.md](Operations/SECURITY_AUDIT_2026-10-04.md) | 2026-10-04 security audit, resume upload hardening, residual risks |
| [API_ROUTE_VALIDATION_INVENTORY_2026-10-04.md](Operations/API_ROUTE_VALIDATION_INVENTORY_2026-10-04.md) | Point-in-time API route validation inventory (132 routes) |
| [production-trust-hardening.md](audits/production-trust-hardening.md) | Privacy / legal / a11y / trust checklist audit + remediation evidence |
| [founder-launch-readiness.md](audits/founder-launch-readiness.md) | GST/CA, entity, trust metrics, assets, DPAs, deletion retention, lawyer checklist |
| [seo-aeo-geo-2026-10-15.md](audits/seo-aeo-geo-2026-10-15.md) | Keyword → URL map, indexing dispositions, title/CLS fixes, GSC follow-ups |
| [seo-gsc-indexing-recovery-2026-10-16.md](audits/seo-gsc-indexing-recovery-2026-10-16.md) | GSC 284↔204 reconciliation, noindex classification, lastmod + Coming Soon gates |

## Performance

| Doc | When to read |
|---|---|
| [BASELINE.md](performance/BASELINE.md) | Pre-change git/test/query/CWV snapshot |
| [AUDIT-FINDINGS.md](performance/AUDIT-FINDINGS.md) | Dashboard waterfall, N+1, indexes, RLS |
| [QUERY-PLANS.md](performance/QUERY-PLANS.md) | Captured EXPLAIN + query-count plans |
| [OPTIMIZATION-RESULTS.md](performance/OPTIMIZATION-RESULTS.md) | What changed, evidence, rollout, blockers |
| [RELEASE-READINESS.md](performance/RELEASE-READINESS.md) | App vs DB vs verify vs rollback; post-release field window |

## Root keepers

- [`AGENTS.md`](../AGENTS.md) — universal agent contract
- [`CLAUDE.md`](../CLAUDE.md) — thin Claude adapter
- [`MASTER_ENGINEERING_ROADMAP.md`](../MASTER_ENGINEERING_ROADMAP.md) — planned work order
- [`README.md`](../README.md) — human onboarding

## Archive

- [`archive/pre-governance-2026-09-27/`](archive/pre-governance-2026-09-27/) — superseded 2026-09-27
- [`archive/`](archive/) — older Skills-era drafts (PostHog/Zustand — ignore)

## Verification

```bash
npm run verify:docs
```

## Related Documents

- [DOCUMENTATION_GOVERNANCE.md](Guidelines/DOCUMENTATION_GOVERNANCE.md)
