# Decisions (ADR)

> Status: CANONICAL
> Last Verified: 2026-10-09
> Verification Scope: Documented engineering decisions for this governance cut + Insights/retention v2.1 DEC
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

## DEC-005 — Insights + retention consume v2.1 script reports (2026-10-09)

- **Context:** Dashboard Insights (readiness / roadmap / analytics / notifications) and retention still assumed V1 `reports` / `questions`/`answers`/`evaluations` after DEC-002 removed the V1 engine path.
- **Decision:** Candidate snapshot and analytics merge `script_interview_reports` (primary) with legacy V1 `reports` (fallback). Score-v1.2 dimensions map onto Insights `DimensionScores` via `script-dimension-bridge`. Retention aggregates scored `answer_evaluations` on V2.1 complete. Notifications remain **derived/ephemeral** (no durable notifications table); report-ready items use engine-correct hrefs and real `generated_at`.
- **Consequences:** Missing dimension evidence must not be treated as scored zero; weakest-dimension lists stay empty until reports exist. Roadmap start links pass `role`/`mode`/`difficulty`/`focus` that `/interview/script/start` hydrates.
- **Related:** [INTERVIEW_ENGINE](INTERVIEW_ENGINE.md) · [FLOWS](FLOWS.md)

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
