# Pre-governance archive (2026-09-27)

> Status: HISTORICAL
> Last Verified: 2026-09-27
> Authority: Superseded by `docs/Core/`, `docs/Guidelines/`, `docs/Operations/`, and root `AGENTS.md`

## Why this folder exists

On 2026-09-27 the repo adopted a compact canonical documentation system + agent governance (`AGENTS.md`). These files were moved here so history is preserved without remaining live navigation targets.

**Do not use these as current-state context** unless you are investigating historical decisions. Prefer:

| Need | Canonical location |
|---|---|
| Agent contract | [`AGENTS.md`](../../../AGENTS.md) |
| Doc index | [`docs/INDEX.md`](../../INDEX.md) |
| System design | [`docs/Core/SYSTEM_DESIGN.md`](../../Core/SYSTEM_DESIGN.md) |
| Interview engine (V2.1) | [`docs/Core/INTERVIEW_ENGINE.md`](../../Core/INTERVIEW_ENGINE.md) |
| Payments | [`docs/Core/PAYMENTS.md`](../../Core/PAYMENTS.md) |
| Voice | [`docs/Core/VOICE_PIPELINE.md`](../../Core/VOICE_PIPELINE.md) |
| SEO / analytics | [`docs/Core/SEO_AEO_GEO.md`](../../Core/SEO_AEO_GEO.md) |
| Flags | [`docs/Operations/FEATURE_FLAGS.md`](../../Operations/FEATURE_FLAGS.md) |
| Quality gates | [`docs/Operations/QUALITY_GATES.md`](../../Operations/QUALITY_GATES.md) |
| Release / CI | [`docs/Operations/RELEASE.md`](../../Operations/RELEASE.md) |

## Notable supersessions

- `ARCHITECTURE.md` → `docs/Core/SYSTEM_DESIGN.md` (+ schema/routing/flows)
- `AI_PIPELINE.md` → `docs/Core/AI_PIPELINES.md` + `INTERVIEW_ENGINE.md` + `RESUME_PIPELINE.md`
- `VOICE.md` → `docs/Core/VOICE_PIPELINE.md` (V1 voice rewrite route documented as **REMOVED**)
- `PAYMENTS.md` + root `PAYMENT_ARCHITECTURE.md` → `docs/Core/PAYMENTS.md`
- `SEO.md` + `SEO-INFRASTRUCTURE.md` → `docs/Core/SEO_AEO_GEO.md`
- `FLAGS.md` → `docs/Operations/FEATURE_FLAGS.md` (`NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT` **retired**)
- `AI_BOUNDARIES.md` → zone map in `docs/Guidelines/CODE_ORGANIZATION.md`
- `CI_CD_ARCHITECTURE.md` + `RELEASE_STRATEGY.md` → `docs/Operations/RELEASE.md`
- `MIGRATION_NAMESPACE.md` → `docs/Guidelines/DATABASE_MIGRATIONS.md`
- `OBSERVABILITY.md` (slim) → `docs/Guidelines/OBSERVABILITY.md`; RFCs/plans remain historical here
- Root `TECH_DEBT.md`, `DEAD_CODE_REPORT.md`, etc. → historical snapshots only

Existing `docs/archive/*` (Skills-era) stays as-is; this folder is a second archival layer.
