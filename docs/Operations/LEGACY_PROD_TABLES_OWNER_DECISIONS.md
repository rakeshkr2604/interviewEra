# Production-Only Legacy Tables — Owner Decision Packet

> Status: CANONICAL (decision packet)
> Last Verified: 2026-10-03
> Verification Scope: Production read-only catalog + repository grep; no production mutation
> Authority: Owner decisions required — **not** authorization to DROP/CREATE/COPY

## Purpose

Give the engineering/product owner a yes/no decision sheet for three production-only tables that are empty, absent from staging, and not referenced by current application code.

**Production project:** `plfuvgkycmxcyshrgpgv` (read-only).
**Do not** copy these tables to staging to force parity.
**Do not** drop without a forward-only migration and explicit sign-off.

## Shared evidence (all three)

| Fact | Evidence |
|---|---|
| Present on production | Yes |
| Present on staging | No (intentional exclusion) |
| Row count (prod, 2026-10-03) | **0** for each |
| In `supabase/migrations/*.sql` | **No** matching CREATE |
| In `src/` | **No** string matches |
| Decision status | **PENDING owner** — not approved |

---

## 1. `app_error_events`

### Decision brief

| Topic | Finding |
|---|---|
| Current usage | **None** — 0 rows; no live writer in `src/` |
| Repository | Archive RFCs + roadmap Phase 2.3 planned a durable error table + logger; **not implemented** as a checked-in migration |
| Sensitivity | Columns include `message`, `meta` jsonb, optional `user_id` / `interview_id` / `payment_id` — **sensitive if populated** |
| RLS / policies | RLS **on**; **0** policies → non-bypass roles cannot use table; `service_role=ar` (SELECT/INSERT) |
| Grants | Owner `postgres`; service_role select+insert only |
| FKs | `user_id` → `users(id)` |
| Size | ~88 kB (empty relation overhead) |
| Overlap | Interview failure telemetry → planned `interview_diagnostic_events` (110/111, unapplied). Server-wide structured errors remain a **separate** roadmap item if RFC-005 proceeds |
| Retain risk | Informal shell not in migration history; future agent may assume it is SoT |
| Remove risk | Low while empty; if owner still wants Phase 2.3 logger, dropping forces recreate |

### Proposed disposition

**Retain and formalize** *if* unified error logging remains on the roadmap — add a forward migration that documents the live shape + wire a writer.
**Deprecate pending approval** *if* RFC-005 / Phase 2.3 is abandoned — then drop via separately approved migration.

### Exact owner decision required

Choose **one**:

1. **FORMALIZE** — Keep table; schedule migration + logger implementation (no drop).
2. **DEPRECATE_AND_DROP** — Approve forward-only `DROP TABLE public.app_error_events` (and related objects) in a future PR after sign-off.
3. **DEFER** — Leave empty; re-decide by a stated date (document in closure).

**Do not** invent a writer or migration in this packet without choosing (1).

---

## 2. `interview_ai_feedback`

### Decision brief

| Topic | Finding |
|---|---|
| Current usage | **None** — 0 rows; no `src/` writers/readers |
| Repository | No migrations; superseded by live `interview_feedbacks` + `interview_exit_feedbacks` (serials 106/107) and APIs `/api/interview/feedback`, `/api/interview/exit-feedback` |
| Sensitivity | Likert-style ratings + `user_id` / `interview_id` — PII-adjacent if populated |
| RLS / policies | RLS on; INSERT/UPDATE/SELECT policies for `{public}` (own-row style) |
| Grants | `relacl` null (owner defaults) |
| FKs | `interview_id` → `interviews(id)` |
| Size | ~40 kB |
| Overlap | **Fully superseded** by current feedback system |
| Retain risk | Dead RLS policies invite confusion; accidental new client could start writing |
| Remove risk | **Low** — empty, no code path |

### Proposed disposition

**Deprecate pending approval** → remove with a separately approved forward-only migration on production (and do not recreate on staging).

### Exact owner decision required

Choose **one**:

1. **APPROVE_DROP** — Authorize `DROP TABLE public.interview_ai_feedback CASCADE` (or equivalent) via numbered migration after review.
2. **KEEP** — State reason if any product still needs this shape (none found in repo).

---

## 3. `session_replay_events`

### Decision brief

| Topic | Finding |
|---|---|
| Current usage | **None** — 0 rows; no `src/` / admin dependency |
| Repository | No migrations; session diagnostics move to `interview_diagnostic_events` + existing `voice_usage_logs` / `product_events` |
| Sensitivity | `event_type`, optional `error_code`, latency, interview FK — operational; lower sensitivity than transcripts but still session metadata |
| Privacy / retention | Empty today; if ever populated without retention, would need a prune policy (none exists for this table) |
| RLS / policies | RLS on; INSERT/SELECT for `{public}` (own interviews) |
| FKs | `interview_id` → `interviews(id)` |
| Size | ~24 kB |
| Overlap | Superseded by diagnostics design + voice/AI logs |
| Retain risk | Same as unused feedback table — policy surface without product |
| Remove risk | **Low** — empty, unused |

### Proposed disposition

**Deprecate pending approval** → drop via separately approved forward-only migration.

### Exact owner decision required

Choose **one**:

1. **APPROVE_DROP** — Authorize drop migration.
2. **KEEP** — State product/admin use (none found).

---

## Decision response template (owner)

Copy into PR / ticket:

```text
app_error_events:          FORMALIZE | DEPRECATE_AND_DROP | DEFER (date: ____)
interview_ai_feedback:     APPROVE_DROP | KEEP (reason: ____)
session_replay_events:     APPROVE_DROP | KEEP (reason: ____)
Approver: ____  Date: ____
Production mutation authorized: NO until migration PR approved separately.
```

## Related

- Closure: [`STAGING_PROD_ALIGNMENT_CLOSURE.md`](STAGING_PROD_ALIGNMENT_CLOSURE.md)
- Diagnostics (does not replace server-wide error logging): [`../Guidelines/OBSERVABILITY.md`](../Guidelines/OBSERVABILITY.md)
