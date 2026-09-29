# Responsive / Browser

> Status: CANONICAL
> Last Verified: 2026-09-27
> Verification Scope: Browser support reality for voice + UI
> Authority: Client environment expectations

## Purpose

What we actually verify vs what is aspirational.

## Current State

| Surface | Automated | Manual |
|---|---|---|
| Chrome desktop (voice) | `verify:voice` + units | — |
| Edge / Firefox / Safari desktop | — | Required for voice-critical changes |
| Chrome Android / iOS Safari | — | Required post-deploy for voice |
| Marketing / dashboard layout | Playwright chromium subset | Spot-check narrow viewports |

Mobile audio often needs a user gesture to unlock playback (`audio-gesture`).

## Architecture / Rules

- Don’t claim “mobile verified” from unit tests alone
- Prefer progressive enhancement; don’t assume Web Speech everywhere

## Dependencies

[VOICE_PIPELINE](../Core/VOICE_PIPELINE.md) · [TESTING](TESTING.md)

## Failure Modes

Shipping voice changes on CI green alone · ignoring Bluetooth headset device-swap class

## Verification

PR checklist rituals in [QUALITY_GATES](../Operations/QUALITY_GATES.md) #21–22

## Change Triggers

New mic UX · PWA audio · browser API polyfills

## Related Documents

[VOICE_PIPELINE](../Core/VOICE_PIPELINE.md)
