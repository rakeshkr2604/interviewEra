# Landing Page V2 Changelog

All Landing Page V2 implementation changes are recorded here. Every phase must append an entry before the phase is marked complete.

---

## 2026-08-01 — Phase 0 — Project Initialization

| Field | Detail |
|---|---|
| **Date** | 2026-08-01 |
| **Phase** | Phase 0 — Project Initialization |
| **Files Changed** | `docs/founder/LANDING_PAGE_V2_IMPLEMENTATION_TRACKER.md` (created), `docs/founder/CHANGELOG.md` (created) |
| **Reason** | Establish single source of truth tracker and changelog before any production implementation. Inventory existing landing page without modifying code. |
| **Risk** | None — documentation only, no production code touched |
| **Founder Approval** | Pending review |

---

## 2026-08-01 — Phase 4 — LandingWhyFail structural prep

| Field | Detail |
|---|---|
| **Date** | 2026-08-01 |
| **Phase** | Phase 4 — Problem Section (structural prep) |
| **Component** | `LandingWhyFail` |
| **Files Changed** | `src/components/landing/LandingWhyFail.tsx` |
| **Reason** | Extract canonical copy constants (`WHY_FAIL_*`), local card helper, and section `aria-labelledby` for Phase 4 Problem section maintainability. Zero visual/copy changes. |
| **Risk** | Low — same rendered output; a11y improved via labelled section region |
| **Founder Approval** | Approved (component-by-component implementation scope) |

---

## 2026-08-01 — LandingWhyFail Copy

| Field | Detail |
|---|---|
| **Date** | 2026-08-01 |
| **Phase** | LandingWhyFail Copy |
| **Component** | `LandingWhyFail` |
| **Files Changed** | `src/components/landing/LandingWhyFail.tsx` |
| **Reason** | Applied Founder-approved production copy. |
| **Risk** | Low — string constants only; no structural or visual changes |
| **Founder Approval** | Approved |

---

## 2026-08-01 — LandingHowItWorks Structure

| Field | Detail |
|---|---|
| **Date** | 2026-08-01 |
| **Phase** | LandingHowItWorks Structure |
| **Component** | `LandingHowItWorks` |
| **Files Changed** | `src/components/landing/LandingHowItWorks.tsx` |
| **Reason** | Prepared for Founder-controlled messaging. Extracted `HOW_IT_WORKS_CONTENT`, per-step copy constants, and `HowItWorksStepCard` helper. Removed `home-content` import. Zero visual/copy changes. |
| **Risk** | Low — same rendered output; copy now local to component |
| **Founder Approval** | Approved (component-by-component implementation scope) |

---

## 2026-08-01 — LandingHowItWorks Copy

| Field | Detail |
|---|---|
| **Date** | 2026-08-01 |
| **Phase** | LandingHowItWorks Copy |
| **Component** | `LandingHowItWorks` |
| **Files Changed** | `src/components/landing/LandingHowItWorks.tsx` |
| **Reason** | Applied Founder-approved production copy to `HOW_IT_WORKS_*` and `STEP_*` constants only. |
| **Risk** | Low — string constants only; no structural or visual changes |
| **Founder Approval** | Approved |

---

## 2026-08-01 — LandingHowItWorks Visual Redesign

| Field | Detail |
|---|---|
| **Date** | 2026-08-01 |
| **Phase** | LandingHowItWorks Visual Redesign |
| **Component** | `LandingHowItWorks` + `src/components/product-preview/*` |
| **Files Created** | `ProductPreviewFrame.tsx`, `ConversationTurn.tsx`, `preview-data.ts`, `ResumePreview.tsx`, `VoiceInterviewPreview.tsx`, `FollowUpPreview.tsx`, `FeedbackReportPreview.tsx`, `WorkflowStepCard.tsx`, `WorkflowTimeline.tsx`, `BenefitStrip.tsx` |
| **Files Modified** | `src/components/landing/LandingHowItWorks.tsx`, `src/app/(marketing)/marketing.css`, `docs/founder/CHANGELOG.md` |
| **Reason** | Transform text-only four-step section into a visual product walkthrough with extracted reusable preview components (resume upload, Meera voice session, adaptive follow-up bubbles, feedback report + insight). Five-item benefit strip. CSS-only timeline connectors and step 2 emphasis. No screenshots; no changes to Hero, InterviewDemo, ScoringEngine, or ScrollShowcase. |
| **Founder Approval** | Pending review |

---

## 2026-08-02 — LandingScoringEngine Positioning Sprint

| Field | Detail |
|---|---|
| **Date** | 2026-08-02 |
| **Phase** | LandingScoringEngine Positioning |
| **Component** | `LandingScoringEngine` |
| **Files Created** | `src/components/landing/LandingScoringEngine.data.ts` |
| **Files Modified** | `src/components/landing/LandingScoringEngine.tsx`, `docs/founder/CHANGELOG.md` |
| **Reason** | Reposition section from scoring-engine explanation to interviewer-style sample report: highest impact improvement, strengths, next improvements, interviewer feedback, de-emphasized dimension bars, overall outcome, text-link CTA. `REPORT_DEMO` data model; no rubric/weight/engine copy. |
| **Founder Approval** | Pending review |

---

## 2026-08-02 — LandingScoringEngine Product Report Polish

| Field | Detail |
|---|---|
| **Date** | 2026-08-02 |
| **Phase** | LandingScoringEngine Product Report Polish |
| **Component** | `LandingScoringEngine` |
| **Files Modified** | `LandingScoringEngine.data.ts`, `LandingScoringEngine.tsx`, `CHANGELOG.md` |
| **Reason** | Align sample report with in-product terminology (5 dimensions, /10 bars, micro hints), interviewer-voice copy, Interview Complete header, Biggest Improvement hierarchy, primary Start Free Mock Interview CTA. No layout/animation/package changes. |
| **Founder Approval** | Pending review |

---

## 2026-08-02 — LandingScoringEngine Premium Polish Pass

| Field | Detail |
|---|---|
| **Date** | 2026-08-02 |
| **Phase** | LandingScoringEngine Premium Polish |
| **Files Modified** | `LandingScoringEngine.data.ts`, `LandingScoringEngine.tsx`, `marketing.css`, `CHANGELOG.md` |
| **Reason** | Final polish: visual hierarchy (interviewer notes before lists), sentence-case labels, qualitative score bands, denser dimensions, 🔥 Biggest Improvement + impact line, Interview Status badge, 90% card width, tighter CTA. No IA/layout redesign. |
| **Founder Approval** | Pending review |

---

## 2026-08-02 — LandingScoringEngine Coaching-First Pass

| Field | Detail |
|---|---|
| **Date** | 2026-08-02 |
| **Phase** | LandingScoringEngine Coaching-First |
| **Files Modified** | `LandingScoringEngine.data.ts`, `LandingScoringEngine.tsx`, `marketing.css`, `CHANGELOG.md` |
| **Reason** | Align landing report preview with in-product answer feedback: Overall Interview Feedback first, coaching-led Biggest Improvement, interviewer-note copy, measurable strengths, dimension hint→score order, reduced dim emphasis/spacing. No layout/animation changes. |
| **Risk** | Low |
| **Founder Approval** | Pending review |
