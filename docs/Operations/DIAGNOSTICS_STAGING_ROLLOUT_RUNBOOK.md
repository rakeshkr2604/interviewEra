# Diagnostics 110/111 — Staging Rollout Runbook & E2E Matrix

> Status: CANONICAL (ops runbook)
> Last Verified: 2026-10-03 (engineering commit/push loop; merge blocked)
> Verification Scope: Local verification green; feature-branch push authorized; merge blocked by main→prod deploy boundary; env **values** still operator-gated
> Authority: Staging rollout packet — **not** authorization to apply migrations, merge to `main`, or `vercel --prod`

## Purpose

Executable sequence for staging-only diagnostics rollout after operational gates and explicit approval. Production enablement is **out of scope** and requires a separate release approval.

Certified staging ref (code SoT): `iiowrzfwemaxytbykjrg` (`STAGING_SUPABASE_PROJECT_REF`).
Reject production: `plfuvgkycmxcyshrgpgv`.

### Vercel project context (Preview readiness)

| Item | Finding |
|---|---|
| Local `.vercel/project.json` | **Absent** — CLI not linked in this workspace (do not auto-link) |
| CLI auth | `vercel whoami` → `rakesh2604` |
| Team / scope | `rakesh-kumars-projects-98d26ab6` |
| Project name | **`interview-era`** (Production URL `https://interviewera.com`) |
| Env list without local link | Works with `--project interview-era --scope rakesh-kumars-projects-98d26ab6` |
| Optional operator link (only if desired) | `npx vercel link --yes --project interview-era --scope rakesh-kumars-projects-98d26ab6` — requires explicit approval (writes `.vercel/`) |

**Feature branch:** `fix/interview-analytics-lifecycle`. Diagnostics implementation + migrations `110`/`111` are intended to ship on this branch via authorized commit + push (see Git status in the engineering closure report). **Not merged to `main`.**

**Merge / production deploy boundary:** `docs/Operations/RELEASE.md` states every `main` push deploys Production on Vercel (`main→prod`). Merge authorization for this engineering task does **not** authorize production deployment. **Do not merge** until an owner explicitly accepts a production deploy of this code (still without applying `110`/`111` to production unless separately approved).

**Preview path after push:** Git-integrated Preview for the feature branch is the intended verification surface. Confirm the Preview alias matches `fix/interview-analytics-lifecycle` and the commit SHA before claiming Preview readiness. Env **values** remain operator-gated regardless of code presence.

## Gate matrix (current)

| Gate | Status | Evidence class | Evidence / remaining action |
|---|---|---|---|
| Staging Supabase project identity (live) | **PASS** | Prior FRESH + unchanged assumption | Confirm still ACTIVE before apply |
| Staging identity guard (code) | **PASS** | FRESHLY VERIFIED | Unit tests green this loop |
| Preview env **names** present (`APP_ENV`, `EXPECTED_SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`, service role, Upstash URL/token, `CRON_SECRET`) | **PASS** | FRESHLY VERIFIED | `vercel env ls preview --project interview-era --scope rakesh-kumars-projects-98d26ab6` — values Hidden; **not** validated |
| Preview env **values** = staging (`APP_ENV=staging`, ref=`iiowrzfwemaxytbykjrg`, URL host staging) | **BLOCKED** | — | Operator confirms in Vercel Dashboard (or authorized pull) without pasting secrets into chat; never use `.env.local` |
| Redis non-placeholder | **BLOCKED** | — | Presence PASS; placeholder/non-staging value check needs operator (values Hidden) |
| Redis fail-closed (diagnostics code) | **PASS** | FRESHLY VERIFIED | `rate-limit-gate` denies when unconfigured / Redis unavailable; uses `failClosed: true`; shared limiter defaults unchanged |
| Redis live Preview smoke | **NOT RUN** | — | Only after value identity PASS; non-destructive health check preferred over ingest |
| `CRON_SECRET` name on Preview | **PASS** | FRESHLY VERIFIED | Listed for Production+Preview; value not read |
| Prune path vs route vs schedule | **PASS** | FRESHLY VERIFIED | `vercel.json` → `/api/cron/prune-interview-diagnostics` `@50 2 * * *`; route Bearer-gates; RPC diagnostics-only |
| Prune invoked | **NOT RUN** | — | Do not call in preflight |
| Preview deploy includes diagnostics code | **PENDING** | Post-push | After feature-branch push, confirm Vercel Preview for this branch + commit SHA; prior Ready Previews aliased other branches |
| Preview-only deploy path for diagnostics | **OPEN** | Post-push | Feature-branch push may create Preview (acceptable). **Merge to main blocked** — would trigger production deploy per RELEASE.md |
| Staging candidate test account | **BLOCKED** | — | Needs `E2E_TEST_EMAIL` / password (or equivalent) on staging Auth; local `e2e/.auth` not present/usable here |
| Platform admin account | **BLOCKED** | — | `ADMIN_EMAILS` **name** present on Preview; actual admin login to staging UI not verified |
| Migration files 110→111 | **PASS** | Prior review | Unchanged |
| Explicit staging apply approval | **FAIL** | FRESHLY VERIFIED | Still required separately after READY |
| Production apply | **NOT REQUIRED** | — | — |

**Readiness decision: BLOCKED — CONFIGURATION VALUES UNVERIFIED** (Dashboard value check still required) **and** **BLOCKED — MERGE TO MAIN** (production deploy boundary). Staging migrations `110`/`111` remain unapplied and separately gated.

### Operator Dashboard checklist (identity — no secret paste into chat)

Vercel → Project **`interview-era`** → Settings → Environment Variables → **Preview**:

1. `APP_ENV` = `staging`
2. `EXPECTED_SUPABASE_PROJECT_REF` = `iiowrzfwemaxytbykjrg`
3. `NEXT_PUBLIC_SUPABASE_URL` host = `*.supabase.co` for staging ref only (not production `plfuvgkycmxcyshrgpgv`)
4. Upstash URL/token present and not placeholder text
5. `CRON_SECRET` present

### Proposed Preview-only deployment procedure (do **not** execute without approval)

1. Explicitly authorize a **commit** that includes diagnostics implementation (+ migrations if intended for the same PR).
2. Explicitly authorize **`git push`** to `origin/fix/interview-analytics-lifecycle` (or agreed branch).
3. Confirm Vercel Git integration creates a **Preview** (not Production) for that push.
4. Record Preview URL + commit SHA; re-run identity Dashboard checklist against that Preview.
5. Only later: written approval to apply staging DB `110`→`111` (separate gate).

**Unsafe:** `vercel deploy --prod`, promoting Preview to Production, or deploying without the diagnostics commit.

### Account readiness (unchanged)

| Role | Setup | Verify |
|---|---|---|
| Candidate | Staging Auth user; optional `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` for Playwright (`e2e/global-setup.ts`) | Login to Preview URL; no production cookies |
| Admin | Email listed in Preview `ADMIN_EMAILS` (or `platform_role=admin` on staging `users`) | Open `/platform/feedback/interview/[id]` on Preview |

Do not create accounts in this loop.

## Pre-approved local verification (already green)

```bash
npx vitest run src/lib/diagnostics src/app/api/interview/diagnostics src/app/api/cron/prune-interview-diagnostics
npm run verify:migrations   # next must remain 112_* until new files added
```

## Staging execution sequence (do not start while gates MISSING)

### 1. Preflight and identity

- Dashboard project ref = `iiowrzfwemaxytbykjrg`.
- Preview env: `APP_ENV=staging`, `EXPECTED_SUPABASE_PROJECT_REF=iiowrzfwemaxytbykjrg`, `NEXT_PUBLIC_SUPABASE_URL` host matches staging.
- Confirm Redis + `CRON_SECRET` present (boolean check only; no secret dump).
- Confirm `INTERVIEW_RECOVERY_EMAIL_ENABLED` unset/`≠1`.
- Capture: `SELECT COUNT(*) FROM interviews;` (baseline) and confirm no `interview_diagnostic_events`.

### 2. Apply migration 110

- Apply **only** `110_interview_diagnostic_events.sql` to staging (approved path — not `supabase db push` of the whole tree unless that is the approved workflow).
- Prefer MCP `apply_migration` / reviewed SQL Editor apply of the file contents with version `110`.

### 3. Verify 110

```sql
SELECT relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND relname='interview_diagnostic_events';
-- expect true

SELECT polname, polcmd FROM pg_policy pol
JOIN pg_class c ON c.oid=pol.polrelid
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='interview_diagnostic_events';

SELECT relacl::text FROM pg_class c
JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE relname='interview_diagnostic_events';
-- expect service_role SELECT,INSERT; no authenticated/anon grants
```

### 4. Apply migration 111

- Apply `111_prune_interview_diagnostic_events.sql` only after 110 verifies.

### 5. Verify 111

```sql
SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname='prune_interview_diagnostic_events';

SELECT has_function_privilege('service_role', 'public.prune_interview_diagnostic_events(integer,integer)', 'EXECUTE');
-- expect true; anon/authenticated false
```

### 6. Cron configuration (non-destructive)

- Confirm Preview schedule includes prune path.
- **Do not** invoke prune against real/expired candidate data in the first pass.
- Optional: `GET` without `Authorization` → expect 401 (proves auth gate).

### 7. Deploy

- Separate **deployment approval** required. Deploy Preview/staging build that includes diagnostics clients + admin loader.
- Record deploy SHA in the closure report.

### 8–9. Authenticated E2E + admin

- Execute matrix below.
- Capture screenshots/logs without PII dumps.

### 10. Rollback / disablement

| Lever | Action |
|---|---|
| Client emit | Feature not flag-gated today — disable by reverting deploy or short-circuiting ingest route to always 204 |
| Ingest | Route already fail-closed without Redis; removing Redis credentials stops writes |
| Admin | Investigation UI degrades to empty diagnostics when table empty/unavailable |
| Schema | No DROP without separate approval; forward-fix only |
| Cron | Remove/disable schedule or unset `CRON_SECRET` (cron returns 401) |

---

## Authenticated E2E matrix

Shared preconditions unless noted:

- Staging project `iiowrzfwemaxytbykjrg`.
- Migrations 110+111 applied.
- Preview with Redis + app identity guards.
- Users: **OwnerA** (candidate), **OwnerB** (other candidate), **Admin** (platform admin).
- Disposable interview `I_A` owned by OwnerA (create then abandon/complete as needed).
- Capture: HTTP status, response body (no secrets), row counts for `interview_diagnostic_events`, `credit_transactions`, interview `status`.

| ID | Test | Preconditions | Action | Expected | Evidence | Cleanup | Needs live staging |
|---|---|---|---|---|---|---|---|
| E1 | Owner ingest | OwnerA session; Redis up | `POST /api/interview/diagnostics` allowlisted events for `I_A` | 204; rows inserted; `user_id`=OwnerA | SQL count + event_type | Delete fixture rows by `interview_id` | Yes |
| E2 | Cross-user reject | OwnerB session; `I_A` exists | POST events for `I_A` | 404 Not found; **0** new rows | Status + count | None | Yes |
| E3 | Invalid event type | OwnerA | POST unknown `event_type` | 400; no insert | Status | None | Yes |
| E4 | Oversized body | OwnerA | Body > 32KB | 204; no insert | Status + count | None | Yes |
| E5 | Duplicate `client_event_id` | OwnerA; prior E1 row | Replay same `client_event_id` | 204; still one row (unique index) | SQL | None | Yes |
| E6 | Redis missing | Temporarily unset Redis on Preview **or** local with staging DB | POST valid payload | 204; **0** inserts | Logs `redis_unconfigured`; count | Restore Redis | Yes |
| E7 | Rate limit | OwnerA; burst > window | Many POSTs | Later requests 204; inserts stop increasing | Counts over time | Wait window / delete rows | Yes |
| E8 | Admin visibility | Admin; E1 data | Open `/platform/feedback/interview/[I_A]` diagnostics filter | Events listed; confirmation labels | Screenshot | None | Yes |
| E9 | Metadata sanitization | OwnerA sends disallowed keys / `transcript` / token-like keys | POST | Stored metadata allowlisted only | SQL `metadata` | Delete rows | Yes |
| E10 | No sensitive exposure | After E1/E9 | Admin UI + SQL sample | No transcript/audio/token/stack | Review | None | Yes |
| E11 | Credits/lifecycle unchanged | Record credits + interview status before E1–E7 | Run suite | Status/credits unchanged | Before/after queries | None | Yes |
| E12 | Retention dry-run | Insert **synthetic** row with `recorded_at` older than 90d; note unrelated table counts | Call prune RPC once with service role **or** cron with secret in staging only | Only diagnostic fixture deleted; interviews/credits/product_events counts unchanged | Counts | Remove any leftover fixtures | Yes |
| E13 | Interview complete/resume | Script interview flow | Start → multi-turn → complete; separate resume path | Success; diagnostics optional | Session UX | Normal interview cleanup | Yes |

**Run status this engineering session:** all rows **NOT RUN** (no authenticated Preview session / test accounts).

### Fixture rules

- Staging only.
- Prefer dedicated test users, never real candidates.
- Bounded cleanup: `DELETE FROM interview_diagnostic_events WHERE interview_id = $fixture`.
- Retention tests: synthetic old timestamps only; never prune “whatever is old” in shared staging without checking row owners.

---

## Owner approval checklist (required before step 2)

- [ ] Preview identity / Redis / CRON verified (gates above → VERIFIED)
- [ ] Test OwnerA/OwnerB + Admin available
- [ ] Explicit written approval: “Apply 110 then 111 on staging `iiowrzfwemaxytbykjrg`”
- [ ] Deploy approval tracked separately
- [ ] Production apply explicitly **excluded**

## Related

- Checklist narrative: [`../Guidelines/OBSERVABILITY.md`](../Guidelines/OBSERVABILITY.md)
- Closure: [`STAGING_PROD_ALIGNMENT_CLOSURE.md`](STAGING_PROD_ALIGNMENT_CLOSURE.md)
- Migrations: `supabase/migrations/110_interview_diagnostic_events.sql`, `111_prune_interview_diagnostic_events.sql`
