# Founder Launch-Readiness Register

> Status: LIVING REGISTER
> Last Verified: 2026-10-09
> Verification Scope: Engineering audit after PR #160; marketing launch planned after mid-October 2026
> Authority: Separates engineering tasks from founder attestation and professional legal/CA review — **not legal advice**

## Purpose

Track every open decision required before a truthful public marketing launch. Engineering can remove unsupported claims and ship safe interim behavior; it cannot invent a GSTIN, legal entity, trust metrics, DPAs, or media licenses.

**Founder-confirmed context (2026-10-09):**

- InterviewEra has not started revenue generation yet.
- GSTIN is not currently available.
- Founder believes GST registration may not yet be applicable.
- Product is still validating; marketing launch planned after mid-October 2026.

---

## 1. GST registration applicability and CA review

| Field | Value |
|---|---|
| **Current status** | OPEN — engineering removed GST-inclusive price claims; no GSTIN displayed |
| **Evidence already available** | No GSTIN/CIN in repo; founder confirms no GSTIN; no revenue yet |
| **Exact unresolved decision** | Whether GST registration is required before first taxable sale, given constitution, PAN-based aggregate turnover, nature of supplies, customer locations, exports, and compulsory-registration exceptions |
| **Required person / document** | Chartered Accountant review; constitution docs; PAN; projected turnover |
| **Deadline** | Before first taxable sale **or** when a registration trigger may apply — **not** automatically at marketing launch alone |
| **Safe interim behavior** | Prices shown in INR; “total amount payable is shown before checkout”; no GST added, no invented tax line, no placeholder GSTIN |

### Notes for CA (concise checklist)

1. Confirm business constitution (proprietorship / partnership / company / LLP / other).
2. Confirm PAN and place of business (state category).
3. Assess aggregate turnover vs general service-provider threshold for a non-special-category state (**₹20 lakh** in a financial year, subject to exceptions and notifications).
4. Review compulsory-registration triggers (inter-state supplies, e-commerce, etc.) if any apply.
5. Advise when to obtain GSTIN relative to first paid plan sale.
6. Advise invoice format and whether app-DB payment retention is required after account erasure (see §6).

Do **not** interpret the planned marketing launch as a GST registration trigger by itself.

Engineering tasks: **DONE** (copy + tests). Founder/CA tasks: **OPEN**.

---

## 2. Legal entity, business constitution, and address

| Field | Value |
|---|---|
| **Current status** | OPEN |
| **Evidence already available** | Correspondence address in privacy constants: Friends Colony, Road No. 12, Pandra, Ranchi, Jharkhand, India 835222; grievance officer Rakesh Kumar / founder@interviewera.com; brand name “InterviewEra” |
| **Exact unresolved decision** | Legal service-provider identity (entity name + form); whether Ranchi address is registered office, operating address, or correspondence-only; exclusive court venue if any |
| **Required person / document** | Founder + lawyer; registration certificate if any |
| **Deadline** | Before claiming a registered company / registered office in public copy |
| **Safe interim behavior** | Public copy uses “InterviewEra”, “Correspondence address”, “Laws of India” without exclusive Bengaluru venue or “InterviewEra (India)” / private-limited claims |

Engineering tasks: **DONE** (soften copy + consistency tests). Founder/legal: **OPEN**.

---

## 3. Trust metric provenance

| Field | Value |
|---|---|
| **Current status** | OPEN — **out of scope for this engineering PR**; UI left unchanged |
| **Evidence already available** | Hardcoded public values in `src/lib/landing/trust-metrics.ts` (537 / 2143 / 5186 / 8742 candidates/interviews/ATS/questions; 4.5 average rating) continue to render on homepage and auth. No DB query, sample size, as-of date, or rating methodology found in repository |
| **Exact unresolved decision** | For each metric: SoT query, eligibility, dedupe rules, window, as-of date; for rating: feedback source, n, calculation, public-testimonial consent |
| **Required person / document** | Founder attestation + (optional) analytics export — **manual future to-do** |
| **Deadline** | Before claiming verified public social proof (founder-owned timing) |
| **Safe interim behavior (this PR)** | **No code change** to trust metrics, ratings, or consuming UI. Provenance verification is tracked here only |

Engineering tasks this PR: **NONE (explicitly out of scope)**. Founder: **OPEN (manual)**.

---

## 4. Asset ownership, licenses, and talent releases

| Field | Value |
|---|---|
| **Current status** | OPEN / BLOCKED for legal clearance |
| **Evidence already available** | Inventory in `public/assets/ATTRIBUTION.md` (avatars + assets); fonts via Google Fonts OFL; brand kit documented in BRAND_ASSETS |
| **Exact unresolved decision** | Commercial rights + talent releases for Meera/Rohan video/stills and `public/assets/*` media; brand package ownership assignment |
| **Required person / document** | Founder attestation and/or license receipts |
| **Deadline** | Before marketing launch that relies on those likenesses |
| **Safe interim behavior** | Keep Meera path `/avatars/female/meera-ai.mp4` working; do not delete binaries; do not claim licensed |

Engineering tasks: inventory **DONE**; fallback removal PR only if founder cannot attest. Founder: **OPEN**.

---

## 5. Third-party DPAs and vendor review

| Vendor | Purpose | Region / notes (from product docs) | DPA / agreement status | Decision required |
|---|---|---|---|---|
| Supabase | DB, Auth, Storage | Singapore (ap-southeast-1) stated in privacy | Unknown — not found in repository | Confirm DPA signed / sufficient |
| Razorpay | Payments | India | Unknown in repo | Confirm merchant agreement + tax invoicing duties |
| Resend | Email | Provider policies | Unknown in repo | Confirm DPA / processing terms |
| OpenRouter / LLM providers | Interview AI | Cross-border inference | Unknown in repo | Confirm processor terms for resume/answer content |
| Deepgram | STT | Audio processing | Unknown in repo | Confirm terms |
| ElevenLabs | TTS | Voice synthesis | Unknown in repo | Confirm terms |
| Vercel | Hosting / Analytics | CDN + logs | Unknown in repo | Confirm DPA if required |
| Google Analytics 4 | Optional analytics | Consent-gated | Unknown in repo | Confirm config + DPA/terms |
| Microsoft Clarity | Optional session insights | Consent-gated | Unknown in repo | Confirm terms; retention |
| Upstash | Redis / rate limits | Infra metadata | Unknown in repo | Confirm terms |

| Field | Value |
|---|---|
| **Current status** | PARTIAL (inventory) / OPEN (agreements) |
| **Safe interim behavior** | Consent-gate optional analytics; document processors in privacy; do not claim DPAs are signed |

---

## 6. Payment retention and account deletion

| Field | Value |
|---|---|
| **Current status** | STATUS QUO PRESERVED — pending professional review |
| **Evidence already available** | `payments.user_id` ON DELETE CASCADE (prod probe in trust audit); delete-account phrase-gated; privacy + Danger Zone honest about CASCADE; unit tests for auth/phrase/cascade path |
| **Exact unresolved decision** | Whether InterviewEra must retain **application** financial facts after account erasure for tax/books (Razorpay retention alone may be insufficient) |
| **Required person / document** | CA + lawyer |
| **Deadline** | Before promising multi-year app-DB invoice retention; before High-Risk FK migration |
| **Safe interim behavior** | Keep CASCADE; no High-Risk FK change; tell users to download invoices before delete |

**Note:** Absence of GST registration does **not** automatically eliminate all financial-record obligations.

Engineering: verification **DONE**; FK change **NOT** implemented.

---

## 7. Legal review of privacy, terms, and refund policy

| Field | Value |
|---|---|
| **Current status** | OPEN — engineer-aligned copy only |
| **Evidence already available** | Privacy cookies/processors/retention; signup consent; refund one-time SoT; contact-form privacy notice; no separate `/cookies` page (privacy `#cookies` sufficient for now) |
| **Exact unresolved decision** | Enforceability, DPDP completeness, refund fairness, grievance process, entity identity in notices |
| **Required person / document** | Lawyer review |
| **Deadline** | Before representing policies as lawyer-approved |
| **Safe interim behavior** | Ship honest engineering-aligned copy; do not claim legal approval |

### Lawyer-review checklist (concise)

1. Data Fiduciary identity and correspondence vs registered office.
2. DPDP consent / notice adequacy for AI processing of resumes and transcripts.
3. Cross-border transfer language vs actual processors.
4. Cookie / analytics consent UX and withdrawal wording.
5. Account deletion vs financial retention.
6. Refund / one-time plan / promo-code clauses.
7. Terms governing law / venue once entity known.
8. Age gate (18+) self-declaration sufficiency.
9. Marketing email unsubscribe + List-Unsubscribe adequacy.
10. Contact-form notice sufficiency.

---

## 8. Production smoke-test requirements

| Check | Owner | Status |
|---|---|---|
| Staging cookie consent Accept/Reject + Cookie settings | Eng | PASS (prior PR #160) |
| Production GA/Clarity load only after Accept | Founder/ops | OPEN |
| Checkout amount matches Razorpay charge (Starter/Pro) | Eng/founder | Manual before launch |
| Unsubscribe one-click + Settings digest off | Eng | API tested; prod smoke OPEN |
| Account delete phrase + cannot re-login | Eng/founder | Unit tested; prod smoke OPEN |
| Homepage trust metrics unchanged (provenance is founder manual to-do) | Founder | OPEN — not modified in this PR |
| Pricing page has no GST-inclusive claim | Eng | DONE this PR |

---

## Separation of work

| Type | Items |
|---|---|
| **Engineering (this PR)** | Remove GST claims; soften entity copy; List-Unsubscribe on weekly digest; contact privacy notice; ATTRIBUTION inventory; a11y route expansion; tests; audits. **Trust metrics intentionally untouched.** |
| **Founder attestation** | Entity; address type; trust metric methodology (manual future to-do); media rights; brand package ownership |
| **CA review** | GST applicability; invoicing; payment retention |
| **Lawyer review** | Privacy/terms/refund enforceability; DPDP; venue |

## Related

[production-trust-hardening.md](./production-trust-hardening.md) · [ATTRIBUTION.md](../../public/assets/ATTRIBUTION.md) · [PAYMENTS.md](../Core/PAYMENTS.md) · [TESTING.md](../Guidelines/TESTING.md)
