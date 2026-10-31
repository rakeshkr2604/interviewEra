# Gamification

> Status: CANONICAL
> Last Verified: 2026-10-30
> Verification Scope: Retention system (tiers, streaks, badges, XP) + Points Journey/Tier Ladder visual layer + documented roadmap for leaderboard/unification
> Authority: Candidate progression, motivation, and retention mechanics

## Purpose

How InterviewEra keeps candidates coming back and feeling progress during a multi-week placement-prep grind, without the mechanics ever gating or distorting the actual interview content/scoring. Read this before touching `src/lib/retention/**`, `src/components/retention/**`, or the Analytics/Badges/Dashboard pages that surface progression.

**This doc must be updated whenever gamification changes** — a new badge, a new tier, a new progression surface, a changed threshold, or a new screen that shows XP/streak/tier data. If you ship a retention-adjacent feature and don't touch this file, the next person (or agent) reading it will plan against a stale picture. Treat this the same as any other Core doc under the AGENTS.md completion protocol.

## Current State — three independent mechanics

InterviewEra runs **three separate progression tracks** today. They are NOT unified into one score/rank — this is a deliberate current-state fact, not an oversight (see "Known gap" below).

### 1. Difficulty tiers (1–4) — functional, gates content

| Tier | Label (`getTierPublicLabel`) | Unlock gate |
|---|---|---|
| 1 | Fundamentals | Starting tier |
| 2 | Advanced questions | 3 sessions + best single-dimension score ≥ 7.0 |
| 3 | Company patterns | 5 sessions + last-5 rolling average ≥ 7.5 |
| 4 | Mock panel mode | 5 sessions + lifetime overall average ≥ 8.0 (min. 24h account age) |

- Source of truth: `src/lib/retention/constants.ts` (`TIER_2_UNLOCK`, `TIER_3_UNLOCK`, `TIER_4_UNLOCK`), `src/lib/retention/tier-copy.ts` (labels).
- Unlock evaluation: `src/lib/retention/tier-unlock.ts` → `checkAndUnlockTier()`, called from `processInterviewRetention()` after every completed interview.
- Dashboard projection (progress bar + "next unlock" copy): `src/lib/retention/dashboard-tier-progress.ts`.
- **This is the only track that changes what the candidate experiences** (question difficulty/style). The other two tracks are motivational only.

### 2. Daily streak + 4 badges — motivational, consistency-based

- A day counts for the streak when the candidate completes an interview with at least one answered question. Skipped questions, low scores and short answers do not break or reset it.
- `current_streak` increments on consecutive IST-calendar days with a completed interview; a second interview the same day is a no-op; after a missed day the next completed interview restarts it at 1. Logic: `src/lib/retention/streak-tracker.ts` → `updateStreak()`.
- Quality (all questions answered, avg answer duration ≥ 30s, session score ≥ 5.0 — `QUALITY_CRITERIA` in `constants.ts`) gates **XP and tier progress only**, not the streak.
- 4 badges unlock by **streak length**, not tier: `consistent_learner`(3) → `dedicated_preparer`(7) → `interview_ready`(14) → `placement_warrior`(30). Thresholds: `BADGE_THRESHOLDS` in `constants.ts`; copy: `src/lib/retention/badge-copy.ts`.
- Badges are permanent once earned (stored in `user_progress.badges_earned`), independent of whether the streak later breaks.
- Streak-break and streak-update UI feedback: `StreakCounter.tsx` (navbar flame + toast on increment), `SessionQualityNotice.tsx` (why a session earned no XP — shows the actually-failed criterion, not always the score).

### 3. XP — cosmetic point total, no gate tied to it

- `total_xp` increments by `round(sessionScore * 10)` on every quality-met session (0 otherwise). Never decreases.
- No feature is currently gated on XP — it exists purely as a "number that goes up" motivational signal and now drives the **Points Journey** chart (below).

### Key tables

| Table | Role |
|---|---|
| `user_progress` | One row per user: `current_tier`, `current_streak`, `longest_streak`, `total_xp`, `badges_earned` (JSONB array), tier roll-up stats |
| `session_quality_log` | One row per completed interview: quality verdict, dimension scores, `unlock_contribution` JSONB (`{tier_unlocked, streak_delta, badge_earned, xp_gained}`), `completed_at` |

Both are written exclusively by `src/lib/retention/process-interview-complete.ts` (`processInterviewRetention()`), called once per interview completion. Idempotent via `UNIQUE(interview_id)` on `session_quality_log` — see that file's header comment for the self-repair logic on partial writes.

## Visual layer (this pass — 2026-10-30)

Added a **Tier Ladder** and a **Points Journey** chart, inspired by a competitor reference (Sakshaat AI) the founder flagged as design-aspirational. Scope decision: **borrowed the structural idea (a rank ladder + a cumulative points line), not the literal visual style** — kept InterviewEra's own purple brand accent and light/dark theme-token system instead of copying the reference's dark/gold palette, so it stays consistent with every other page in the app rather than becoming a one-off themed page.

| Component | File | Data source |
|---|---|---|
| Tier Ladder | `src/components/retention/TierLadder.tsx` | `user_progress.current_tier` only — no new query |
| Points Journey | `src/components/retention/PointsJourneyChart.tsx` + `src/lib/retention/points-journey.ts` | Derived client-side from existing `session_quality_log.unlock_contribution.xp_gained`, ordered by `completed_at` — **no new table, no new write path** |

Both render on `/profile/badges` (now titled "Your progress" on-page; URL/route kept unchanged to avoid breaking existing links/bookmarks). `points-journey.ts` is a pure function (`buildPointsJourney`) with its own unit tests — reuse it anywhere else a cumulative-XP-over-time view is needed rather than re-deriving the same thing.

## Known gap / explicit roadmap (not built — do not assume these exist)

These were discussed as "where this could go" but are **deliberately out of scope for this pass** — each needs its own design/safety pass before building:

1. **Unified rank** (one ladder instead of three tracks). The reference product's "Soldier → Conqueror" ladder is driven by a single points metric; InterviewEra's tier/streak/XP are intentionally separate (tier = content difficulty gate, streak/XP = motivation only). Unifying them is a real product decision (does unlocking harder questions require motivation-XP too?) — don't merge the systems without that decision being made explicitly.
2. **Leaderboard** (candidates ranked against each other). Needs, before any code: a display-name/anonymity policy (candidates are job-seekers — showing real names ranked publicly has real privacy stakes), an opt-in/opt-out mechanism, anti-gaming consideration (the existing anti-abuse constants in `constants.ts` — `MAX_CHECKS_PER_HOUR`, `MAX_CONSECUTIVE_REJECTIONS_BEFORE_FLAG` — were built for solo unlock-abuse, not competitive gaming), and a new query path (current schema has no notion of "all users ranked by X" and such a query needs care at scale). Flag to the founder before starting this one specifically.
3. **Skill-radar chart** (per-skill hexagon/radar on the profile). This is closer to a "candidate profile" feature than gamification — the Analytics page's Skill Breakdown (`src/components/dashboard/AnalyticsSkillBreakdown.tsx`) already covers the same data as bars; a radar would be a visual variant of existing data, not a new mechanic.
4. **XP tied to a gate.** If a future feature wants to spend/gate on XP (e.g., "unlock X at 500 XP"), confirm it doesn't double up with the tier gate's session/score criteria — two different gates on the same underlying sessions will confuse candidates about why something is locked.

## Design principle for any new gamification surface

- Never let a gamification signal **contradict** the thing it's meant to motivate. (Concrete incident this session: the Skill Breakdown card used to show stale V1 label names — "Technical Depth"/"Confidence" — on top of score-v1.6 rubric data that actually measures content accuracy/specificity. Fixed centrally in `src/lib/utils/report-radar-dimensions.ts`. Any new display of dimension data must go through `REPORT_DIMENSION_LABELS` or `DIMENSION_LABELS`/`DIMENSION_EXPLAINERS` in `src/lib/interview/answer-score/rubric.ts` — never a fresh hardcoded label — or this class of bug recurs.)
- Reuse `tierColorFromPercent`/`tierColorFromScore` (`src/lib/utils/score-tier-color.ts`) for any new "good/fair/needs-work" color coding — don't invent a new palette per component.
- A quality-gate message (why a streak/badge/tier didn't advance) must name the **actual failing criterion**, not just restate the score — see `src/lib/retention/quality-feedback.ts` → `buildSessionQualityFeedback()` for the pattern (score can be fine while the real blocker is incomplete answers).
- Degrade, never fabricate: no fake "neutral" scores, no XP awarded for a session that didn't actually pass quality criteria, no streak day without a completed interview, no invented historical data points. Every number on a gamification screen must trace to a real row.
