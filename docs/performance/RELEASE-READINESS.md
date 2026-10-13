# Dashboard performance release readiness

> Status: CANONICAL
> Last Verified: 2026-10-13
> Verification Scope: Loop 7 execution — fresh local verification PASS; production apply/deploy tracked in Loop 7 evidence below
> Authority: Operator checklist for an authorized rollout — not a deployment log

## Purpose

Separate application ship, database migrations, production verification, and rollback. Production field TTFB/LCP/CLS still measure **old deployed code** until an authorized SHA is live and a comparable field window exists.

## Current State

| Item | Value |
|---|---|
| Branch | `perf/fullstack-performance-audit` |
| HEAD | `1de95c19b6732afb2cf8b6d133f7622624ae726a` |
| Working tree | Loop 1–6 release candidate (committed in Loop 7) |
| Production app | Does **not** include the two-wave loader |
| Staging lab TTFB | Warmed document headers median **326 ms** (n=5). **Not** field p75 |
| Production field TTFB | **2,721 ms** p75 (n=78) — **old SHA**, do not attribute to this branch |
| Staging DB | 116 + 117 applied (ledger names `dashboard_perf_indexes_and_rls_initplan` / `interview_turns_rls_initplan`) |
| Production DB | Neither ledger name present. 116 schema effects **missing**. 117 SQL already matches live `interview_turns` policy |

`PERF_DASHBOARD_TRACE` defaults to **off** (`=== '1'` only). It is absent from `vercel.json` and is not set to `1` in `.env.example`. Do not add it on Vercel Production.

`ANALYZE` / `ANALYZE_OPEN` are build-time only (`next.config.ts`). Production runtime does not open the bundle analyzer.

### Release-candidate integrity (Loop 6)

Loop 1–5 implementations are present: two-wave loader, snapshot prefetch, history pagination, digest/recovery batching, nav-links split, `ScoreTrendChartSlot`, scrollbar gutter, tall skeletons, community SSR, streamed header, gated traces, docs, migrations 116/117.

Reviewed for accidental risk:

| Check | Result |
|---|---|
| Unrelated diffs | `MarketingFooter.tsx` only switches `NAV_TOOLS_LINKS` to `nav-links.ts` (graph split). `next.config.ts` only gates `openAnalyzer`. |
| Debug default | `PERF_DASHBOARD_TRACE` off unless exactly `'1'`. `'true'` does not enable it. |
| Sensitive logs | Spans allowlist `cached/hit/queryCount/wave/skipped/source/status`; blocked keys include userId/email/token/cookie/interview/resume. |
| Test credentials | Playwright + measure scripts use `e2e/.auth` cookies and `with-staging-env.ts` (staging ref `iiowrzfwemaxytbykjrg`). Measure script defaults to `http://127.0.0.1:3000`, not `NEXT_PUBLIC_APP_URL`. Local Playwright config still must not run against `.env.local` (production). |
| Migration order | Repo serial 116 then 117. Production apply must follow that order. App does not require either file. |

## Compatibility and rollout order

Read with [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) and [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md).

The application uses existing `interviews`, `user_progress`, `script_interview_reports`, and related tables. It does **not** require `idx_interviews_user_engine_status_started` or InitPlan wraps to boot, render `/dashboard`, deduct credits, or write reports. Staging already proved the new app against 116/117. Production currently lacks 116 effects; the new app is still compatible because queries already have `idx_interviews_user_status` / `idx_interviews_user_started_at`.

116/117 are additive: `ALTER POLICY` InitPlan wrapping (authorization predicates unchanged) and `CREATE INDEX IF NOT EXISTS`. Old production code keeps working after they apply.

| Sequence | Consequence |
|---|---|
| **App deploy only** | User-visible TTFB/LCP/CLS path ships. Recovery `LIMIT 1` still uses existing indexes. Production advisor keeps 5 `auth_rls_initplan` + 11 unindexed FKs until 116. |
| **116 then 117, then app** | Advisor debt and recovery composite land first. Old app remains correct. Field TTFB stays old until the app SHA ships. |
| **App, then 116 then 117** | Field TTFB/LCP can be attributed to the app if the window excludes mixed SHAs. DB apply afterwards is a smaller second change. |
| **117 before 116** | **Forbidden.** Serial order is 116, then 117. 117 does not create 116 indexes; skip/reorder confuses the ledger. |
| **Neither** | Current production: old 4-wave dashboard + unwrapped feedback/diagnostic policies. |

**Recommended:** authorized **application** deploy first (user-visible win, isolates field TTFB), then authorized **116 then 117** the same day or immediately after so advisor findings are not left open. Isolation option: wait for a comparable field sample before 116/117.

Do **not** apply production migrations from this loop.

## A. Application changes

Ship the Loop 1–6 working tree (after commit/PR). Includes Loop 1–5 loaders/chrome plus gated `PERF_DASHBOARD_TRACE` (default off) and the production-config contract test.

### Pre-deployment checks (app)

1. Working tree committed to a reviewed SHA. This file does not authorize that commit.
2. `npm run lint`, `typecheck`, `test`, `verify:docs`, `verify:migrations`, `build` green on that SHA.
3. Vercel Production env: `PERF_DASHBOARD_TRACE` **unset**. `ANALYZE` **unset**.
4. Confirm production host is the canonical triple (`vercel.json` + `src/proxy.ts` + `next.config.ts`).
5. Do not point Playwright or measure scripts at production.

### Authenticated smoke (after app deploy)

Signed-in candidate (not a dump of session contents):

1. `/dashboard` — title + body render; credits/plan visible; no error boundary.
2. `/history` — default ≤20 rows; lifetime tab counts visible; `?page=` overshoot clamps.
3. `/analytics` and `/settings` — load without empty-state regression.
4. Start-interview / credit path untouched: one smoke start only if the operator already has a staging-safe credit. Do not deduct production credits as a perf test.
5. Vercel runtime logs: no `[perf:dashboard]` lines.

Do not treat lab/Lighthouse as field p75.

## B. Database migrations

| Step | Action |
|---|---|
| Identity | Reconfirm production project name + ref `plfuvgkycmxcyshrgpgv` independently of env var names |
| Ledger | `schema_migrations` must still lack `dashboard_perf_indexes_and_rls_initplan` and `interview_turns_rls_initplan` |
| Schema | Confirm 116 indexes absent; feedback/diagnostic policies still use bare `auth.uid()` / `auth.role()` |
| 117 | Production `Users can view own interview turns` already uses `(SELECT auth.uid())`. Still apply 117 for ledger alignment — exact SQL matches live policy |
| Order | **116, then 117** |
| Locks | `CREATE INDEX IF NOT EXISTS` SHARE lock inside a transaction (not `CONCURRENTLY`) |
| After | Ledger by **name**; `pg_indexes`; advisor `auth_rls_initplan=0` and `unindexed_foreign_keys=0`; EXPLAIN recovery LIMIT 1 + completed count on a representative user (no user ids in reports) |
| Unused indexes | Do **not** drop |

Staging first already succeeded. Production is still unauthorized.

## C. Post-deployment field measurement

Old-code baseline (production, consent-gated Speed Insights, 28d ending 2026-10-13, **old SHA**):

| Metric | n | p75 | Label |
|---|---:|---:|---|
| `/dashboard` TTFB | 78 | 2721 ms | old deployed code |
| `/dashboard` LCP | 137 | 5624 ms | old deployed code |
| `/dashboard` CLS | 46 | 0.16 | old deployed code |
| `/dashboard` INP | (prior report) | 168 ms | old deployed code |

Procedure after authorized production SHA:

1. Record deploy time (UTC) and production SHA.
2. Wait until Speed Insights has enough **post-deploy** observations. Target n on the order of the baseline: TTFB ≥78, LCP ≥137, CLS ≥46. Do not stop at the first hour.
3. Export with the same CLI shape used for the baseline (PowerShell `-f route:` was `invalid_request`; use combined group-by):

```bash
vercel metrics vercel.speed_insights.ttfb -a p75 -a count --prod --group-by route --group-by deviceType --since 7d
vercel metrics vercel.speed_insights.lcp -a p75 -a count --prod --group-by route --group-by deviceType --since 7d
vercel metrics vercel.speed_insights.cls -a p75 -a count --prod --group-by route --group-by deviceType --since 7d
vercel metrics vercel.speed_insights.inp -a p75 -a count --prod --group-by route --group-by deviceType --since 7d
```

4. Record window, n, device mix, route `/dashboard`, navigation type if exported.
5. A rolling **28d** p75 mixes old and new SHAs until 28 days after deploy. Compare a post-deploy window (for example 7d starting at deploy) against a pre-deploy window of the same length, or wait until n is comparable inside a post-deploy-only slice.
6. Consent gating biases the sample. Device mix (desktop vs mobile) must be reported; field mobile LCP 128 ms previously looked like soft navigations.
7. **Do not** compare staging lab 326 ms TTFB or Lighthouse 7,924 ms mobile LCP to production p75.

CLS field validation stays **pending** until those post-deploy observations exist. Lab CLS 0 / Lighthouse desktop `/dashboard` CLS 0.015 are not field proof.

## D. Rollback

| Layer | Action |
|---|---|
| Application | Vercel instant rollback to previous production SHA, or `git revert` of the squash commit. Two-wave loader has no irreversible data rewrite. |
| 116 indexes | Follow-on serial `DROP INDEX IF EXISTS` for each added `idx_*`. Do not rewrite 116. |
| 116/117 policies | Follow-on serial to restore previous `USING`/`WITH CHECK` only if a policy error appears. InitPlan wrap is authorization-preserving; rollback is usually unnecessary. Forward-only SQL ([RELEASE](../Operations/RELEASE.md)). |
| Field | Record the revert time so the next p75 window is not mixed silently. |

## Remaining lab / field risks

- **Mobile Slow-4G Lighthouse `/dashboard` LCP 7,924 ms** (n=1, ungzipped `next start`). Not isolated to a single remaining waterfall. Do not speculative-refactor. Revisit only with a production-equivalent trace after deploy.
- Field CLS 0.16 (n=46, old code). Lab does not close this.
- Function-invocation TTFB: Observability Plus **not** purchased.
- After-idle Next.js prefetch of marketing chunks on `/dashboard` (not initial JS).

## Loop 6 final checks

| Check | Result |
|---|---|
| Integrity | TRACE default off; `vercel.json` does not set it; ANALYZE gated |
| `lint` / `typecheck` / `test` | PASS / PASS / **361 files, 2598 tests** |
| `verify:migrations` / `verify:docs` | PASS / PASS |
| `build` / analyze | PASS / PASS (Windows `ANALYZE=true` + 8 GB heap) |
| Playwright staging | **6/6 PASS**. Smoke 3 skipped. Lighthouse not re-run |
| Production 116/117 / deploy | **not executed** (Loop 6) |

## Loop 7 fresh verification (pre-commit)

| Check | Result |
|---|---|
| HEAD before commit | `1de95c1` |
| Branch | `perf/fullstack-performance-audit` (local-only before push) |
| `origin/main` | `1de95c1` (synced) |
| `lint` | PASS (0 warnings) |
| `typecheck` | PASS |
| `test` | PASS — **361 files / 2598 tests** |
| `verify:migrations` | PASS — highest serial 117 |
| `verify:docs` | PASS (0 FAIL) |
| `build` (staging env wrapper) | PASS — noindex 281, 0 contradictions |
| Query benchmark | PASS — prefetch avoids 9 snapshot reads |
| Playwright staging | **6/6 PASS** (nav + history incl. mobile + production-lab). `/dashboard` lab TTFB median **236** / LCP **360** / CLS **0**. Smoke 3 skipped. Lighthouse not re-run |
| Local Playwright (`.env.local`) | **not run** — production credentials |

### Loop 7 execution evidence (filled as steps complete)

| Step | Status | Evidence |
|---|---|---|
| Commit + push branch | PENDING | |
| PR → `main` | PENDING | |
| Merge | PENDING | |
| Production migration 116 | PENDING | |
| Production migration 117 | PENDING | |
| Production app deploy | PENDING | |
| Authenticated smoke | PENDING | |
| Post-release field metrics | PENDING | old-SHA baseline only until comparable n |

## Remaining blockers

- Production deploy / 116→117 / field window depend on GitHub+Vercel+Supabase access succeeding in Loop 7
- `PERF_DASHBOARD_TRACE` must not be enabled in production
- Mobile Slow-4G Lighthouse LCP **7,924 ms** remains an unresolved lab risk (not field proof)

## Related Documents

[BASELINE](BASELINE.md) · [AUDIT-FINDINGS](AUDIT-FINDINGS.md) · [QUERY-PLANS](QUERY-PLANS.md) · [OPTIMIZATION-RESULTS](OPTIMIZATION-RESULTS.md) · [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [RELEASE](../Operations/RELEASE.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)
