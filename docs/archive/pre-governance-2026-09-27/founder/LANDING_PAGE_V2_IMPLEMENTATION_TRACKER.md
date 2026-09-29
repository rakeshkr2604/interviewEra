# InterviewEra Landing Page V2

## Project Status

| Field | Value |
|---|---|
| **Overall Status** | 🟨 Phase 0 — Project Initialization |
| **Current Phase** | Phase 0 — Project Initialization |
| **Last Updated** | 2026-08-01 |
| **Owner** | Engineering |
| **Reviewer** | Founder |
| **Production Branch** | `main` |

---

## Phase Tracker

| Phase | Status | Founder Approval | Notes |
|---|---|---|---|
| Phase 0 — Project Initialization | 🟨 In Progress | — | Tracker, changelog, and landing inventory created. No production code touched. |
| Phase 1 — Information Architecture | ⬜ Not Started | — | |
| Phase 2 — Messaging | ⬜ Not Started | — | |
| Phase 3 — Trust Strip | ⬜ Not Started | — | |
| Phase 4 — Problem Section | ⬜ Not Started | — | |
| Phase 5 — How It Works | ⬜ Not Started | — | |
| Phase 6 — Benefits | ⬜ Not Started | — | |
| Phase 7 — Feature Cards | ⬜ Not Started | — | |
| Phase 8 — Sample Report | ⬜ Not Started | — | |
| Phase 9 — Comparison | ⬜ Not Started | — | |
| Phase 10 — Pricing | ⬜ Not Started | — | |
| Phase 11 — FAQ | ⬜ Not Started | — | |
| Phase 12 — Analytics | ⬜ Not Started | — | |
| Phase 13 — Final QA | ⬜ Not Started | — | |

---

## Decision Log

| Date | Decision | Reason | Approved By |
|---|---|---|---|
| 2026-08-01 | Hero section is LOCKED for all V2 phases | Hero already implemented and approved; no modifications permitted | Founder (scope doc) |
| 2026-08-01 | Phase 0 is documentation-only — zero production code changes | Establish traceability before any implementation begins | Founder (scope doc) |
| 2026-08-01 | `src/app/page.tsx` is the landing page entry file | Single composition point for all homepage sections | Engineering (inventory) |
| 2026-08-01 | Trust strip absorbed by Hero — no standalone Trust Strip component | Hero already renders `TRUST_ITEMS` via `LandingHeroCtaIsland`; duplicate strip rejected | Engineering (Phase 1 analysis) |
| 2026-08-01 | Delete 4 homepage sections: ScrollShowcase, BeforeAfter, MidFold, CommunitySection | Heavy overlap with lighter sections; reduces page from 16 → 12 blocks | Engineering (Phase 1 analysis) — **Founder approval pending** |
| 2026-08-01 | Prefer server-rendered sections over ScrollShowcase for prod safety | ScrollShowcase is largest client bundle + autoplay video; InterviewDemo + ScoringEngine cover same narrative | Engineering (Phase 1 analysis) — **Founder approval pending** |
| 2026-08-01 | No homepage pricing block — link-only via FinalCta | `/pricing` page exists; embedding duplicates PricingPageClient; minimal diff | Engineering (Phase 1 analysis) — **Founder approval pending** |
| 2026-08-01 | Reorder-only change for IA — no component refactors in Phase 1 | `page.tsx` import order is sole IA lever; Hero stays first | Engineering (Phase 1 analysis) |

---

## Landing Mapping

Approved business narrative → target homepage section (after refactor):

| # | Business Question | Target Section | Component | Phase |
|---|---|---|---|---|
| — | Above fold (LOCKED) | Hero | `LandingHero` | — |
| 1 | Is this for me? | Audience Path | `AudiencePathSection` | Phase 1 (move) |
| 2 | Can I trust this? | Founder Trust | `LandingFounderSection` | Phase 1 (move) + Phase 3 (messaging) |
| 3 | What problem does it solve? | Problem | `LandingWhyFail` | Phase 4 |
| 4 | How does it work? | How It Works | `LandingHowItWorks` | Phase 5 |
| 5 | Why is it better? | Comparison | `LandingPositioningSection` | Phase 9 |
| 6 | What do I actually get? | Live Session Demo | `LandingInterviewDemo` | Phase 7 |
| 6b | What do I actually get? | Sample Report | `LandingScoringEngine` | Phase 8 |
| 6c | Feature differentiation | Meet Interviewers | `LandingMeetInterviewers` | Phase 7 |
| 7 | Why sign up now? | FAQ (objection handling) | `LandingFaq` | Phase 11 |
| 7b | Why sign up now? | Final CTA | `LandingFinalCta` | Phase 10/11 |
| — | SEO crawl paths | Money Page Links | `HomeMoneyPageLinks` | — |

**Removed from homepage (proposed):**

| Section | Component | Reason |
|---|---|---|
| Scroll Showcase | `LandingScrollShowcase` | Duplicates HowItWorks + InterviewDemo + ScoringEngine; heavy client JS + video |
| Before / After | `LandingBeforeAfter` | Duplicates PositioningSection comparison narrative |
| Mid Fold entry cards | `LandingHomeMidFold` | Duplicates AudiencePathSection + Hero CTA |
| Community | `CommunitySection` | Duplicates Hero community links + FAQ community answer |

**Trust strip:** absorbed by Hero `TRUST_ITEMS` — no new section.

**Pricing:** no dedicated homepage block; `LandingFinalCta` links to `/pricing`.

---

## Architecture Decisions

| ID | Decision | Rationale | Reversible? |
|---|---|---|---|
| AD-01 | Hero is immutable across all phases | Founder lock; regression risk | No (by design) |
| AD-02 | IA changes are `page.tsx` reorder only in Phase 1 | Minimal diff; no component surgery | Yes — revert import order |
| AD-03 | Remove ScrollShowcase from homepage | 3-way duplicate of HowItWorks / InterviewDemo / ScoringEngine; perf cost | Yes — re-add lazy import |
| AD-04 | Merge comparison into `LandingPositioningSection` only | BeforeAfter is redundant with Positioning ChatGPT comparison | Yes — re-add BeforeAfter |
| AD-05 | Single audience section: `AudiencePathSection` | MidFold is a second audience/entry grid | Yes — re-add MidFold lazy |
| AD-06 | Drop homepage `CommunitySection` | Hero links + FAQ suffice; section is shared with dashboard | Yes — re-add import |
| AD-07 | No new components for V2 phases | Reuse existing section components + `home-content.ts` copy | — |
| AD-08 | Unused `home-content.ts` exports (`PROBLEM_POINTS`, `SOLUTION_POINTS`, `FEATURE_PILLARS`) are copy sources for Phase 2 | Already authored; avoids new copy files | Yes |
| AD-09 | Lazy wrappers stay — only remove ScrollShowcase lazy export usage | MeetInterviewers, ScoringEngine, FinalCta remain lazy | Yes |
| AD-10 | Shared components (`MarketingLayout`, `CommunitySection`, `container.ts`) are read-only | Multi-route impact | — |

---

## Component Mapping

Future V2 phase → existing component (no new components):

| V2 Phase | Future Goal | Existing Component | New Component? | Notes |
|---|---|---|---|---|
| Phase 3 — Trust Strip | Trust indicators | Hero `TRUST_ITEMS` + `LandingFounderSection` | **No** | Messaging/copy only in Phase 2/3 |
| Phase 4 — Problem | Pain points | `LandingWhyFail` | **No** | Optional: wire `PROBLEM_POINTS` from `home-content.ts` |
| Phase 5 — How It Works | 4-step flow | `LandingHowItWorks` | **No** | Server-rendered; uses `HOW_IT_WORKS` |
| Phase 6 — Benefits | Outcome bullets | `LandingPositioningSection` (`POSITIONING_WHY_MATTERS`) | **No** | Benefits live inside comparison section |
| Phase 7 — Feature Cards | Product capabilities | `LandingMeetInterviewers` + `FEATURE_PILLARS` copy | **No** | Personas = feature differentiation; pillars = copy refresh |
| Phase 8 — Sample Report | Scored report preview | `LandingScoringEngine` | **No** | Lazy client island; report UI already built |
| Phase 9 — Comparison | vs alternatives | `LandingPositioningSection` | **No** | ChatGPT/generic comparison cards exist |
| Phase 10 — Pricing | Price anchor | `LandingFinalCta` → `/pricing` link | **No** | Full pricing on `PricingPageClient` |
| Phase 11 — FAQ | Objection handling | `LandingFaq` | **No** | 12 FAQs with expander |
| Final CTA | Conversion close | `LandingFinalCta` | **No** | Tracked CTA + pricing link |

**Deferred / not mapped to homepage:**

| Asset | Status |
|---|---|
| `LandingScrollShowcase` | Proposed removal — retain file for potential reuse on `/how-it-works` |
| `LandingBeforeAfter` | Proposed removal — copy mergeable into Positioning |
| `LandingHomeMidFold` | Proposed removal — audience covered by AudiencePath |
| `CommunitySection` (homepage) | Proposed removal — dashboard variant untouched |
| `PRESSURE_MISTAKES`, `SOLUTION_POINTS` | Copy-only in `home-content.ts`; not currently mounted |

---

## Risks

| Risk | Severity | Mitigation | Status |
|---|---|---|---|
| Hero regression from adjacent section changes | High | Hero marked LOCKED; no edits to `LandingHero*` files without explicit Founder approval | Open |
| Lazy-loaded sections (`LandingHomeClient`) may complicate section reordering | Medium | Document lazy wrappers; test bundle splits after any reorder in Phase 1+ | Open |
| `CommunitySection` shared between landing and dashboard surfaces | Medium | Use `placement` prop; avoid breaking dashboard card variant | Open |
| `MarketingLayout` wraps all marketing routes — CSS changes affect non-home pages | Medium | Scope CSS changes to homepage-specific selectors only | Open |
| `home-content.ts` is shared copy source — messaging changes may affect multiple sections | Low | Phase 2 messaging edits must be section-scoped | Open |
| Performance budget (Lighthouse ≥95, no new libraries) | High | Performance Checklist enforced per phase; no Lottie/autoplay video | Open |

---

## Files Changed

_No production files changed in Phase 0._

| Phase | Files |
|---|---|
| Phase 0 | `docs/founder/LANDING_PAGE_V2_IMPLEMENTATION_TRACKER.md` (created), `docs/founder/CHANGELOG.md` (created) |

---

## Pending Founder Decisions

_None at Phase 0._

---

## Open Questions

_None at Phase 0._

---

## Section Audit

_Phase 1.5 founder-level audit — 2026-08-01. Judged by psychological purpose, not engineering duplication._

| Section | Psychological Job | Visitor Question | Strengths | Weaknesses | Founder Verdict |
|---|---|---|---|---|---|
| Hero | Identity + urgency + first proof | What is this? Is it for me? | Strong headline hierarchy; simulator shell; dual CTA; trust strip; free-offer pill | Two subhead paragraphs slow scan; community links compete with CTAs; WhatsApp under mockup splits attention | **Earns place** — locked |
| How It Works | Process map (cognitive scaffold) | How does the flow work at a glance? | Server-rendered; 4 scannable steps; icon tiles; fast read | Arrives before problem in current order; step copy mirrors later sections | **Earns place** — reorder candidate |
| Why Fail | Problem agitation | Why do I still fail interviews? | Sharp headline; 4 distinct failure modes; bridge band ties to product | 4 cards + bridge = moderate length; no CTA at pain peak | **Earns place** |
| Scroll Showcase | Visual proof (immersive journey) | Does this product actually do what it claims? | Full-viewport scenes; resume/voice/report cards; mobile carousel | Heavy cognitive load; autoplay video on voice panel; intro competes with How It Works | **Earns place** — distinct from process list |
| Interview Demo | Experience proof (session fidelity) | What does using it feel like? | Rich session chrome; adaptive follow-up highlighted; transcript + live scores; disclaimer | Dense right column; scores overlap Scoring Engine psych; no CTA | **Earns place** — review ordering vs Scroll Showcase |
| Scoring Engine | Outcome + rubric proof | How is scoring fair and actionable? | Weight breakdown; dimension descriptions; example band callout | Inline styles; no link to hero Sample Report PDF; after demo scores | **Earns place** |
| Before / After | Transformation / relief | What changes after I practice? | Anti-hype subhead; two-column contrast | Generic bullets; weak focal point; overlaps Positioning outcomes | **Marginal** — review relief vs proof stack |
| Positioning | Competitive justification | Why not ChatGPT / question banks? | Strong objection headline; comparison cards; why-it-matters trio | Long section; ChatGPT framing may narrow audience | **Earns place** |
| Founder | Human trust | Who built this? Can I trust them? | Personal voice; no fake metrics; About link; CTA | Three long paragraphs; too late (#9); initials not photo | **Earns place** — move earlier |
| Meet Interviewers | Feature / persona proof | What round types can I practice? | Video personas; TECH vs HR badges | Two autoplay videos; persona naming vs hero simulator | **Earns place** — simplify video |
| Audience Path | Role segmentation | Is this for me (by role)? | 3-path grid; tracked CTAs | No eyebrow; sits late (#11) | **Earns place** — move earlier |
| Mid Fold | Readiness segmentation | Where should I start (prep stage)? | Distinct from Audience Path; outcome lines; recommended badge | Inline styles; late placement | **Earns place** — different psych than Audience Path |
| Community | Belonging / social proof | Is there a community? | Platform cards; hub CTA | Generic title; overlaps hero WhatsApp + FAQ + banner | **Marginal** |
| FAQ | Objection handling | Pricing, privacy, voice, credits? | 12 FAQs; JSON-LD; help links | Generic header; 12 items heavy | **Earns place** |
| Final CTA | Conversion close | Why sign up now? | Urgency headline; dual CTA; free badge | — | **Earns place** |
| SEO Links | Crawl / discovery | (not conversion) | Internal links | Bottom noise | **Earns place** (SEO) |

---

## Content Audit

_Scores 1–10 on existing copy. No rewrites proposed._

| Section | Headline | Subhead | Body / Bullets | CTA / Microcopy | Notes |
|---|---|---|---|---|---|
| Hero | 8 | 7 | 8 | 9 | Strong top fold; second subhead long |
| How It Works | 8 | 7 | 7 | — | Scaffold copy; repeats later |
| Why Fail | 9 | 8 | 9 | — | Best problem copy |
| Scroll Showcase | 8 | 7 | 8 | — | Intro competes with How It Works |
| Interview Demo | 9 | 8 | 9 | — | High-quality product copy |
| Scoring Engine | 9 | 8 | 8 | — | Eyebrow too technical |
| Before / After | 8 | 8 | 7 | — | Generic bullets |
| Positioning | 9 | 9 | 8 | — | Strong objection copy |
| Founder | 8 | — | 7 | 8 | Authentic but long |
| Meet Interviewers | 7 | 8 | 7 | — | Functional persona copy |
| Audience Path | 9 | 8 | 8 | 8 | Clear segmentation |
| Mid Fold | 8 | 8 | 8 | 8 | Good readiness framing |
| Community | 6 | 7 | 7 | 7 | Weakest section headline |
| FAQ | 6 | 8 | 8 | 8 | Questions strong; header weak |
| Final CTA | 9 | 8 | 9 | 9 | Strong closer |

---

## Visual Audit

| Section | Draws Eye | Ignored | Should Be Focal | Unnecessary |
|---|---|---|---|---|
| Hero | H1 + simulator | Trust strip | Primary CTA + mockup | Community links under mockup |
| How It Works | Icon tiles | Step numbers | 4-step grid | — |
| Why Fail | Icon tiles | Eyebrow | Headline + card 1 | — |
| Scroll Showcase | Cards / video | Scroll hint | Resume → voice → report | Parallax blobs; autoplay video |
| Interview Demo | Amber follow-up bubble | Signal microtext | Challenge bubble | Decorative waveform |
| Scoring Engine | Score bars | Weights column | Bar chart colors | Inline-style chrome |
| Before / After | After column | Before column | After checkmarks | Ambient layer |
| Positioning | IE comparison card | ChatGPT X items | Side-by-side cards | Third why-matters row |
| Founder | RK tile | Job pill | Name + para 1 | Large initials block |
| Meet Interviewers | Video faces | Badges | Persona videos | Autoplay loops |
| Audience Path | Icons | Descriptions | Titles + CTAs | — |
| Mid Fold | Recommended badge | Emojis | Middle card | Inline hover styles |
| Community | Card icons | Subtitle | Platform cards | — |
| FAQ | Open question 1 | Collapsed items | Top objections | Show-more wrapper |
| Final CTA | H2 + primary btn | Pricing btn | Start Free | — |

---

## Conversion Audit

| Section | Business | Conversion | Trust | Eng Cost | Priority | Recommendation |
|---|---|---|---|---|---|---|
| Hero | 10 | 10 | 8 | — | P0 | KEEP |
| Audience Path | 9 | 8 | 6 | XS | P0 | MOVE ↑ |
| Founder | 8 | 7 | 9 | S | P0 | MOVE ↑ + REDUCE CONTENT |
| Why Fail | 9 | 8 | 7 | S | P1 | KEEP |
| How It Works | 8 | 7 | 6 | XS | P1 | KEEP + MOVE ↑ |
| Scroll Showcase | 8 | 7 | 8 | M | P1 | KEEP |
| Interview Demo | 8 | 8 | 8 | S | P1 | KEEP — REVIEW AGAIN |
| Scoring Engine | 8 | 8 | 9 | S | P1 | KEEP |
| Positioning | 9 | 8 | 7 | S | P1 | KEEP |
| Before / After | 7 | 6 | 6 | XS | P2 | REVIEW AGAIN |
| Meet Interviewers | 6 | 5 | 6 | M | P2 | KEEP + SIMPLIFY UI |
| Mid Fold | 7 | 7 | 5 | S | P2 | KEEP + MOVE ↑ |
| Community | 5 | 4 | 6 | XS | P3 | REVIEW AGAIN |
| FAQ | 8 | 7 | 8 | S | P1 | KEEP + REWRITE COPY (headers) |
| Final CTA | 9 | 10 | 6 | XS | P0 | KEEP |
| SEO Links | 3 | 2 | 2 | — | P3 | KEEP |

**Per-section founder recommendation:**

| Section | Decision | Reasoning |
|---|---|---|
| Hero | KEEP | Locked conversion anchor |
| Audience Path | MOVE | Role segmentation should precede deep proof |
| Founder | MOVE + KEEP + REDUCE CONTENT | Human trust too late; trim paragraphs |
| Why Fail | KEEP | Strongest problem agitation |
| How It Works | KEEP + MOVE | Fast process scaffold before immersive proof |
| Scroll Showcase | KEEP | Visual proof ≠ process explanation |
| Interview Demo | KEEP — REVIEW AGAIN | Experience proof; validate order vs Scroll Showcase |
| Scoring Engine | KEEP | Rubric transparency ≠ demo sidebar |
| Before / After | REVIEW AGAIN | Weak transformation vs proof sections |
| Positioning | KEEP | Unique competitive job |
| Meet Interviewers | KEEP + SIMPLIFY UI | Persona proof; reduce video weight |
| Mid Fold | KEEP + MOVE | Readiness ≠ audience segmentation |
| Community | REVIEW AGAIN | Belonging partially met elsewhere |
| FAQ | KEEP + REWRITE COPY | Strong Q&A; weak header |
| Final CTA | KEEP | Primary close |
| SEO Links | KEEP | SEO utility |

**Phase 1.5 supersedes Phase 1 deletion proposals** for Scroll Showcase, Interview Demo, Scoring Engine, and Mid Fold — workflow overlap does not justify removal without Founder ruling on psychological redundancy.

---

## Performance Checklist

- [ ] Lighthouse ≥95
- [ ] No additional libraries
- [ ] No Lottie
- [ ] No autoplay video
- [ ] Bundle size unchanged
- [ ] Core Web Vitals preserved
- [ ] Accessibility preserved

---

## Final Launch Checklist

- [ ] All phases marked complete with Founder approval
- [ ] Performance Checklist all passed
- [ ] Analytics events verified (Phase 12)
- [ ] Final QA sign-off (Phase 13)
- [ ] Changelog entries complete for every phase
- [ ] No open risks without accepted mitigation
- [ ] Production deploy verified on `interviewera.com`
