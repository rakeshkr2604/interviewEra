# API Route Validation Inventory — 2026-10-04

> Status: CANONICAL (point-in-time inventory)
> Last Verified: 2026-10-04
> Verification Scope: All 132 `src/app/api/**/route.ts` handlers (batch audit)
> Authority: Supporting inventory for [SECURITY_AUDIT_2026-10-04.md](SECURITY_AUDIT_2026-10-04.md) addendum J

## Counts

| Metric | Value |
|---|---|
| Total route files | **132** |
| Audited this pass (inventory + risk skim) | **132** |
| Deep-read expensive / unauth sinks | ~45 |
| Admin GET dashboards (admin gate verified via pattern, not every body line) | ~25 |
| Adequately validated for risk class | **~118** |
| Remaining deferred medium/low gaps | See §Deferred |

Server actions (ATS, QG, STAR) are **not** counted in the 132; they were audited separately.

## Batch completion

| Batch | Prefixes | Status |
|---|---|---|
| A | `tools/`, `tts/`, `stt/`, `contact/`, `email/`, `job-description/`, `report/`, `share/`, `health/`, `indexnow/` | Done |
| B | `feedback/`, `interview/` (legacy + `script/`), `coach/`, diagnostics | Done |
| C | `college/`, `hiring/`, `platform/`, `admin/` | Done |
| D | `auth/`, `analytics/`, `product-events/`, `payments/`, `referral/`, `resume/`, `account/` | Done |
| E | `cron/`, `debug/`, `dev/`, `onboarding/`, `activity/`, `pricing/`, `stats/` | Done |

## Findings remediating in addendum J

| ID | Severity | Route / surface | Remediation |
|---|---|---|---|
| IV-5 | High | Script turn / answer-score / auto-structure unbounded strings | Shared Zod max `SCRIPT_ANSWER_MAX_CHARS=12000` (+ question/role caps) |
| IV-6 | High | QG / STAR / QG-answer RL fail-open | All LLM free tools `failClosed: true` |
| IV-7 | Critical | `POST /api/college/deadlines/remind` open email relay | Zod + enrollment allowlist + RL fail-closed + HTML escape + DB description |
| IV-8 | High | Contact / anon feedback / auth email sinks fail-open RL | `failClosed: true` + opaque 503 |
| IV-9 | High | `GET /api/share/card` unauth CPU, no RL | IP RL fail-closed 30/min |
| IV-10 | Medium | Signup `metadata` unconstrained | Allowlist `{ role: 'college_admin' }` strict |
| IV-11 | Medium | IndexNow `urls` uncapped | Max 200 URLs; string length ≤2048 |

## Deferred (documented, not blocking this pass)

| Item | Severity | Why deferred |
|---|---|---|
| In-route `failClosed` + `checkLLMCostGuard` on script turn/score/auto-structure/report | Medium | Proxy RL exists; authenticated+ownership; add when cost spike observed |
| Bulk-invite campus/admin Resend blast RL | Medium | Auth + Zod max 500 + seat checks; compromised-admin risk accepted short-term |
| JD extract/parse RL fail-open | Medium | Auth + size Zod; lower priority than unauth sinks |
| TTS abuseGate fail-open | Medium | Auth + char cap + quota |
| College deadlines create field maxes | Low | Campus-admin only |
| Admin feedback-retry uncapped ids | Low | Platform-admin only |

## Conventions observed (do not reinvent)

- Zod at JSON body boundaries for new/expensive routes
- Ownership via `user_id` / org admin checks before service-role writes
- `checkRateLimit(..., { failClosed: true })` for email/LLM/upload sinks
- Free tools: `checkAndConsumeFreeToolLimit` with explicit `failClosed`
- Resume semantic gate: `validateResumeDocumentText` (shared)
- Opaque rate-limit / provider errors to clients
