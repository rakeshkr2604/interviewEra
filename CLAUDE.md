# CLAUDE.md — Thin adapter

> Status: CANONICAL (adapter)
> Last Verified: 2026-10-01
> Verification Scope: Claude Code / Claude-in-Cursor entry
> Authority: **Read [`AGENTS.md`](AGENTS.md) first.** This file only adds Claude-oriented command shortcuts. If this file and AGENTS.md disagree, **AGENTS.md wins.**

## Required read order

1. [`AGENTS.md`](AGENTS.md) — contract, invariants, high-risk table, completion protocol
2. [`docs/INDEX.md`](docs/INDEX.md) — progressive disclosure
3. Matching `docs/Core/*` before High Risk edits

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Dev | `npm run dev` / `npm run dev:turbopack` |
| Lint (0 warnings) | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Unit tests | `npm test` |
| E2E | `npm run test:e2e` · integration: `npm run test:e2e:integration` |
| Build (+ noindex audit) | `npm run build` |
| Migrations namespace | `npm run verify:migrations` |
| PDF | `npm run verify:pdf` |
| Voice | `npm run verify:voice` |
| Docs | `npm run verify:docs` |
| Noindex only | `npm run audit:noindex` |

## High Risk → Core docs

| System | Doc |
|---|---|
| Payments | [`docs/Core/PAYMENTS.md`](docs/Core/PAYMENTS.md) |
| Voice | [`docs/Core/VOICE_PIPELINE.md`](docs/Core/VOICE_PIPELINE.md) |
| Resume / PDF | [`docs/Core/RESUME_PIPELINE.md`](docs/Core/RESUME_PIPELINE.md) |
| Auth V2 / system | [`docs/Core/SYSTEM_DESIGN.md`](docs/Core/SYSTEM_DESIGN.md) |
| DB / RLS | [`docs/Core/BACKEND_SCHEMA.md`](docs/Core/BACKEND_SCHEMA.md) |
| SEO / analytics | [`docs/Core/SEO_AEO_GEO.md`](docs/Core/SEO_AEO_GEO.md) |
| Brand / logos / favicon | [`docs/Core/BRAND_ASSETS.md`](docs/Core/BRAND_ASSETS.md) |

Migrations: [`docs/Guidelines/DATABASE_MIGRATIONS.md`](docs/Guidelines/DATABASE_MIGRATIONS.md) + `.cursor/rules/supabase-migrations.mdc`.

## Claude-specific notes

- Prefer minimal diffs; degrade-don't-fail; never claim verification you did not run.
- Every completion: include **Documentation Impact** per AGENTS.md.
- Do not edit `src/`, `e2e/`, or `supabase/migrations` on docs-only tasks.
- Archive under `docs/archive/**` is historical — not current SoT.
- Multi-phase push/merge/hygiene: follow AGENTS.md summary → [`docs/Guidelines/ENGINEERING_WORKFLOW.md`](docs/Guidelines/ENGINEERING_WORKFLOW.md). Do not invent adapter-only Git rules.
