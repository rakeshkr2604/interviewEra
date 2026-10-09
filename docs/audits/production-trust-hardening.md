# Production Privacy, Legal, Accessibility & Trust Hardening

> Status: AUDIT (living)
> Last Verified: 2026-10-09
> Verification Scope: Follow-on launch-readiness engineering on `chore/launch-readiness-gst-trust` after PR #160 merge `f8e654e` (trust metrics explicitly out of scope)
> Authority: Engineering evidence only — **not** a legal compliance attestation

## Purpose

Evidence-based audit and remediation of the 20-item production-readiness checklist.

Evidence legend: **I** = implementation · **T** = automated tests · **R** = browser/runtime · **P** = production schema/ops probe · **L** = founder/legal/CA decision

Founder decisions and GST/CA checklists live in [`founder-launch-readiness.md`](./founder-launch-readiness.md).

## Executive summary

PR #160 shipped consent gating, signup age/Terms, migration 114, and honest deletion copy. This follow-on removes unsupported **GST-inclusive** claims (no GSTIN), softens unverified **legal-entity / venue** language, expands media **ATTRIBUTION**, adds **List-Unsubscribe** headers on weekly digest, adds a contact-form privacy notice, expands marketing axe routes, and documents CA/lawyer/vendor decisions without inventing evidence.

**Trust metrics / ratings are unchanged** in this PR (hardcoded UI retained). Provenance verification remains a founder manual to-do in the launch-readiness register.

Marketing launch (after mid-October 2026) is **not** treated as an automatic GST registration trigger.

### Scoreboard (post launch-readiness engineering)

| Status | Count | Items |
|---|---|---|
| PASS | 9 | 3, 5, 6, 9*, 10*, 11*, 17, 18*, 20* |
| PARTIAL | 9 | 1, 2, 4, 7, 8, 12, 13, 14, 15 |
| FAIL | 0 | — |
| BLOCKED | 2 | 16 (legal entity / GSTIN identity), 19 (media rights attestation) |

\*Residual notes: item 9/11 dark-pattern / fake-review engineering from PR #160 (stars match displayed 4.5; no fabricated quotes) — metric provenance still founder-owned; pricing tax registration CA-owned; List-Unsubscribe headers on weekly digest; payment CASCADE status quo.

---

## 20-item status table

| # | Item | Status | Evidence |
|---|---|---|---|
| 1 | Privacy policy | PARTIAL | I — cookies/processors/retention/correspondence address; contact-form notice; L — lawyer pass open |
| 2 | Terms of service | PARTIAL | I — GST claim removed; venue softened to Laws of India; L — enforceability + venue after entity known |
| 3 | Refund policy | PASS | I — one-time SoT; live refunds NOT run |
| 4 | Cookie policy | PARTIAL | I — `#cookies` + footer Cookie settings; separate `/cookies` not required for meaningful coverage |
| 5 | Cookie/analytics consent | PASS | I+T+R — unit + staging Playwright (PR #160) |
| 6 | Form consent records | PASS | I+T — signup age/terms; feedback opt-in; migration 114 |
| 7 | Data minimization | PARTIAL | I — processor inventory in privacy + founder register; no unjustified field removal |
| 8 | Third-party SDKs | PARTIAL | I — inventory; L — DPA review register in founder-launch-readiness |
| 9 | Dark patterns | PASS* | I — equal Accept/Reject; star glyphs match displayed 4.5 (PR #160); *counter provenance still L |
| 10 | Pricing transparency | PASS* | I+T — INR + pre-checkout total language; plan INR ↔ paise consistency; no GST invent; *CA owns registration applicability |
| 11 | Fake reviews | PASS* | I — no fabricated quotes; consent default-off; *aggregate rating methodology still L |
| 12 | Marketing claims | PARTIAL | I — conservative product copy; L — trust-metric methodology (UI unchanged this PR; founder manual to-do) |
| 13 | Image alt text | PARTIAL | I — existing + expanded axe routes; not full inventory |
| 14 | Color contrast | PARTIAL | T — axe suites light/dark; full AA NOT VERIFIED |
| 15 | Keyboard / a11y | PARTIAL | R — consent keyboard E2E; marketing axe + legal routes added; interview deep routes incomplete |
| 16 | Business details | BLOCKED | L — no GSTIN/CIN/entity form inventable; correspondence address only |
| 17 | Age restrictions | PASS | I+T — UI+API |
| 18 | Email unsubscribe | PASS* | I+T — API + `/unsubscribe`; List-Unsubscribe + Post headers on weekly digest via Resend |
| 19 | Asset licensing | BLOCKED | L — ATTRIBUTION inventory complete; fonts OFL; avatars/video FOUNDER ATTESTATION REQUIRED |
| 20 | Account deletion | PASS* | I+T — auth/phrase/cascade honest; *retention High-Risk FK change pending CA/legal (status quo CASCADE) |

---

## GST vs entity vs pricing (decision split)

| Topic | What engineering can do | What founder/CA must decide |
|---|---|---|
| Pricing transparency | Show INR; match charged amount to displayed total; no fake tax | — |
| GST registration applicability | Document threshold notes; checklist for CA | Constitution, turnover, exceptions, timing vs first sale |
| Legal entity identity | Avoid inventing company form / GSTIN / CIN | Entity name, registration, registered office |
| Marketing launch date | Not treated as GST trigger | Confirm with CA before first taxable supply |

---

## Trust metrics methodology (current)

| Metric | Public UI this PR | Provenance |
|---|---|---|
| Candidates / interviews / ATS / questions | **Unchanged** (still rendered from `trust-metrics.ts`) | Unknown in repo — founder manual to-do |
| 4.5 average rating | **Unchanged** | Unknown in repo — founder manual to-do |

No hide/remove/recalculate work in this PR. See founder-launch-readiness §3.

---

## Account deletion & payment retention

Unchanged from PR #160 recommendation:

- Keep `payments.user_id ON DELETE CASCADE`.
- Do **not** implement High-Risk FK change without CA/legal requirement.
- Absence of GSTIN does not eliminate all books/tax record questions — see founder register §6.

---

## Accessibility

- Marketing axe routes now include `/privacy`, `/terms`, `/refund`, `/contact` (light + dark).
- WCAG 2.2 AA remains the **target**; full compliance is **not claimed** without manual screen-reader + full contrast audit.

---

## Commands (this follow-on)

Recorded in the PR body after local verification runs.

## Related

[founder-launch-readiness.md](./founder-launch-readiness.md) · [AGENTS.md](../../AGENTS.md) · [ATTRIBUTION](../../public/assets/ATTRIBUTION.md) · [PAYMENTS](../Core/PAYMENTS.md)
