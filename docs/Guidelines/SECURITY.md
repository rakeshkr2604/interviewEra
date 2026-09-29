# Security

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Authz, CSP, RLS, campus/admin gates
> Authority: Security-relevant house rules

## Purpose

Non-bypassable security posture for agents.

## Current State / Rules

| Control | Rule |
|---|---|
| CSP | Only `next.config.ts` `headers()` (Invariant #8) |
| Canonical host | Triple redirect layers (Invariant #7) |
| Credits | Service-role RPCs only (Invariant #2) |
| `users` UPDATE | `guard_users_privileged_update` allowlist (Invariant #3) |
| Campus | Honor `verification_status`; production ignores blanket auto-approve |
| Admin | `platform_role` / `ADMIN_EMAILS` — no secondary soft gate |
| Payments | Server amounts; provider entity match before CAS |
| Secrets | Vercel env; never commit; CI placeholders only |
| Resume files | Ownership checks + short-lived signed URLs |

## Dependencies

[PAYMENTS](../Core/PAYMENTS.md) · [BACKEND_SCHEMA](../Core/BACKEND_SCHEMA.md) · [FEATURE_FLAGS](../Operations/FEATURE_FLAGS.md)

## Failure Modes

Widening users UPDATE · enabling `IE_DEBUG_ROUTES` in prod · trusting webhook event name without amount check

## Verification

Migration review · payment tests · e2e auth · CSP update when adding scripts

## Change Triggers

New third-party script · new privileged column · new admin surface · storage ACL change

## Related Documents

[CODE_ORGANIZATION](CODE_ORGANIZATION.md) · Invariants in [AGENTS.md](../../AGENTS.md)
