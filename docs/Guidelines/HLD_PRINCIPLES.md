# HLD Principles

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: House high-level design norms
> Authority: System-level design guidance

## Purpose

Constraints for system shape — not a second architecture dump.

## Current State / Rules

1. **Monolith App Router** — one deployable; domain modules under `src/lib/<domain>/`
2. **Degrade-don't-fail** on user-critical paths (resume, score, voice quota)
3. **Money & credits** — server authority only; dual-path idempotent grants
4. **Defense in depth** where already established (canonical host ×3; RLS + GRANT)
5. **Single engine** for interviews (V2.1) — no parallel product engines without a DEC
6. **Observability via existing prefixes/tables** before inventing new stacks
7. **Feature flags need registry entries** with exit criteria when temporary

## Dependencies

[SYSTEM_DESIGN](../Core/SYSTEM_DESIGN.md) · [DECISIONS](../Core/DECISIONS.md)

## Failure Modes

Second voice/interview stack “just for experiments” without DEC · client-trusted prices

## Verification

Design review against Critical Invariants in AGENTS.md

## Change Triggers

New subsystem · multi-provider AI · new tenancy model

## Related Documents

[LLD_PRINCIPLES](LLD_PRINCIPLES.md) · [SECURITY](SECURITY.md)
