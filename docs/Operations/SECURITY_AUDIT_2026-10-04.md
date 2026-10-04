# Security Audit Report — 2026-10-04

> Status: CANONICAL
> Last Verified: 2026-10-04
> Verification Scope: Repository-wide attack surface + resume upload incident + staging live Storage API + production readiness (read-only)
> Authority: Point-in-time production security audit and remediation record

## Purpose

Document confirmed vulnerabilities, fixes shipped in this change set, residual risks, and production readiness.

## Severity definitions

| Level | Meaning |
|---|---|
| Critical | Direct exploit → data breach, payment forgery, or privilege escalation |
| High | Realistic abuse with material data/cost impact |
| Medium | Meaningful weakness; exploit needs conditions or causes moderate impact |
| Low | Defense-in-depth / hygiene |
| Informational | Observation; not a confirmed exploit path |

## A. Attack surfaces audited

- 132 API route handlers under `src/app/api/**`
- Server actions (free tools, campus settings)
- Resume upload → extract → classify → storage → parse → AI
- Auth / admin / campus gates
- Payments create-order / verify / webhook
- Interview script turn / score / report / complete
- Voice STT/TTS
- Cron + QStash callbacks
- Supabase production + staging security advisors (read-only)
- Production storage bucket `resumes` (was `public=true` at audit time; **private after addendum K**)
- RLS policies on `resumes`, `users`, `payments`, `credit_transactions`, `storage.objects`

## B. Confirmed vulnerabilities (pre-fix) and remediation

| ID | Severity | Finding | Evidence | Fix in this change set |
|---|---|---|---|---|
| V1 | **High** | Non-resume PDFs accepted (daily routine tracker) | `assertLooksLikeResume` only rejected clear JDs; balanced docs passed | Positive resume-signal requirement + non-resume tracker patterns; tests |
| V2 | **High** | `resumes` bucket public + loose INSERT policy `"Allow authenticated uploads"` (any path) | Live prod SQL: `public=true`; policy `WITH CHECK (bucket_id = 'resumes')` | Migration `112_…` (private bucket + own-path policies). **Applied to staging + production** (see addendum K) |
| V3 | **High** | `/api/debug/*` unlocked for any logged-in user when `IE_DEBUG_ROUTES=1` | `getUser()` only | `requireDebugAdminAccess` → platform admin |
| V4 | **Medium** | Client-trusted `performanceBucket` on script complete | Zod enum persisted from body | Ignored; server forces `average` on repair path |
| V5 | **Medium** | `/api/admin/metrics` used weaker `ADMIN_EMAILS`-only gate | Custom gate skipped `platform_role`/builtin | `requirePlatformAdmin` |
| V6 | **Medium** | Expensive script LLM routes lacked edge rate limits | `proxy.ts` only limited start/answer | Added turn / answer-score / auto-structure / report / complete / report-generate |
| V7 | **Medium** | IndexNow secret accepted via `?secret=` | Query auth in submit route | Bearer-only |
| V8 | **Low** | Orphan storage objects if DB write failed after upload | No `storage.remove` on DB error | Best-effort cleanup |
| V9 | **Low** | Health endpoint echoed provider error strings | Unauthenticated JSON | Opaque status + server logs only |
| V10 | **Medium** | Weak prompt isolation for resume → AI | Plain `Resume:\n` concatenation | `<resume_document>` fencing + ignore-instructions system text |

### Initial incident root cause (V1)

A daily-routine-tracker PDF is a valid ≤10-page PDF with extractable text. It fails neither encryption/magic/page gates nor the garbage gate. The classifier kept `kind=balanced` and **accepted** it because only `kind === 'job_description'` was rejected.

## C. Potential weaknesses (not confirmed exploits)

| Item | Severity | Notes |
|---|---|---|
| Free-tool LLM actions fail-open if Redis down | Medium | Intentional availability trade-off; IP limited when Redis up |
| RLS-enabled tables with no policies (email_*, product_events, subscriptions, …) | Info/Low | Deny-all for anon/authenticated; service-role used by app — verify no client access expected |
| Leaked-password protection disabled (Supabase Auth) | Medium | Advisor WARN — enable in Supabase Dashboard |
| Hardcoded founder admin email | Low | Intentional solo-founder backstop; env still required for others |
| Public OG `/api/share/card` cost | Low | Unauthenticated render; monitor abuse |
| Authenticated LLM cost amplification | Medium | Partially mitigated by new proxy rate limits; per-user Redis fail-closed still missing on turn/score |

## D. Remediation summary

### Files modified / added (security-relevant)

- `src/lib/documents/document-classification.ts` (+ tests)
- `src/lib/resume/parse-outcome.ts`
- `src/lib/openai/parse-resume.ts`
- `src/app/api/resume/upload/route.ts`
- `src/components/resume/workspace/ResumeUploadPanel.tsx`
- `src/lib/debug/require-debug-admin.ts` (new)
- `src/app/api/debug/{env,storage,storage-upload}/route.ts`
- `src/lib/debug/upload-diagnostics.ts`
- `src/app/api/admin/metrics/route.ts`
- `src/app/api/interview/script/complete/route.ts` (+ tests)
- `src/proxy.ts`
- `src/app/api/indexnow/submit/route.ts`
- `src/app/api/health/route.ts`
- `supabase/migrations/112_resumes_bucket_private_and_storage_policies.sql`
- Docs: `RESUME_PIPELINE.md`, `SECURITY.md`, `FEATURE_FLAGS.md`, this report, `docs/INDEX.md`

### Database

- **Prepared:** `112_resumes_bucket_private_and_storage_policies.sql`
- **Applied (staging):** `iiowrzfwemaxytbykjrg` — version `20261004055215` / name `resumes_bucket_private_and_storage_policies`
- **Applied (production):** `plfuvgkycmxcyshrgpgv` — version `20261004064336` / name `resumes_bucket_private_and_storage_policies` (addendum K)

### Performance

- Proxy rate limits on expensive interview LLM paths (abuse + cost)
- No large caching changes (avoid candidate-data cache isolation risk)

## E. Verification report (executed 2026-10-04)

| Command | Result |
|---|---|
| `npx vitest run src/lib/documents/document-classification.test.ts src/app/api/interview/script/complete/route.test.ts src/app/api/resume/upload/route.test.ts` | **PASS** — 3 files, 18 tests (later expanded classification suite: 13 tests PASS) |
| `npx vitest run src/lib/razorpay/` | **PASS** — 6 files, 70 tests |
| `npx vitest run` signed-file-url / resume-file-access / upload / file routes | **PASS** — 5 files, 29 tests |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (exit 0; pre-existing CoachClient warning) |
| `npm run verify:migrations` | **PASS** — highest 112 |
| `npm run verify:docs` | **PASS** (0 FAIL; archive/intentional WARNs only) |
| `npm run verify:pdf` | **PASS** |
| `npm run build` (+ noindex audit) | **PASS** |
| `npm run test:e2e` / `test:e2e:staging` | **NOT RUN** — no staging app session credentials in this session |
| Migration 112 on **staging** `iiowrzfwemaxytbykjrg` | **PASS** — applied; bucket `public=false`; own-path RLS verified via SQL role probe |
| Migration 112 on **production** | **PASS** — applied `20261004064336`; bucket `public=false` (addendum K) |
| Confirm `IE_DEBUG_ROUTES` unset in Vercel prod | **PASS** — `vercel env ls production --project interview-era`: key **absent** (secure default off) |

### Staging storage RLS probe (SQL, rolled back)

| Check | Result |
|---|---|
| Authenticated own SELECT | PASS (`own_select=1`) |
| Cross-user SELECT | PASS (`cross_select=0`) |
| Anon SELECT | PASS (`anon_select=0`) |
| Own-path INSERT (`resumes/{uid}/…`) | PASS |
| Cross-user INSERT | PASS denied |
| Legacy `{uid}/…` INSERT | PASS |
| Anonymous public object URL | PASS HTTP **400** (not readable) |

### Classification regression (code-level)

| Case | Result |
|---|---|
| Valid resume / e2e sample | ACCEPT |
| Daily routine tracker | REJECT |
| Job description | REJECT |
| Unrelated prose / instruction-like text | REJECT |
| Empty / tiny | REJECT |

## F. Residual risk register

| Risk | Severity | Business impact | Why open | Next action | Prod exposure OK? |
|---|---|---|---|---|---|
| Public resumes bucket on **production** until 112 applied | High | ~~Public URLs fetchable~~ | **Resolved in addendum K** — `public=false` | N/A | N/A |
| Loose prod INSERT `"Allow authenticated uploads"` | High | ~~Any path INSERT~~ | **Resolved in addendum K** — policy dropped | N/A | N/A |
| Active resumes missing `storage_path` (~144) | Medium | Secure download already 404; public `file_url` works today until private | Historical rows; backfill script exists | Dry-run then apply `scripts/backfill-resume-storage-path.ts` before/with cutover | Acceptable briefly if download already degraded |
| HaveIBeenPwned password check off | Medium | Weaker password quality | Dashboard toggle | Enable in Auth settings | Acceptable short-term |
| Free-tool fail-open RL | Medium | ~~LLM cost if Redis outage~~ | **Resolved in addendum J** — all LLM free tools `failClosed: true` | N/A | N/A |
| Per-route fail-closed RL on turn/score | Medium | Authenticated cost abuse | Edge RL only | Add route-level fail-closed + cost guard | Acceptable short-term |
| Full app E2E resume workspace on staging host | Low | Gaps in UI-level upload/replace/delete smoke | Staging `NEXT_PUBLIC_APP_URL` is localhost | Run `npm run test:e2e:staging` against Preview when available | Yes |

## G. Production readiness verdict

See **Addendum H** for the migration authorization decision.

---

## H. Addendum — Staging live verification & production migration readiness (2026-10-04)

> Addendum authority: closes live Storage API gaps; production read-only audit; runbook.  
> **No production migration was executed in this addendum.**

### H.1 Environment boundaries

| Env | Ref | Role this session |
|---|---|---|
| Staging | `iiowrzfwemaxytbykjrg` | Live Storage API + RLS verification (`.env.staging.local` only) |
| Production | `plfuvgkycmxcyshrgpgv` | Read-only configuration / path audit |
| Local `.env.local` | production host | **Not used** for staging probes |

### A. Staging live verification

Credential source: `.env.staging.local` via `loadSafeStagingEnvironment` (ref guard). E2E test account sign-in used; no new accounts created. Probe objects cleaned up.

| Test | Status | Evidence |
|---|---|---|
| Staging env isolation | PASS | Host `iiowrzfwemaxytbykjrg.supabase.co`; service+anon+E2E present |
| Service-role upload canonical path `resumes/{uid}/…` | PASS | `serviceUploadOwnPath.ok=true` |
| Service-role upload second user path | PASS | Expected (service-role bypasses RLS) |
| Service-role upload legacy `{uid}/…` | PASS | `serviceUploadLegacyPath.ok=true` |
| Public object URL inaccessible | PASS | HTTP **400**, `looksPublicPath=true`, negligible body |
| Signed URL mint (service-role) | PASS | `/object/sign/` path; not public |
| Signed URL fetch while valid (TTL 5s) | PASS | HTTP **200**, body matched probe text |
| Signed URL after expiry | PASS | HTTP **400** after ~6.5s |
| Anon unauthenticated download | PASS | `Object not found` / not ok |
| Anon list under `resumes/` | PASS | `count=0` |
| E2E user sign-in | PASS | `e2eSignIn.ok=true` (uid prefix only logged) |
| Authenticated direct upload **own** path | PASS | Storage RLS allows |
| Authenticated direct upload **cross-user** path | PASS denied | `new row violates row-level security policy` |
| Authenticated download own object | PASS | ok |
| Authenticated download cross-user object | PASS denied | `Object not found` / denied |
| Service-role signed fetch for E2E own object | PASS | HTTP **200** |
| Probe cleanup | PASS | `cleanup.ok=true` |
| Prior SQL RLS role probe (own/cross/anon) | PASS | See §E |
| App HTTP upload via `/api/resume/upload` | **BLOCKED** | Staging app URL is `127.0.0.1:3000`; no staging Preview session started |
| Resume listing / replace / delete UI flows | **BLOCKED** | Same — needs `npm run test:e2e:staging` against a staging-backed Preview |
| Resume analysis re-read from storage | **NOT RUN** | Parse uses DB `raw_text` (code-level); no storage re-fetch on parse |
| Orphan cleanup after failed DB write | **NOT RUN** live | Covered by code path in upload route; not re-probed end-to-end |

### B. Production storage readiness (read-only)

| Fact | Value |
|---|---|
| Bucket `public` | **true** (unsafe; target of 112) |
| Size / MIME | 4 MiB; `application/pdf`, `text/plain` |
| Policies today | `"Allow authenticated uploads"` INSERT any path in bucket; `storage_resumes_insert_own_uid` with `foldername[1]=auth.uid()` only (mismatched to canonical `resumes/{uid}/…`) |
| SELECT/UPDATE/DELETE own policies | **Absent** today (public bucket readability is the exposure) |
| Storage objects | 219; **100%** canonical `resumes/{uid}/file` (`path_uid_file=0`, `path_other=0`) |
| Active resume rows | 299 |
| Active with `storage_path` | 155 (all canonical shape) |
| Active missing `storage_path` | **144** |
| Active with public `file_url` | **299** (`/object/public/resumes/...`) |
| Soft-deleted rows | 40 (aggregate) |
| `resume_versions` missing path w/ file_url | 184 (aggregate) |

#### Compatibility assessment (code + data)

| Concern | Impact of applying 112 | Severity |
|---|---|---|
| Product download `GET /api/resume/:id/file` | Continues for rows with `storage_path`; already 404 without it (`MISSING_STORAGE_PATH`). Service-role `createSignedUrl` works on private buckets (staging live PASS). | Low for app path; Medium UX for 144 missing-path rows (pre-existing) |
| Legacy public `file_url` bookmarks | **Will stop working** (intended security outcome). App UI uses `fileDownloadPath`, not durable public URLs. | Expected break of insecure links |
| Resume parse / analysis | Uses `raw_text` in DB — **not** re-download from Storage | None |
| Upload / replace | Service-role upload — bypasses RLS; path `resumes/{uid}/…` matches 112 policies | None |
| Listing / delete | DB + service-role storage remove | None |
| Health check | Service-role `list` — still works when private | None |
| Historical object paths | All objects canonical — no special legacy object migration needed | None |
| Prod-only loose INSERT policy | Removed by 112 — **required** security fix | Positive |

**Backfill recommendation (not executed):** run `npx tsx scripts/backfill-resume-storage-path.ts` (dry-run) against production credentials in an authorized ops window, then `--apply` for verified objects, so more of the 144 missing-path rows become downloadable via signed URLs after public URLs die.

### C. Production migration runbook (do not execute without separate authorization)

#### Preconditions (go/no-go)

1. Confirm target project ref is **`plfuvgkycmxcyshrgpgv`** (name check + URL host).
2. Confirm staging remains `public=false` with four own-path policies (already verified).
3. Confirm production app already ships signed-download path (`GET /api/resume/:id/file`) — current code does.
4. **Recommended:** backfill dry-run report reviewed; apply recoverable `storage_path` updates.
5. Operator on standby; maintenance window optional (migration is fast DDL/policy).
6. Snapshot/PITR awareness: Supabase project backups / PITR as available — do not claim custom dump was taken unless performed.

**GO** if 1–3 true and operators accept public-URL breakage + optional backfill.  
**NO-GO** if wrong project, or product still serves downloads exclusively via public `file_url` (it does not).

#### Exact changes (same SQL as `112_resumes_bucket_private_and_storage_policies.sql`)

1. `UPDATE storage.buckets SET public=false … WHERE id='resumes'`
2. `DROP POLICY IF EXISTS "Allow authenticated uploads"`
3. Replace/create INSERT/SELECT/UPDATE/DELETE own-path policies for `resumes/{uid}/…` and legacy `{uid}/…`

#### Prod vs staging differences to reconcile

| Item | Staging (post-112) | Production (now) |
|---|---|---|
| `public` | false | true |
| Loose INSERT | absent | **present** — must drop |
| Own SELECT/UPDATE/DELETE | present | absent |
| Own INSERT path check | `[1]=uid OR ([1]=resumes AND [2]=uid)` | `[1]=uid` only (insufficient for canonical keys) |
| Object path mix | empty/canonical | 100% canonical |

No extra prod-only SQL required beyond 112; the DROP of the loose policy is the critical prod-specific effect.

#### Expected impact on existing objects

- Object bytes unchanged.
- Public URLs stop serving content.
- Service-role signed URLs continue.
- Authenticated clients can only access own paths under new RLS.

#### Application compatibility requirements

- Downloads: ownership check (`user_id`) + `isOwnedResumeStoragePath` + service-role sign (TTL 120s).
- Do not re-enable public bucket to “fix” download issues — use backfill + signed path instead.

#### Backup / recovery / rollback limitations

- Forward fix is preferred: keep private; repair `storage_path` via backfill.
- **Rollback to `public=true` re-exposes every object to anyone with a URL** — security regression, not a safe recovery default.
- Recreating `"Allow authenticated uploads"` would restore a High severity write hole — do not.
- If policy apply fails mid-way: inspect `pg_policies` + `storage.buckets.public`; re-apply remaining statements from 112 (idempotent DROP/CREATE). Direct `DELETE FROM storage.objects` is blocked by `storage.protect_delete` — use Storage API for object cleanup only.

#### Post-migration checks (production, after authorization)

1. `select public from storage.buckets where id='resumes'` → `false`
2. Confirm loose policy absent; four own-path policies present
3. Anonymous `GET …/object/public/resumes/…` → non-200
4. Smoke: authenticated owner download via app `/api/resume/:id/file` for a row **with** `storage_path`
5. Smoke: upload new resume (service-role path) still succeeds
6. Monitor: `[resume:signed-url]` failures, upload `STORAGE_FAILED`, support reports of broken public links (expected)

#### Monitoring signals

- Spike in `MISSING_STORAGE_PATH` / 404 on `/api/resume/:id/file` (backfill gap)
- Upload 5xx / storage permission errors
- Health `storageResumes.ok=false`

### D. Security regression review (storage)

| Control | Verified? | Evidence |
|---|---|---|
| App never trusts client path for download | Yes | Loads `storage_path` from owned resume row; `mintResumeSignedUrl` checks `resumes/{userId}/` |
| Signed TTL | Yes (code + staging live) | Default 120s; staging 5s expiry → 400 |
| Public URL dual-write not used for access | Yes | `fileDownloadPath` API; candidate snapshot deprecates `fileUrl` |
| Storage RLS complements app authz | Yes | Staging: cross-user direct storage denied; app still needs ownership for signing |
| Service-role boundary | Yes | Upload/sign/remove use service role; debug routes admin-gated |
| Post-delete access | Partial | Soft-delete blocks `/file` (`deleted_at`); storage object removal is separate — orphan objects may remain until cleanup jobs; private bucket limits exposure |
| Error disclosure | Yes | Health/debug hardened; signed URL not logged |

### E. Final decision

**READY FOR PRODUCTION MIGRATION AUTHORIZATION**

Supported by: staging 112 applied; live Storage API authz/signed/public/expiry probes PASS; production path inventory shows canonical objects only; product download path is already signed-URL based; remaining gaps are optional backfill UX and full UI E2E (non-blocking for the storage privacy cutover).

**Still required before/when applying:** explicit production authorization; confirm project ref; recommended `storage_path` backfill dry-run; post-migration checklist above. Do **not** treat public-bucket rollback as a safe recovery plan.

## Related Documents

[RESUME_PIPELINE](../Core/RESUME_PIPELINE.md) · [SECURITY](../Guidelines/SECURITY.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [FEATURE_FLAGS](FEATURE_FLAGS.md) · `scripts/backfill-resume-storage-path.ts`

---

## I. Addendum — Website-wide input validation audit (2026-10-04)

> Implementation addendum: ATS Resume Checker gap + shared resume semantic gate + free-tool JD validation.  
> Does **not** claim exhaustive Zod coverage of all 132 API routes.

### I.1 Inventory summary (by feature)

| Feature / surface | Entry | Server validation status (after this work) |
|---|---|---|
| Interview resume upload | `POST /api/resume/upload` | Shared `validateResumeDocumentText` + PDF gates + size/ext |
| ATS Resume Checker | `checkAtsAction` server action | **Fixed** — same resume gate; optional JD gate; size/type/extract |
| JD extract/parse/validate | `/api/job-description/*` | Already `assertLooksLikeJobDescription` |
| Question generator (JD mode) | `generateQuestionsAction` | **Fixed** — JD semantic gate before rate limit/LLM |
| STAR builder | `buildStarAction` | Length bounds on fields (no file upload) |
| Contact form | `POST /api/contact` | Zod `contactFormSchema` + rate limit |
| Feedback | `POST /api/feedback` | Zod `feedbackSubmitSchema` |
| Interview start | script start + Zod schemas | Role/difficulty/etc. Zod; JD via JD APIs |
| Auth signup/password | auth routes | Zod display name / password schemas |
| Avatar / screenshots | account + feedback | Image MIME/size (not resume) |
| Payments / webhooks | Razorpay routes | Server amounts + signatures (prior audit) |
| Admin mutations | `/api/admin/*` | `requirePlatformAdmin` + mostly Zod |

**Not exhaustively re-validated this session:** every interview turn/transcript length bound, every admin field, every analytics ingest schema edge case. See residual register.

### I.2 Confirmed findings (this pass)

| ID | Severity | Feature | Root cause | Fix | Evidence |
|---|---|---|---|---|---|
| IV-1 | **High** | ATS Resume Checker | No resume semantic classification after extract; ≥50 chars was enough | `validateResumeDocumentText` before cache/LLM; new codes `WRONG_DOCUMENT_TYPE` / `WRONG_JD_TYPE` | ATS pipeline tests reject tracker/JD; accept valid resume |
| IV-2 | **Medium** | ATS optional JD slot | No JD classification | `validateJobDescriptionDocumentText` when JD ≥40 chars | ATS test rejects resume-as-JD |
| IV-3 | **Medium** | Question generator JD mode | Length-only JD checks | Same JD semantic gate before RL/LLM | QG action tests |
| IV-4 | **Low** | ATS client UX | Dropzone silently ignored bad types; no size check | Client type/size reject on drop/submit | `AtsCheckerForm.tsx` |

Interview upload already fixed earlier (positive resume signals). Now both flows share `validate-resume-document-text.ts`.

### I.3 Resume consistency matrix

| Case | Interview upload | ATS checker |
|---|---|---|
| Valid resume | ACCEPT (prior + shared gate) | ACCEPT (test) |
| Daily routine tracker | REJECT | REJECT (test) |
| Job description as resume | REJECT | REJECT (test) |
| Resume as JD | N/A (no JD on upload) | REJECT (test) |
| Empty / too short | REJECT | REJECT |
| Unsupported type | REJECT | REJECT |
| DOCX | Unsupported on upload | Supported + classified |

### I.4 Shared utilities

- `src/lib/documents/validate-resume-document-text.ts` — `validateResumeDocumentText`, `validateJobDescriptionDocumentText`
- Consumers: `/api/resume/upload`, ATS `checkAtsAction`, QG `generateQuestionsAction` (JD mode)
- Classifier SoT remains `document-classification.ts`

### I.5 Verification (this addendum)

| Command | Result |
|---|---|
| Focused validation suites (10 files / 50 tests) | **PASS** |
| ATS pipeline-order + semantic tests | **PASS** |
| QG JD validation tests | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (exit 0; pre-existing CoachClient warning) |
| `npm run verify:pdf` | **PASS** |
| `npm run verify:docs` | **PASS** |
| `npm run build` + noindex | **PASS** |
| E2E ATS UI | **NOT RUN** — no staging Preview session this pass |

### I.7 Verdict

**INPUT VALIDATION REMEDIATION PARTIALLY COMPLETE** — confirmed ATS/interview resume inconsistency closed with a shared server-side gate; QG JD mode hardened; full Zod inventory of every API route remains incremental follow-up.

### I.6 Residual risks

| Risk | Severity | Why open | Next action |
|---|---|---|---|
| Not every admin GET body line-audited | Low | Gate verified; low write risk | Spot-check on change |
| ATS size limit 5 MB vs upload 4 MiB | Low | Product choice for free tool | Align if abuse observed |
| Script turn `lastAnswer` length abuse | Medium | ~~Open~~ | **Resolved in J** — `SCRIPT_ANSWER_MAX_CHARS=12000` |
| Free-tool RL fail-open (QG/STAR) | Medium | ~~Open~~ | **Resolved in J** — `failClosed: true` |

---

## J. Addendum — Remaining API validation & resource control (2026-10-04)

> Closes residual gaps from addendum I: full route inventory, script-turn length, free-tool RL failure policy, campus remind relay, unauth email/share sinks.  
> **Does not** claim every deferred medium item is fixed.

### J.1 Route inventory

Maintained inventory: [`API_ROUTE_VALIDATION_INVENTORY_2026-10-04.md`](API_ROUTE_VALIDATION_INVENTORY_2026-10-04.md)

| Metric | Count |
|---|---|
| Total `src/app/api/**/route.ts` | **132** |
| Audited (inventory complete) | **132** |
| Remaining unaudited routes | **0** |
| Deferred medium/low hardening items | See inventory §Deferred |

### J.2 Findings + remediation (this pass)

| ID | Severity | Affected | Root cause | Remediation |
|---|---|---|---|---|
| IV-5 | High | `POST …/script/turn`, `answer-score`, `auto-structure` | Unbounded answer/transcript/question/role strings | Shared Zod in `script-turn-request-schema.ts`; max answer/transcript **12000**; question **2000**; role **100** |
| IV-6 | High | QG / STAR / QG-answer | `failClosed: false` → unlimited LLM on Redis errors | All LLM free tools `failClosed: true`; opaque unavailable message |
| IV-7 | **Critical** | `POST /api/college/deadlines/remind` | No Zod; any email array; no enrollment check; no RL; HTML injection | Zod max 200; enrollment allowlist; fail-closed RL; escape HTML; prefer DB description |
| IV-8 | High | contact, anon feedback, signup, forgot-password, resend-verification | Email sinks with fail-open RL | `failClosed: true` + 503 on Redis unavailable |
| IV-9 | High | `GET /api/share/card` | Unauth image render, no RL | IP RL 30/min fail-closed |
| IV-10 | Medium | `POST /api/auth/signup` | Open `metadata` record into `user_metadata` | Strict allowlist `{ role: 'college_admin' }` |
| IV-11 | Medium | `POST /api/indexnow/submit` | Uncapped `urls` array | Max 200 URLs; per-URL length ≤2048 |

### J.3 Rate-limit failure policy (free tools + email)

| Surface | Redis configured + error | Redis **not** configured (local DX) |
|---|---|---|
| ATS / QG / STAR / QG-answer | Deny — generic “temporarily unavailable” | `checkRateLimit` still fail-opens (dev only) |
| Contact / anon feedback / auth email | Deny — 503 | Same local DX exception |
| Script LLM (proxy) | Still fail-open at edge | Deferred in-route fail-closed |

Errors never echo Redis/Upstash exception text.

### J.4 Script-turn length enforcement

| Field | Max | Enforced |
|---|---|---|
| `lastAnswer`, `sttRawTranscript` | 12_000 | Server Zod before ownership/LLM/persist |
| `transcript` / `rawTranscript` (score/structure) | 12_000 | Same shared schema module |
| `displayQuestion` | 2_000 | Same |
| `targetRole` | 100 | Same |

Empty / `[NONE]` / `[SKIPPED]` / `[TIMEOUT]` still valid. Exact max accepted; max+1 → 400 `Invalid request body`.

### J.5 ATS E2E

| Check | Status |
|---|---|
| Dedicated Playwright ATS suite | **Absent** — no `e2e/**/*ats*` |
| Unit/integration ATS pipeline tests | Covered (prior addendum I) |
| Live browser ATS against Preview/staging | **BLOCKED** — no staging Preview / session credentials in this session |

### J.6 Known residual risks after J

| Risk | Status |
|---|---|
| Prod resumes bucket public until migration 112 | **Resolved in addendum K** |
| Script turn/score in-route fail-closed + cost guard | Deferred (proxy RL present) |
| Campus/admin bulk-invite blast RL | Deferred |
| ATS Playwright E2E | Blocked (infra) |

---

## K. Addendum — Production migration 112 applied (2026-10-04)

> Production rollout of `112_resumes_bucket_private_and_storage_policies.sql`.  
> **No resume backfill, no object/record deletion of user data, no public-bucket rollback.**

### K.1 Preflight

| Check | Result |
|---|---|
| Project ref | `plfuvgkycmxcyshrgpgv` |
| Project name | `rakeshagencia2604@gmail.com's Project` |
| API host | `https://plfuvgkycmxcyshrgpgv.supabase.co` |
| Status | `ACTIVE_HEALTHY` |
| Distinct from staging | Yes — staging is `iiowrzfwemaxytbykjrg` / InterviewEra Staging |
| 112 already on prod? | No (pre-apply history ended at diagnostic migrations) |
| Pre-apply bucket | `public=true`, 4 MiB, pdf/txt |
| Pre-apply policies | `Allow authenticated uploads` + `storage_resumes_insert_own_uid` only |
| Pre-apply objects | 219; all `resumes/{uid}/file` |
| Pre-apply active resumes | 299 (155 with `storage_path`, 144 without) |
| App download model | Ownership + `mintResumeSignedUrl` / `GET /api/resume/:id/file` (code) |

### K.2 Execution

| Step | Result |
|---|---|
| Mechanism | Supabase MCP `apply_migration` |
| Name | `resumes_bucket_private_and_storage_policies` |
| Apply result | `success: true` |
| History version | `20261004064336` |

### K.3 Post-apply verification

| Check | Result |
|---|---|
| Bucket `public` | **false** |
| Loose INSERT policy | **Absent** |
| Own-path policies | INSERT / SELECT / UPDATE / DELETE present |
| Object count | **219** (unchanged) |
| Active resumes / storage_path counts | **299 / 155 / 144** (unchanged) |
| Probe leftovers | **0** |
| SQL RLS probe (rollback-only) | own_insert=t, legacy_insert=t, cross_insert_denied=t, own_select=1, cross_select=0, anon_select=0 |
| Anon public URL (existing object) | HTTP **400**, denied |
| Service-role upload + signed fetch | **PASS** (ephemeral probe; cleaned up) |
| Anon Storage download | **Denied** |
| Anon list under `resumes/` | count **0** |

### K.4 Application compatibility

| Flow | Status |
|---|---|
| Signed-URL ownership mint (unit tests / code path) | Verified in code + unit tests |
| Service-role signed download of probe object | **PASS** (live) |
| Public object URL content exposure | **Denied** (live) |
| Authenticated candidate upload/list/replace/delete/download UI | **BLOCKED** — no safe production candidate session in this rollout |
| Analysis via `raw_text` DB path | Code-level unchanged (no storage re-fetch) |

### K.5 Data integrity

- No backfill script executed.
- No production resume rows updated/deleted.
- No user storage objects deleted (only ephemeral probe object created and removed via Storage API).
- Object count remained 219 before/after.

### K.6 Verdict

**Production migration 112 SUCCESS** for storage privacy controls. Overall product E2E resume UX on production remains **unverified** without a candidate session — track as follow-up smoke, not a migration failure.

### J.7 Verification (commands run in this addendum)

| Command | Result |
|---|---|
| `npx vitest run` script-turn schema + free-tool RL + remind + resume validate + ATS pipeline + signup (6 files / 31 tests) | **PASS** |
| `npx vitest run` auth + redis rate-limit + QG JD + STAR actions (5 files / 15 tests) | **PASS** |
| `npm run typecheck` | **PASS** |
| `npm run lint` | **PASS** (exit 0; pre-existing CoachClient warning only after unused-var fix) |
| `npm run verify:pdf` | **PASS** |
| `npm run verify:docs` | **PASS** (0 FAIL) |
| `npm run build` (+ noindex) | **PASS** |
| ATS Playwright E2E | **NOT RUN** — no dedicated suite; staging Preview blocked |

### J.8 Verdict

**PARTIALLY COMPLETE** for website-wide input validation: inventory of all 132 routes is done; Critical/High gaps found in this pass are remediated; deferred medium items (in-route script LLM fail-closed, bulk-invite RL) and prod migration 112 remain open.
