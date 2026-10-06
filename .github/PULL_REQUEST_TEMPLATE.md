## What & why



## High-Risk Systems touched

Check any that apply (see AGENTS.md "High Risk Systems" table) — each carries a required manual verification step, not just CI green:

- [ ] **Payments** (Razorpay) — ran `npx vitest run src/lib/razorpay/` AND manually traced both verify-first and webhook-first orderings (docs/Core/PAYMENTS.md)
- [ ] **Speech/voice pipeline** — ran the unit suite AND `npm run verify:voice` AND a manual mobile smoke (Chrome Android / iOS Safari) (docs/Core/VOICE_PIPELINE.md)
- [ ] **Resume/PDF parsing** — ran `npm run verify:pdf` against checked-in fixtures
- [ ] **PDF serverless tracing** — if touching `next.config` / PDF extract: `npm run build && npm run verify:nft-pdf` (no global `'/**'` PDF includes)
- [ ] **Auth (V2 migration)** — exercised both `NEXT_PUBLIC_AUTH_V2` states (on and off)
- [ ] **Database/RLS** — new migration reviewed against AGENTS.md Critical Invariants #2/#3/#10 (credit RPCs, `guard_users_privileged_update`, service-role-only writes)
- [ ] **SEO/indexing** — ran `npm run audit:noindex` (also covered by `npm run build`)
- [ ] **Analytics/funnel** — new events persist server-side to `product_events`, not just client-side GA4
- [ ] None of the above

## Verification actually run

- [ ] `npm run lint` (0 warnings)
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run build`
- [ ] `npm run verify:docs` (if docs changed)

Do not check a box unless the command was actually run in this change — see AGENTS.md verification standards.

## Rollback

<!-- One line: Vercel instant rollback, or `git revert` — anything non-obvious (e.g. a migration that can't roll back)? -->
