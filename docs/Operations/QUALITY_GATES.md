# Quality Gates

> Status: CANONICAL
> Last Verified: 2026-10-06
> Verification Scope: Gate levels (design + current CI enforcement) + NFT PDF scoping gate
> Authority: What must be green vs ritual vs warning

**Status note: DESIGN origins.** Defines every gate, its enforcement level, and why. PR-blocking requires branch protection (GitHub Pro — see archive `BRANCH_PROTECTION_SETUP.md` / `ENGINEERING_PLATFORM.md`); until upgraded, "Blocking" means "socially blocking + red X on the PR."

Legend — **Blocking**: merge impossible/forbidden while red. **Warning**: surfaced, human judges. **Manual ritual**: cannot be automated honestly; encoded as checklist, never faked as a green check.

| # | Gate | Level | Where | Why this level (evidence) |
|---|---|---|---|---|
| 1 | Lint, 0 warnings | **Blocking** | ci.yml quality | Already the repo standard (`npm run lint` must be 0 warnings — AGENTS.md); cheap, deterministic |
| 2 | Typecheck (`tsc --noEmit`, strict) | **Blocking** | ci.yml quality | Strict TS is a load-bearing safety net given heavy AI codegen; non-negotiable |
| 3 | Unit tests (vitest, incl. razorpay concurrency suite) | **Blocking** | ci.yml quality | 374-test suite is the core regression net; payments idempotency scenarios live here |
| 4 | PDF extraction fixtures (`verify:pdf`) | **Blocking** | ci.yml pdf_extract | Funnel-critical; already CI-enforced today — keep |
| 4b | PDF NFT scoping (`verify:nft-pdf` after build) | **Blocking** | ci.yml build (after `npm run build`) | Prevents reintroducing global `'/**'` PDF tracing that bloated Functions Storage |
| 5 | E2E auth suite (Playwright) | **Blocking** | ci.yml e2e_auth | Auth is a High Risk System mid-migration; already enforced — keep. Both `NEXT_PUBLIC_AUTH_V2` states: currently single-state in CI (**which state is exercised: Unknown — not verified from repository**; make it explicit, run both on auth-path changes) |
| 6 | Build + noindex/sitemap audit | **Blocking** | ci.yml build + Vercel build | The strongest existing gate (build-fail on SEO contradiction — AGENTS.md invariant #6); dual-enforced in CI and at deploy |
| 7 | Secret scan (gitleaks) | **Blocking** | ci.yml (new) | Multiple AI tools generate code; a leaked key is unbounded-cost. Blocking from day one; false positives handled via allowlist file |
| 8 | Migration checks (sequence, additive-only, RLS+GRANT pairing, invariant-touch acknowledgment) | **Blocking** (path-triggered) | ci.yml migration_check (new) | Mechanizes AGENTS.md invariants #2/#3 and the migration-033 lesson — currently enforced only by memory |
| 9 | npm audit `critical` | **Blocking** | ci.yml audit | Already enforced; keep threshold (high-severity transitive noise documented in-file) |
| 10 | Payments named check on payment-path changes | **Blocking** (path-triggered) | ci.yml payments_check (new) | Lets branch protection *require* the razorpay suite by name when it matters; PR template adds the manual dual-order trace acknowledgment |
| 11 | Coverage ratchet (no decrease vs main) | **Warning → Blocking later** | ci.yml quality | Reporters exist, thresholds don't (verified). Start as PR comment; flip to blocking only after 4+ weeks of stable signal. Fixed floors rejected (test theater) |
| 12 | Bundle-size delta per route | **Warning** | ci.yml advisory | Perf regressions on a 3,589-line client page are plausible; but size deltas need human judgment (a new feature legitimately grows) |
| 13 | npm audit `high` | **Warning** | nightly.yml | Documented unfixable transitive highs exist (ci.yml comment); blocking would train alert-blindness |
| 14 | Accessibility (axe on key pages) | **Warning** | e2e (extent of current usage **Unknown — not verified from repository**; `@axe-core/playwright` is installed) | Real but not launch-critical; warning keeps it visible without blocking revenue fixes |
| 15 | Docs link-check (`npm run verify:docs`) | **Warning** | weekly-health.yml / local | Catches broken links + deleted-path refs. Prefer blocking later once stable |
| 16 | Dead code / unused deps / unused exports (knip) | **Warning** | weekly-health.yml | Health signal, not correctness; blocking would fight legitimate WIP |
| 17 | Circular-dependency check (madge) | **Warning, promote to Blocking if ever non-zero** | weekly-health.yml | Currently 0 across 1,079 files (verified) — the check exists to *preserve* an achieved property; first regression should hurt |
| 18 | `.env.example` completeness drift | **Warning** | weekly-health.yml | After the one-time H3 fix, drift detection keeps it true |
| 19 | Preview smoke (deployed preview serves) | **Warning** | preview-smoke.yml | Catches Vercel-only failure class; warning because preview-protection/auth can cause false reds |
| 20 | Production smoke post-deploy | **Loud alert (not a merge gate)** | production-smoke.yml | Runs after the fact by definition; its job is fast detection + runbook trigger |
| 21 | Voice pipeline verification (`voice-fix-verify.mjs` + unit suites) | Unit suites: **Blocking** (in #3). Script: **Nightly warning** until proven stable, then consider path-triggered blocking | nightly.yml | [VOICE_PIPELINE](../Core/VOICE_PIPELINE.md) mandates manual script today |
| 22 | Mobile voice smoke (Chrome Android / iOS Safari) | **Manual ritual** — PR checklist on voice paths, release checklist item | PR template + [RELEASE](RELEASE.md) checklist | Cannot be honestly automated without device-cloud spend |
| 23 | Payment dual-order manual trace (verify-first / webhook-first) | **Manual ritual** — PR checklist on payment paths | PR template | [PAYMENTS](../Core/PAYMENTS.md); concurrency tests cover logic |
| 24 | Auth both-flag-states verification | **Manual ritual → CI matrix on auth paths later** | PR template; ci.yml later | AGENTS.md High Risk table requires both states |
| 25 | Performance (Lighthouse on preview) | **Not a gate yet** — deferred | future | Add when preview wiring exists and a budget is defined |
| 26 | Architecture drift (import-boundary lint) | **Not a gate yet** — designed, deferred | future eslint rule | Adopt only if drift recurs after engine consolidation DECs |

## Gate philosophy

1. **Blocking gates must be deterministic.** Anything flaky enters as warning and earns promotion. A flaky blocking gate teaches bypass-muscle-memory.
2. **Path-triggered blocking** keeps the everyday path fast: payments/migrations/auth get extra machinery *only when touched* — matching AGENTS.md High Risk model.
3. **Manual rituals are first-class gates.** Encode as checklists rather than fake green checks.
4. **Warnings must stay scarce.** Delete the least valuable stream when volume exceeds what one person reads Monday morning.

## Related Documents

[RELEASE](RELEASE.md) · [TESTING](../Guidelines/TESTING.md) · [AGENTS.md](../../AGENTS.md)
