# Decisions (ADR)

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Documented engineering decisions for this governance cut
> Authority: Architecture Decision Records

## Purpose

Short ADRs. New material decisions get a DEC entry here in the same change set.

---

## DEC-001 — Canonical docs + agent governance (2026-09-27)

- **Context:** Docs had proliferated; links drifted; agents read stale Skills/archive.
- **Decision:** Compact tree under `docs/Core|Guidelines|Operations` + root `AGENTS.md` as universal contract; thin `CLAUDE.md` / `.cursorrules`; archive pre-governance docs; `npm run verify:docs`.
- **Consequences:** Update docs with code; archive is historical only.

---

## DEC-002 — V1 dual-agent interview engine REMOVED; V2.1 is sole engine (2026-09-27)

- **Context:** Production mock path is script engine `engine='v2.1'`. V1 dual-agent + experimental `/interview/session/[id]/v2` (V1 voice rewrite) add dual-maintenance risk.
- **Decision:** Remove V1 as a live product path. Keep historical migrations. Legacy `/report/[id]` may serve historical rows. Retire `NEXT_PUBLIC_INTERVIEW_ENGINE_DEFAULT`.
- **Consequences:** Docs and flags must not describe dual engines. Do not resurrect V1 without a new DEC + migration plan.
- **Related:** [INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)

---

## DEC-003 — Payment activation idempotency marker (historical, restated)

- **Context:** Using `payments.status` as “already activated” left users paid but Free.
- **Decision:** Marker = `users.last_payment_id === paymentId`; dual-path same activator.
- **Consequences:** Invariant #1 permanent.
- **Related:** [PAYMENTS](PAYMENTS.md)

---

## DEC-004 — OpenRouter-only; no Mistral fallback (historical, restated)

- **Context:** `src/lib/mistral/` unused; deleted 2026-07-05.
- **Decision:** No automatic multi-provider failover.
- **Consequences:** Invariant #9.
- **Related:** [AI_PIPELINES](AI_PIPELINES.md)

---

## Template for new DECs

```
## DEC-NNN — Title (YYYY-MM-DD)
- Context:
- Decision:
- Consequences:
- Related:
```

## Change Triggers

Any irreversible product/architecture choice, engine cutover, provider change, or security model change.

## Related Documents

[DOCUMENTATION_GOVERNANCE](../Guidelines/DOCUMENTATION_GOVERNANCE.md) · [AGENTS.md](../../AGENTS.md)
