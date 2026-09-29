# LLD Principles

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Module-level coding norms
> Authority: Low-level design guidance

## Purpose

How to structure modules, APIs, and errors inside the monolith.

## Current State / Rules

1. **Zod at boundaries** — API bodies and AI JSON
2. **Typed domain errors** over stringly throws for known classes
3. **Tests beside code** (`*.test.ts`)
4. **Server Components default**; isolate `"use client"` leaves
5. **Shared completion wrapper** for LLM calls (`chat-completion-core`)
6. **One activator** for payments (`activate-plan.ts`) — don’t fork
7. **Mic only via coordinator**
8. Prefer extending `interview-telemetry` / payment-log prefixes over new ad-hoc tags

## Dependencies

[CODE_ORGANIZATION](CODE_ORGANIZATION.md) · [TESTING](TESTING.md)

## Failure Modes

Client DB writes · acquiring getUserMedia outside coordinator · duplicate activation helpers

## Verification

`npm run lint` · `npm run typecheck` · domain tests

## Change Triggers

New shared abstraction · new error domain · new telemetry family

## Related Documents

[HLD_PRINCIPLES](HLD_PRINCIPLES.md) · [API notes in SYSTEM_DESIGN](../Core/SYSTEM_DESIGN.md)
