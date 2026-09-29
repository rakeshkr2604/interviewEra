# Observability

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: What exists in production code today (slim)
> Authority: Current logging/telemetry — not the historical RFC backlog

## Purpose

Describe **live** observability. Design RFCs / execution plans are archived under `docs/archive/pre-governance-2026-09-27/`.

## Current State

- **No unified APM** (no Sentry/Datadog/OTel in package.json) — Vercel log stream + DB tables
- Prefixed console families: `[payment:*]`, interview telemetry, `[VOICE_PIPELINE]`, `[ai-completion]`, …
- Durable: `ai_call_logs`, `voice_usage_logs`, `provider_health_logs`, rollups, `product_events`
- Request IDs: sparse (exemplary on resume upload); business IDs (`interviewId`, `paymentId`) are the spine
- Crons: health-snapshot, daily-rollup (see `vercel.json`)

## Architecture / Rules

- Extend existing emitters/prefixes; don’t invent a parallel logger for one feature
- `product_events` = funnel SoT; GA4 backup
- Payment debugging often = Vercel log grep within retention (Unknown retention — plan-dependent)

## Dependencies

[SEO_AEO_GEO](../Core/SEO_AEO_GEO.md) · [VOICE_PIPELINE](../Core/VOICE_PIPELINE.md) · [PAYMENTS](../Core/PAYMENTS.md)

## Failure Modes

PII in logs · assuming beacons persist (some only console) · treating dead `realtime_session_metrics` as live

## Verification

Grep prefixes · admin health endpoints when present · don’t claim MCP/APM without code

## Change Triggers

New prefix family · new telemetry table · adopting third-party APM (CSP + DEC)

## Related Documents

Archive OBSERVABILITY.md / RFCs / execution plan for historical design depth
