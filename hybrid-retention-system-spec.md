# Hybrid Retention System — InterviewEra
**Implementation Specification v1.0**

---

## Overview

Two-layer retention system designed for Indian campus placement students:
1. **Progress Gates (Primary)** — Unlock advanced features by improving scores
2. **Quality Streaks (Secondary)** — Earn status badges through consistent quality practice

**Goal:** Retain users beyond free tier by providing visible progress + social proof.

---

## Part 1: Progress Gates (Feature Unlocks)

### Tier Structure

```
TIER 1: Fundamentals (Default — all new users)
├─ Basic behavioral questions
├─ Resume-based questions (standard difficulty)
├─ 5-dimension scoring
└─ Standard feedback

TIER 2: Advanced Questions
├─ Unlock criteria: Complete 3 sessions + score 7.0+ average in ANY dimension
├─ Harder behavioral questions (situational + hypothetical)
├─ Deeper technical probing from resume
├─ More specific feedback with improvement examples
└─ Estimated unlock: Week 1-2 for serious users

TIER 3: Company Patterns
├─ Unlock criteria: Maintain 7.5+ average across 5 sessions
├─ TCS/Infosys/Wipro/Accenture specific question patterns
├─ Real panel simulation (multiple questions in sequence)
├─ Industry-specific scenarios
└─ Estimated unlock: Week 2-3 for consistent users

TIER 4: Mock Panel Mode
├─ Unlock criteria: Hit 8.0+ average score
├─ Multi-round interview simulation
├─ Follow-up questions based on previous answers
├─ Stress interview scenarios (interruptions, pressure tactics)
├─ Final readiness assessment
└─ Estimated unlock: Week 3-4 for top performers
```

### Unlock Logic

```javascript
// Pseudo-code for tier unlock check
function checkTierUnlock(userId) {
  const userStats = getUserStats(userId);
  const currentTier = userStats.current_tier;
  
  switch(currentTier) {
    case 1:
      // Tier 2 unlock
      if (userStats.total_sessions >= 3 && 
          userStats.max_dimension_score >= 7.0) {
        unlockTier(userId, 2);
      }
      break;
      
    case 2:
      // Tier 3 unlock
      const last5Sessions = getLastNSessions(userId, 5);
      const avgScore = calculateAverage(last5Sessions);
      if (avgScore >= 7.5) {
        unlockTier(userId, 3);
      }
      break;
      
    case 3:
      // Tier 4 unlock
      const overallAvg = userStats.overall_avg_score;
      if (overallAvg >= 8.0) {
        unlockTier(userId, 4);
      }
      break;
  }
}
```

### UI Implementation

**Dashboard Progress Card:**
```
┌────────────────────────────────────────┐
│ Your Progress                          │
│                                        │
│ Current Tier: Fundamentals             │
│ [████████░░] 7.2 / 10.0               │
│                                        │
│ 🔒 Unlock Advanced Questions           │
│    → Complete 1 more session           │
│    → Current best: 6.8 (need 7.0)      │
│                                        │
│ Next unlock in ~2 sessions             │
└────────────────────────────────────────┘
```

**Tier Navigation (Sidebar):**
```
✓ Tier 1: Fundamentals
🔓 Tier 2: Advanced Questions (Unlocked!)
🔒 Tier 3: Company Patterns (2.3 points away)
🔒 Tier 4: Mock Panel Mode (Locked)
```

**Unlock Celebration Modal:**
```
🎉 Tier Unlocked!

Advanced Questions
Now Available

You've proven consistent improvement.
Ready for harder questions?

[Start Advanced Session →]
```

---

## Part 2: Quality Streaks (Status Badges)

### Quality Criteria (ALL must be met)

```
Per session quality check:
✓ Answer all 5 questions (no skip button used)
✓ Average answer duration ≥ 45 seconds per question
✓ Session average score ≥ 6.0 / 10.0

If ANY criterion fails → streak resets to 0
```

### Badge System

```
Streak Length | Badge Name             | Color | Emoji
─────────────────────────────────────────────────────
3 days        | Consistent Learner     | Green | 🟢
7 days        | Dedicated Preparer     | Blue  | 🔵
14 days       | Interview Ready        | Purple| 🟣
30 days       | Placement Warrior      | Orange| 🟠
```

**NO tangible rewards.** Pure status symbol.

### Streak Logic

```javascript
// Pseudo-code for streak tracking
function updateStreak(userId, sessionData) {
  const qualityMet = (
    sessionData.questions_answered === 5 &&
    sessionData.avg_answer_duration >= 45 &&
    sessionData.session_score >= 6.0
  );
  
  const lastSession = getLastSession(userId);
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  
  if (qualityMet) {
    if (lastSession.date === yesterday) {
      // Streak continues
      incrementStreak(userId);
      checkBadgeUnlock(userId);
    } else if (lastSession.date === today) {
      // Already completed today, no change
      return;
    } else {
      // Streak broken, reset
      resetStreak(userId);
      setStreak(userId, 1);
    }
  } else {
    // Quality not met, streak resets
    resetStreak(userId);
  }
}
```

### UI Implementation

**Navbar Badge Counter:**
```
[Profile Icon] [🔥 7-day streak] [Notifications]
```

**Profile Page:**
```
┌─────────────────────────────────────┐
│ Your Badges                         │
│                                     │
│ 🟢 Consistent Learner               │
│    Earned on May 3, 2026            │
│                                     │
│ 🔵 Dedicated Preparer               │
│    Earned on May 7, 2026            │
│                                     │
│ 🔒 Interview Ready                  │
│    7 more days to unlock            │
│                                     │
│ [Share on LinkedIn →]               │
└─────────────────────────────────────┘
```

**Streak Break Warning:**
```
⚠️ Streak at Risk

Your 12-day streak will reset in 6 hours
if you don't complete a quality session today.

[Start Session Now →]
```

---

## Database Schema

```sql
-- User progress tracking
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Progress Gates
  current_tier INTEGER DEFAULT 1 CHECK (current_tier BETWEEN 1 AND 4),
  tier_unlocked_at TIMESTAMP DEFAULT NOW(),
  total_sessions INTEGER DEFAULT 0,
  sessions_at_current_tier INTEGER DEFAULT 0,
  
  -- Score tracking
  overall_avg_score DECIMAL(3,1),
  max_dimension_score DECIMAL(3,1),
  last_5_sessions_avg DECIMAL(3,1),
  
  -- Quality Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_quality_session_date DATE,
  
  -- Badges (JSONB array)
  badges_earned JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"badge": "consistent_learner", "earned_at": "2026-05-03"}]
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tier configuration (optional, can be hardcoded)
CREATE TABLE tier_config (
  tier_id INTEGER PRIMARY KEY,
  tier_name TEXT NOT NULL,
  unlock_criteria JSONB NOT NULL,
  -- Example: {"sessions_required": 3, "min_score": 7.0}
  features_enabled TEXT[] NOT NULL,
  display_order INTEGER NOT NULL
);

-- Session history (for calculating streaks & progress)
CREATE TABLE session_quality_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES interview_sessions(id) ON DELETE CASCADE,
  
  -- Quality criteria
  questions_answered INTEGER NOT NULL,
  total_questions INTEGER NOT NULL,
  avg_answer_duration INTEGER NOT NULL, -- in seconds
  session_score DECIMAL(3,1) NOT NULL,
  quality_met BOOLEAN NOT NULL,
  
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX idx_user_progress_tier ON user_progress(current_tier);
CREATE INDEX idx_session_quality_user ON session_quality_log(user_id, completed_at DESC);
```

---

## Implementation Roadmap

### Phase 1: Database Setup (Day 1)
```
[ ] Create user_progress table
[ ] Create session_quality_log table
[ ] Add tier_id column to interview_sessions
[ ] Migration script for existing users
    (set all to tier 1, streak 0)
```

### Phase 2: Backend Logic (Day 2-3)
```
[ ] Tier unlock check function
[ ] Quality streak calculation function
[ ] Badge unlock logic
[ ] Cron job: Daily streak reset checker
    (runs at midnight IST, resets streaks 
     if no quality session yesterday)
```

### Phase 3: API Endpoints (Day 3-4)
```
[ ] GET /api/user/progress
    Returns: current_tier, unlock_progress, 
             streak_count, badges_earned
             
[ ] POST /api/session/complete
    Triggers: tier unlock check + 
              streak update + badge check
              
[ ] GET /api/tiers
    Returns: all tier info + lock status 
             for current user
```

### Phase 4: UI Components (Day 5-7)
```
[ ] Dashboard progress card
[ ] Tier navigation sidebar
[ ] Unlock celebration modal
[ ] Navbar streak counter
[ ] Profile badges page
[ ] LinkedIn share image generator
    (Open Graph image with badge)
```

### Phase 5: Testing (Day 8-9)
```
[ ] Unit tests: tier unlock logic
[ ] Unit tests: streak calculation
[ ] Integration test: full user journey
    (3 sessions → tier unlock → 
     7 days → badge unlock)
[ ] Edge cases:
    - Session at 11:59 PM
    - Timezone handling (IST)
    - Concurrent session completion
```

### Phase 6: Analytics (Day 10)
```
[ ] PostHog events:
    - tier_unlocked
    - badge_earned
    - streak_broken
    - streak_milestone
    
[ ] Dashboard metrics:
    - % users at each tier
    - Average days to tier unlock
    - Streak distribution
```

---

## Cursor Prompts for Implementation

### Prompt 1: Database Migration
```
Create a Supabase migration for the InterviewEra 
retention system.

Tables needed:
1. user_progress — tracks tier progress and streaks
2. session_quality_log — logs each session's quality metrics

Schema details:
- user_progress: user_id, current_tier (1-4), 
  total_sessions, overall_avg_score, current_streak, 
  badges_earned (JSONB array)
  
- session_quality_log: user_id, session_id, 
  questions_answered, avg_answer_duration, 
  session_score, quality_met (boolean)

Add indexes on user_id and completed_at for performance.

Also create a migration to add default rows for 
all existing users (tier 1, streak 0).
```

### Prompt 2: Tier Unlock Logic
```
Implement tier unlock logic in 
src/lib/retention/tier-unlock.ts

Function: checkAndUnlockTier(userId: string, sessionScore: SessionScore)

Logic:
- Tier 1→2: After 3 sessions + 7.0 score in any dimension
- Tier 2→3: Last 5 sessions average ≥ 7.5
- Tier 3→4: Overall average ≥ 8.0

If unlock happens:
1. Update user_progress.current_tier
2. Insert notification
3. Return unlock event for UI modal

Use Supabase client. Handle edge cases 
(concurrent unlocks, already unlocked).
```

### Prompt 3: Quality Streak Calculation
```
Implement quality streak tracking in 
src/lib/retention/streak-tracker.ts

Function: updateStreak(userId: string, sessionData: SessionData)

Quality criteria (ALL must be met):
- questions_answered === 5
- avg_answer_duration >= 45 seconds
- session_score >= 6.0

Streak logic:
- If quality met + last session was yesterday → increment
- If quality met + last session was today → no change
- If quality not met OR gap > 1 day → reset to 0

Check badge unlocks: 3, 7, 14, 30 days
Update user_progress.badges_earned (JSONB array)

Return: new streak count + any new badge earned
```

### Prompt 4: Dashboard UI Component
```
Create React component: 
src/components/dashboard/ProgressCard.tsx

Shows:
1. Current tier name + icon
2. Progress bar to next tier unlock
3. Specific unlock criteria remaining
4. Estimated sessions to unlock

Props: 
- currentTier: number (1-4)
- totalSessions: number
- avgScore: number
- unlockProgress: { criterion: string, current: number, target: number }

Use Tailwind for styling. Match existing 
InterviewEra design system (check /dashboard for reference).

Add smooth progress bar animation.
```

### Prompt 5: Unlock Modal
```
Create animated unlock celebration modal:
src/components/retention/UnlockModal.tsx

Trigger: When tier_unlocked event fires

Shows:
- 🎉 animation (confetti or similar)
- "Tier Unlocked!" headline
- New tier name + description
- CTA button: "Start [Tier Name] Session"

Auto-dismisses after 5 seconds or on CTA click.

Use framer-motion for animations.
Match InterviewEra color scheme.
```

---

## Configuration (Easy to Tweak)

```typescript
// src/config/retention.ts

export const TIER_CONFIG = {
  1: {
    name: "Fundamentals",
    unlockCriteria: null, // default tier
    features: ["basic_questions", "5d_scoring"]
  },
  2: {
    name: "Advanced Questions",
    unlockCriteria: {
      sessions: 3,
      minScore: 7.0,
      scoreType: "any_dimension" // max of all dimensions
    },
    features: ["hard_behavioral", "deep_resume_probe"]
  },
  3: {
    name: "Company Patterns",
    unlockCriteria: {
      sessions: 5,
      minScore: 7.5,
      scoreType: "rolling_average" // last 5 sessions
    },
    features: ["company_specific", "panel_simulation"]
  },
  4: {
    name: "Mock Panel Mode",
    unlockCriteria: {
      minScore: 8.0,
      scoreType: "overall_average"
    },
    features: ["multi_round", "followup_questions", "stress_mode"]
  }
};

export const QUALITY_CRITERIA = {
  minQuestionsAnswered: 5,
  minAvgDuration: 45, // seconds
  minSessionScore: 6.0
};

export const BADGE_THRESHOLDS = {
  consistent_learner: 3,
  dedicated_preparer: 7,
  interview_ready: 14,
  placement_warrior: 30
};
```

**To adjust thresholds:** Edit this file, redeploy. No code changes needed.

---

## Testing Plan

### Manual Test Cases

```
Test 1: Tier 2 Unlock
1. Create test user
2. Complete 3 sessions with scores: 6.5, 7.2, 6.8
3. Max dimension score = 7.2 (≥ 7.0)
4. Expected: Tier 2 unlocks, modal appears
5. Verify: user_progress.current_tier = 2

Test 2: Streak Increment
1. User completes quality session on Day 1
2. User completes quality session on Day 2
3. Expected: streak = 2
4. User skips Day 3
5. User completes session on Day 4
6. Expected: streak = 1 (reset)

Test 3: Badge Unlock
1. User maintains 7-day quality streak
2. Expected: "Dedicated Preparer" badge appears
3. Verify: badges_earned JSONB contains badge entry
4. Check: Profile page shows badge

Test 4: Edge Case — Same Day Multiple Sessions
1. User completes quality session at 10 AM
2. User completes another at 5 PM
3. Expected: Streak count doesn't change (still same day)

Test 5: Midnight Streak Reset
1. User has 5-day streak
2. User doesn't complete session on Day 6
3. Cron job runs at 12:01 AM
4. Expected: streak resets to 0
5. Notification sent: "Your streak was reset"
```

---

## Analytics to Track

```
PostHog Events:
- tier_unlocked: { tier_id, days_taken, total_sessions }
- badge_earned: { badge_name, streak_length }
- streak_broken: { streak_length, reason }
- streak_milestone: { days: [3, 7, 14, 30] }

Dashboards to Build:
1. Tier Distribution
   - % of users at each tier
   - Average time to unlock each tier
   
2. Streak Health
   - Active streaks distribution (1-2 days, 3-7, 7-14, 15+)
   - Streak break rate by day of week
   
3. Engagement Impact
   - Sessions per week: Before vs After tier unlock
   - Retention: Day 7, Day 14, Day 30
   - Conversion rate by tier (Tier 1 users vs Tier 3 users)
```

---

## Success Metrics (Target — 90 days)

```
Baseline (No retention system):
- Day 7 retention: ~25%
- Day 30 retention: ~10%
- Free-to-paid conversion: ~2%

Target (With hybrid system):
- Day 7 retention: 45%+ (users want to unlock Tier 2)
- Day 30 retention: 25%+ (users chasing badges + Tier 3)
- Free-to-paid conversion: 5%+ (Tier 3 users see value)

Leading indicators:
- 60%+ users unlock Tier 2 within 7 days
- 30%+ users earn 3-day badge
- 15%+ users maintain 7-day streak
```

---

## Risks & Mitigations

### Risk 1: Thresholds Too Hard
**Symptom:** 80% users stuck at Tier 1 after 2 weeks
**Mitigation:** Lower unlock scores (7.0 → 6.5, 7.5 → 7.0)

### Risk 2: Thresholds Too Easy
**Symptom:** 70% users at Tier 4 within 1 week
**Mitigation:** Raise thresholds + add more tiers

### Risk 3: Streak Pressure Backfires
**Symptom:** Users feel stressed, quit instead of engaging
**Mitigation:** Add "Streak Freeze" (1 free day skip per week)

### Risk 4: Badge System Ignored
**Symptom:** Users don't care about badges
**Mitigation:** Add LinkedIn share feature, leaderboard

---

## Future Enhancements (Post-Launch)

```
Phase 2 Features:
- Tier-based leaderboards (compare with similar-tier users)
- Streak Freeze power-up (1 free skip per month)
- Custom tier unlock paths (DSA-heavy vs Behavioral-heavy)
- Team streaks (for college cohorts)
- "Study buddy" system (practice with peers at same tier)
```

---

## Questions to Resolve Before Implementation

1. **Timezone handling:** All users IST or user's local timezone?
   - **Recommendation:** IST (simpler, target audience is India)

2. **Streak reset grace period:** Hard reset at midnight or 24-hour window?
   - **Recommendation:** 24-hour window from last session

3. **Badge sharing:** Auto-generate LinkedIn image or manual?
   - **Recommendation:** Manual button click (less spammy)

4. **Tier downgrade:** Can users drop tiers if performance declines?
   - **Recommendation:** No downgrades (only affects new unlocks)

5. **InterviewIQ data migration:** Import old user scores as baseline?
   - **Recommendation:** Yes, set their tier based on historical avg

---

**Implementation Start Date:** After Group 1 + Group 2 brainstorming complete
**Estimated Timeline:** 10 working days (solo dev, including testing)
**Priority:** High (directly impacts retention + conversion)

---

*Document Version: 1.0*  
*Last Updated: May 13, 2026*  
*Owner: Rakesh Kumar — InterviewEra*
