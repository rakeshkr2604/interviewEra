# Staging–Production Alignment Closure

> Status: CANONICAL (ops record)
> Last Verified: 2026-10-03 (diagnostics engineering commit/push; merge blocked)
> Verification Scope: Staging RO catalog unchanged; local verification green; feature-branch push authorized; main merge blocked by production deploy
> Authority: Point-in-time engineering closure — **not** staging migration apply, main merge, or Phase 6B execution approval

## Purpose

Single status SoT for staging–production alignment after repository cleanup. Distinguishes **VERIFIED CURRENT** probes from retained historical notes.

## A. Executive Status

**PARTIALLY COMPLETE** — authorized alignment subset done; remaining work is owner/admin/ops gated.

| Stream | Status | Evidence class |
|---|---|---|
| Batch A (100,103,106–109) | **PASS** | VERIFIED CURRENT (staging ledger) |
| Batch B (101–105 effects) | **PASS** | VERIFIED CURRENT (staging ledger timestamps `20261003090943`…`91059`) |
| Phase 5A/5B payments ACL | **PASS** | VERIFIED CURRENT (staging+prod match) |
| Phase 6A `postgres` public defaults | **PASS** | VERIFIED CURRENT (`has_broad=false`) |
| Phase 6B `supabase_admin` public defaults | **BLOCKED** / deferred | VERIFIED CURRENT still polluted; cleanup never executed; runbook **not** in repo |
| Diagnostics 110/111 | Files in feature branch; **not applied** anywhere | FRESHLY VERIFIED (no table / no ledger rows) |
| Diagnostics staging apply decision | **BLOCKED** (Preview values + explicit apply approval) | See diagnostics runbook |
| Diagnostics code | Intended commit on `fix/interview-analytics-lifecycle`; **not merged to main** | Merge blocked — RELEASE.md `main→prod` |
| Feature-branch Preview | Confirm after push (alias + commit SHA) | Prior Ready Previews aliased other branches |
| Preview env names | **PASS** (presence) | FRESHLY VERIFIED (`vercel env ls`) |
| Preview env values | **BLOCKED** | Operator Dashboard checklist |
| Legacy prod-only tables | Owner decision pending | Unchanged |

## B. Verified current probes (2026-10-03 recovery)

### Staging `iiowrzfwemaxytbykjrg`

| Check | Result | Class |
|---|---|---|
| Project health | ACTIVE_HEALTHY | VERIFIED CURRENT |
| Session (MCP) | `postgres` | VERIFIED CURRENT |
| Ledger Batch A | `100,103,106,107,108,109` present | VERIFIED CURRENT |
| Ledger Batch B | `20261003090943` payment_attribution_snapshot; `…90959` drop_legacy_attach; `…91045` standardize_campaign; `…91059` lock_down_overlap | VERIFIED CURRENT |
| Ledger 110/111 | absent | VERIFIED CURRENT |
| `interview_diagnostic_events` | absent | VERIFIED CURRENT |
| `payments` ACL | `{authenticated=r, service_role=arw}` (+ owner) | VERIFIED CURRENT |
| `postgres` → public defaults broad | false (r/S/f) | VERIFIED CURRENT |
| `supabase_admin` → public defaults broad | true (r/S/f) | VERIFIED CURRENT |
| `attach_campaign_order` / `abandon_stale_*` svc EXECUTE | true; auth/anon false | VERIFIED CURRENT |
| `guard_pricing_campaign_overlap` svc EXECUTE | **false** | VERIFIED CURRENT |
| `guard_users_privileged_update` svc EXECUTE | **true** | VERIFIED CURRENT |

### Production `plfuvgkycmxcyshrgpgv` (read-only)

| Check | Result | Class |
|---|---|---|
| `payments` ACL | `{authenticated=r, service_role=arw}` (+ owner) | VERIFIED CURRENT |
| Orphan row counts | `app_error_events`/`interview_ai_feedback`/`session_replay_events` = **0** | VERIFIED CURRENT |
| `interview_diagnostic_events` | absent | VERIFIED CURRENT |
| Overlap guard svc EXECUTE | **true** | HISTORICALLY VERIFIED (same-day prior RO probe; re-query blocked this pass) |
| `guard_users_privileged_update` svc EXECUTE | **false** | HISTORICALLY VERIFIED (same-day prior RO probe) |
| Mutations this program | none | VERIFIED CURRENT |

## C. Alignment matrix

| Area | Label |
|---|---|
| Core Batch A/B schema / payments grants / attach + abandon EXECUTE | **MATCH** |
| Overlap EXECUTE (`service_role`) | **INTENTIONAL DIFFERENCE** (staging false / prod true; trigger-only) |
| `guard_users_privileged_update` EXECUTE | **INTENTIONAL DIFFERENCE** (staging true / prod false; trigger-only) |
| Residual staging table ACL width | **INTENTIONAL DIFFERENCE** / deferred |
| `postgres` public defaults | **MATCH** intent (Phase 6A) |
| `supabase_admin` public defaults | **UNRESOLVED** |
| Ledger serial vs MCP timestamps (Batch B) | **INTENTIONAL DIFFERENCE** (history) |
| Prod-only legacy tables | **INTENTIONAL DIFFERENCE** — see owner packet |
| Diagnostics applied | **NOT APPLICABLE** / absent both envs |

## D. Remaining work plan (priority)

| Pri | Task | Deps | Risk | Staging mutation? | New auth? | Completion |
|---|---|---|---|---|---|---|
| 1 | Keep docs/status consistent with probes | none | Low | No | No | Closure + verify:docs |
| 2 | Owner decisions on prod orphans | none | Low (empty) | No (prod later) | **Yes** owner | Decision template filled |
| 3 | Diagnostics Preview gates (identity/Redis/CRON) | none | Med | No | Ops access | Gates VERIFIED |
| 4 | Apply staging 110→111 | Pri 3 + written approval | Med | **Yes** | **Yes** | Table+RPC+grants verified |
| 5 | Deploy + authenticated E2E | Pri 4 | Med | No (app) | Deploy + QA | Matrix green |
| 6 | Optional `supabase_admin` defaults cleanup | Admin session | Med | Catalog-only | **Yes** dashboard admin | Defaults clean (no in-repo runbook) |
| 7 | Production diagnostics | Pri 5 | High | Prod | **Yes** release | Separate program |

Phase 6B does **not** block Pri 3–5 if migrations apply as `postgres` with explicit GRANTs (MITIGATION PARTIAL — historical audit).

## E. Documentation map

| Doc | Role |
|---|---|
| This file | Alignment SoT + gates |
| [`LEGACY_PROD_TABLES_OWNER_DECISIONS.md`](LEGACY_PROD_TABLES_OWNER_DECISIONS.md) | Orphan decisions |
| [`DIAGNOSTICS_STAGING_ROLLOUT_RUNBOOK.md`](DIAGNOSTICS_STAGING_ROLLOUT_RUNBOOK.md) | 110/111 gates, sequence, E2E |
| [`../Guidelines/OBSERVABILITY.md`](../Guidelines/OBSERVABILITY.md) | Privacy + staging checklist |
| [`../Guidelines/DATABASE_MIGRATIONS.md`](../Guidelines/DATABASE_MIGRATIONS.md) | Serial rules + Phase 6A lesson |

Phase 6B admin runbook: **removed** — do not recreate without a dedicated authorization to restore it.

## F. Historical ledger (unchanged outcomes)

| Op | Env | Status |
|---|---|---|
| Batch A/B apply | Staging | **PASS** |
| Payments least-privilege | Staging | **PASS** |
| Phase 6A | Staging | **PASS** |
| Phase 6B ALTER | Staging | **BLOCKED** — never executed |
| Diagnostics apply | Staging | **not applied** |
| Production | Prod | read-only only |

## G. Final verdict (alignment program)

Authorized schema/privilege alignment for the reviewed surfaces is done. Remaining value is in owner decisions, diagnostics operational rollout (separate auth), and optional admin default-privilege cleanup. **Not release-ready** for diagnostics or production enablement.

## Related

- [`PAYMENTS.md`](../Core/PAYMENTS.md)
- [`RELEASE.md`](RELEASE.md)
