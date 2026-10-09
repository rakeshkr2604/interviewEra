# Production Privacy, Legal, Accessibility & Trust Hardening

> Status: AUDIT (living)
> Last Verified: 2026-10-09
> Verification Scope: Implementation + unit tests + staging Playwright cookie-consent E2E + migration 114 applied on staging and production (ledger + schema probes)
> Authority: Engineering evidence only — **not** a legal compliance attestation

## Purpose

Evidence-based audit and remediation of the 20-item production-readiness checklist.

Evidence legend: **I** = implementation · **T** = automated tests · **R** = browser/runtime · **P** = production schema/ops probe · **L** = founder/legal decision

## Executive summary

Trust hardening is implemented on branch `add-cookie-consent-pop-up` (working tree on base `d361ec9`). Optional analytics are consent-gated; signup enforces 18+ and Terms/Privacy; migration `114_signup_consent_records` is applied on **staging and production** with schema verification; privacy/deletion copy matches CASCADE reality; Playwright cookie-consent E2E passes against **staging** Supabase (`iiowrzfwemaxytbykjrg`) after fixing `allowedDevOrigins` so Next.js hydrates on `127.0.0.1`.

Payment tax-retention vs CASCADE remains a **documented recommendation** (no High-Risk FK change without founder/legal approval). GSTIN, trust-metric provenance, and media licenses remain founder-blocked.

### Scoreboard (final)

| Status | Count | Items |
|---|---|---|
| PASS | 7 | 3, 5, 6*, 9*, 11, 17, 18* |
| PARTIAL | 11 | 1, 2, 4, 7, 8, 10, 12, 13, 14, 15, 20 |
| FAIL | 0 | — |
| BLOCKED | 2 | 16 (GSTIN/entity), 19 (media rights) |

\*Primary engineering criteria met; residual notes below (contact-form notice; counters provenance; List-Unsubscribe header).

---

## 20-item status table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Privacy policy | PARTIAL | I — cookies/processors/retention updated; L — lawyer pass still open |
| 2 | Terms of service | PARTIAL | I — acceptance UX + versions; L — enforceability review |
| 3 | Refund policy | PASS | I — content aligns with one-time SoT; live refunds NOT run |
| 4 | Cookie policy | PARTIAL | I — `#cookies` inventory + footer links; no separate `/cookies` |
| 5 | Cookie/analytics consent | PASS | I+T+R — unit + staging Playwright 5/5 |
| 6 | Form consent records | PASS | I+T — feedback opt-in; signup age/terms server+UI; migration 114 P |
| 7 | Data minimization | PARTIAL | I — inventory documented; no unjustified field removal |
| 8 | Third-party SDKs | PARTIAL | I — privacy inventory; L — DPA review |
| 9 | Dark patterns | PASS | I+R — equal Accept/Reject; stars match 4.5; signup gates |
| 10 | Pricing transparency | PARTIAL | I — GST-inclusive copy; L — GSTIN |
| 11 | Fake reviews | PASS | I+T — no fabricated quotes; consent default-off |
| 12 | Marketing claims | PARTIAL | I — conservative; L — counter methodology |
| 13 | Image alt text | PARTIAL | I — existing + axe; not full inventory |
| 14 | Color contrast | PARTIAL | T — axe suites; full AA NOT VERIFIED |
| 15 | Keyboard / a11y | PARTIAL | R — consent keyboard E2E PASS; interview routes not covered |
| 16 | Business details | BLOCKED | L — no GSTIN/CIN inventable from repo |
| 17 | Age restrictions | PASS | I+T — UI+API; self-declare only |
| 18 | Email unsubscribe | PASS | I+T — API tests + `/unsubscribe` page; List-Unsubscribe header NOT verified |
| 19 | Asset licensing | BLOCKED | L — fonts OK; `public/assets` media unknown |
| 20 | Account deletion | PARTIAL | I+T — auth/phrase/cascade; retention recommendation below (no FK change) |

---

## Objective 1 — Browser E2E (cookie consent)

### Environment

| Fact | Value |
|---|---|
| Config | `playwright.staging.config.ts` |
| Supabase | `iiowrzfwemaxytbykjrg` (InterviewEra Staging) — **not** production |
| Guard | `assertE2eSupabaseTargetNotProduction` logged `staging=true` |
| App URL | Local webServer via staging env (`127.0.0.1` / localhost) |
| Fix required | `next.config.ts` `allowedDevOrigins` += `127.0.0.1`, `localhost` (without this, client components never hydrated) |

### Command

```bash
E2E_ENVIRONMENT=staging npx playwright test e2e/marketing/cookie-consent.spec.ts --config=playwright.staging.config.ts
```

### Result

**PASS — 5/5** (~1.1m)

Covered: initial banner + no GA/Clarity tags before choice; reject + reload persistence; accept + navigation persistence; Cookie settings reopen + withdrawal; keyboard Manage/Escape/Reject.

Not claimed: production browser verification; Clarity/GA network calls in `NODE_ENV=development` (scripts are production-gated).

---

## Objective 2 — Account deletion & payment retention

### Live FK probe (production `plfuvgkycmxcyshrgpgv`)

`payments.user_id` → `users(id)` **ON DELETE CASCADE** (confirmed via `information_schema`).

Also CASCADE (examples): `interviews`, `resumes`, `credit_transactions`, `email_preferences`, `subscriptions`, campaign redemptions, etc.

SET NULL (examples): `feedbacks`, `product_events`, `script_interview_reports`, `lifecycle_email_log`, many telemetry tables.

### Current deletion semantics

1. `POST /api/account/delete-account` deletes `public.users` then `auth.admin.deleteUser`.
2. App payment rows **are deleted** with the user (CASCADE).
3. Razorpay retains processor-side records under its own policies (outside app DB).
4. Privacy + Danger Zone copy now state this honestly (no false “7-year app DB retention”).

### Recommendation (BLOCKED for implementation — founder/legal)

**Do not change CASCADE in this PR.** Changing `payments.user_id` to `ON DELETE SET NULL` (or anonymised ledger table) is High Risk (PAYMENTS invariant, RLS, reporting, admin tools).

If Indian GST / books require InterviewEra to retain **application** payment facts after account erasure:

| Topic | Proposal |
|---|---|
| Goal | Keep financial facts without personal identifiers after delete |
| Schema | New follow-on migration: make `payments.user_id` nullable; `ON DELETE SET NULL`; add `deleted_user_hash` / redact email if any; before user delete, service-role anonymise then delete user |
| Alternates | Export invoice PDF to user before delete; rely on Razorpay dashboard only (document as SoT) |
| Risks | Broken admin “user payments” joins; attribution; refund tooling |
| Rollback | Forward-fix only |
| Tests | Unit: delete-account leaves anonymised payment row; no cross-user leak |
| Decision needed | Founder/legal: **Is app-DB retention required beyond Razorpay?** Yes → schedule High-Risk migration. No → keep CASCADE + current honest copy (**status quo**). |

Interview-history delete remains distinct (`delete-interview-data`) and does not touch payments.

---

## Objective 3 — Founder-dependent items

| Topic | Verifiable in repo | Requires founder |
|---|---|---|
| Support email | `support@interviewera.com` | — |
| Grievance | Rakesh Kumar / `founder@interviewera.com` | Confirm still current |
| Address | Friends Colony… Ranchi… (privacy constants) | Confirm registered office / entity name |
| GSTIN / CIN | **Not present** | Provide if registered |
| Trust metrics 537 / 2143 / 4.5 | Hardcoded in `trust-metrics.ts` | Methodology / as-of date |
| Fonts | Google Fonts via `next/font` (OFL) | — |
| Brand kit | `docs/Core/BRAND_ASSETS.md` | — |
| `public/assets` avatars/video | ATTRIBUTION.md = unknown | License / talent release |

No GSTINs, certifications, or licenses were invented.

---

## Objective 4 — Patch review notes

- Signup consent validated server-side (`z.literal(true)`); campus forms updated.
- Consent columns **not** in authenticated UPDATE grant list (050) — service-role persist only; guard does not need widen for these columns.
- Optional analytics gated; `gtag` also checks consent at event time.
- Migration 114 additive nullable columns only; no backfill.
- `allowedDevOrigins` fix is local-dev/E2E hygiene — no production security weakening.
- Unrelated `validation-results/nft-pr158-*.json` left untouched.

---

## Migration 114 — apply evidence

| Env | Project | Ref | Ledger | Schema columns |
|---|---|---|---|---|
| Staging | InterviewEra Staging | `iiowrzfwemaxytbykjrg` | `20261009072717` / `114_signup_consent_records` | All 5 present (nullable) |
| Production | rakesh… Project | `plfuvgkycmxcyshrgpgv` | `20261009072958` / `114_signup_consent_records` | All 5 present (nullable) |

Columns: `age_confirmed_at`, `terms_accepted_at`, `privacy_accepted_at`, `terms_accepted_version`, `privacy_accepted_version`.

No user-row backfill. No production customer data mutated beyond DDL.

---

## Commands executed (this continuation)

| Command | Result |
|---|---|
| Staging Playwright cookie-consent | **PASS 5/5** |
| `npm run lint` | 0 errors (2 pre-existing warnings unrelated) |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 335 files / **2495** tests |
| `npm run verify:migrations` | PASS (next = 115) |
| `npm run verify:docs` | PASS |
| `npm run build` | PASS |

---

## Remaining blockers

1. **Founder/legal:** GSTIN / legal entity name.
2. **Founder/legal:** App-DB payment retention after delete (implement High-Risk migration only if required).
3. **Founder:** Trust metric methodology.
4. **Founder:** `public/assets` media licenses.
5. **Ops (optional):** Verify Resend `List-Unsubscribe` headers on marketing sends.
6. **Ops (optional):** Production browser smoke of GA/Clarity after Accept (prod build).

## Production safety

- Migration 114 was applied earlier in this workstream (staging then production, additive DDL + schema probes). **This final review turn did not apply any further migrations.**
- No live Razorpay charges/refunds.
- E2E used staging Supabase only.
- No merge or production deploy performed by the agent.
- `allowedDevOrigins` is a Next.js **development-only** allowlist (local Playwright / LAN); it does not widen production CSP, auth, or RLS.

## Related

[AGENTS.md](../../AGENTS.md) · [DATABASE_MIGRATIONS](../Guidelines/DATABASE_MIGRATIONS.md) · [PAYMENTS](../Core/PAYMENTS.md) · [SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [ATTRIBUTION](../../public/assets/ATTRIBUTION.md)
