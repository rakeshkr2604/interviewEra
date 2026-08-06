/**
 * Campus (B2B) landing — copy and structured content.
 * Pricing: ₹799/student/year, min 50 seats.
 */

export const CAMPUS_META = {
  title: 'AI Mock Interviews for Campus Placements',
  description:
    'Train your entire placement batch with AI mock interviews — cohort analytics, unlimited sessions, and zero extra T&P workload. From ₹799/student/year.',
} as const;

/** Shown under hero CTAs (replaces duplicate stat cards for cleaner hierarchy). */
export const HERO_BULLETS = [
  'Run mocks for entire batches',
  'Track student readiness before Day 1',
  'No extra workload for placement team',
] as const;

export const HERO_PRICE_LINE =
  '₹799/student/year · min 50 seats · unlimited mocks per campus seat' as const;

/** Rotating emphasis in the campus hero H1 — keep phrases short for a clean 1-line swap. */
export const HERO_ROTATING_PHRASES = [
  'placement outcomes',
  'student readiness',
  'batch performance',
  'Day-1 confidence',
] as const;

/** Before / after — sharp, no fake logos or testimonials */
export const BEFORE_AFTER = {
  title: 'What actually changes after InterviewEra',
  subtitle:
    'You stop guessing who is ready. Students stop improvising vague stories. The office gets standardized, tracked signal before drives.',
  before: [
    'Students give generic, unstructured answers — nothing forces Situation → Task → Action → Result',
    'Human mocks hit a ceiling; most of the batch never gets a real panel rep',
    'Feedback depends on who ran the mock — no single bar to compare students',
    'Placement readiness is assumed from attendance and guesswork, not evaluated answers',
  ],
  after: [
    'Every answer follows a structured, evaluated format before it counts as “done”',
    'The full batch runs AI mocks on demand — scaled without adding coordinator hours',
    'One standardized rubric: communication, technical depth, structure, confidence, relevance',
    'Readiness is tracked cohort-wide — weak dimensions and students are flagged early',
  ],
} as const;

export const PAIN_POINTS = [
  {
    title: 'Students ramble in interviews without structure',
    description:
      'Without a forced frame, answers sprawl. Panels lose the thread; students think they answered when they did not hit Situation, Action, and Result.',
  },
  {
    title: 'Mock interviews do not scale beyond small groups',
    description:
      'Faculty and alumni time is finite. A fraction of the batch gets real mocks; the rest practices alone, in chat threads, or not at all.',
  },
  {
    title: 'No standardized evaluation system',
    description:
      'Different mentors, different bars. You cannot compare readiness across students or prove improvement to leadership with one consistent scoreline.',
  },
] as const;

export const SOLUTION_PILLARS = [
  {
    title: 'Enforced structured answering (STAR)',
    description:
      'Questions and answer capture map to Situation, Task, Action, Result so rambling is visible before it hits a company panel.',
  },
  {
    title: 'AI-driven mock interviews at scale',
    description:
      'Each seat runs unlimited sessions on your contract. Resume and target role shape questions; no scheduling wall for the whole batch.',
  },
  {
    title: 'Standardized scoring + tracking dashboard',
    description:
      'Same five dimensions for every answer. Roll up weak spots by student and batch so T&P intervenes on data, not gut feel.',
  },
] as const;

export type CampusFeaturePrimary = {
  title: string;
  does: string;
  works: string;
  outcome: string;
};

export type CampusFeatureSecondary = {
  title: string;
  body: string;
};

export const FEATURES_SECTION = {
  eyebrow: 'Platform',
  title: 'Core system + supporting depth',
  subtitle:
    'Three mechanisms drive placement outcomes. Everything else supports them — without another wall of equal-weight cards.',
} as const;

export const FEATURES_PRIMARY: readonly CampusFeaturePrimary[] = [
  {
    title: 'Structured answering system',
    does: 'Forces answers through Situation, Task, Action, Result before evaluation unlocks.',
    works: 'Students fill each block; incomplete or weak sections block final scores until fixed or flagged.',
    outcome: 'Panels hear complete stories, not rambling — and coaches know exactly which link in the chain broke.',
  },
  {
    title: 'Scalable mock interviews',
    does: 'Runs AI-driven mocks for every enrolled seat, unlimited sessions per contract.',
    works: 'Resume + target role shape questions; no manual scheduling for each student.',
    outcome: 'The whole batch reps before Day 1 — not just the students who grabbed faculty slots.',
  },
  {
    title: 'Performance tracking',
    does: 'Aggregates practice and rubric scores into cohort and student-level views.',
    works: 'Same five dimensions for everyone; rollups show who is weak where, week over week.',
    outcome: 'T&P intervenes on tracked gaps — not on hunches the week before drives.',
  },
] as const;

export const FEATURES_SECONDARY: readonly CampusFeatureSecondary[] = [
  {
    title: 'Resume-based questions',
    body: 'Prompts pull from parsed resume and declared role so practice matches what recruiters will ask.',
  },
  {
    title: 'Analytics',
    body: 'Activity, dimension trends, and outliers surface without manual scoring spreadsheets.',
  },
  {
    title: 'Reports',
    body: 'Exports and summaries you can drop into internal reviews and leadership updates.',
  },
] as const;

export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Onboard your campus in 24 hours',
    body: 'Contract or pilot confirmed → seats provisioned, invite flow shared, optional coordinator walkthrough the same week.',
  },
  {
    step: 2,
    title: 'Students start structured mock interviews',
    body: 'They upload resume, pick target role, and run STAR-framed sessions with immediate rubric feedback.',
  },
  {
    step: 3,
    title: 'Weekly performance tracking across batches',
    body: 'You review cohort rollups: who is practicing, which dimensions lag, where to focus this week’s prep.',
  },
  {
    step: 4,
    title: 'Improve weak candidates before placements begin',
    body: 'Interventions (clinics, nudges, mentor time) target students and skills the dashboard already flagged.',
  },
] as const;

export type ComparisonRow = {
  criterion: string;
  manual: string;
  randomPractice: string;
  chatgpt: string;
  interviewEra: string;
};

export const PLACEMENT_PREP_COMPARISON: readonly ComparisonRow[] = [
  {
    criterion: 'Placement readiness',
    manual: 'Assumed',
    randomPractice: 'Assumed',
    chatgpt: 'Assumed',
    interviewEra: 'Verified',
  },
  {
    criterion: 'STAR structure enforced',
    manual: 'Varies by mentor',
    randomPractice: 'Not enforced',
    chatgpt: 'Not enforced',
    interviewEra: 'Built into flow',
  },
  {
    criterion: 'Whole batch coverage',
    manual: 'Capped by people hours',
    randomPractice: 'Yes — unstructured',
    chatgpt: 'Yes — no rubric',
    interviewEra: 'Yes — same rubric for all',
  },
  {
    criterion: 'Comparable scores',
    manual: 'Inconsistent',
    randomPractice: 'None',
    chatgpt: 'None',
    interviewEra: 'Five fixed dimensions',
  },
  {
    criterion: 'Cohort-level visibility',
    manual: 'Hard to aggregate',
    randomPractice: 'None',
    chatgpt: 'None',
    interviewEra: 'Dashboard + exports',
  },
  {
    criterion: 'Placement team effort to run',
    manual: 'Heavy scheduling',
    randomPractice: 'Low — zero oversight',
    chatgpt: 'Low — zero oversight',
    interviewEra: 'Low effort — high signal',
  },
] as const;

export const PRICING_FEATURES = [
  'Unlimited AI mock interviews per campus seat',
  'Full detailed analysis and model-answer guidance',
  'Cohort-level analytics and exports',
  'Dedicated onboarding and coordinator support',
  'Priority email support',
] as const;

export const PRICING_CONTEXT = {
  agencyComparison: 'Training agencies often charge ₹5,000–₹10,000 per student for placement prep packages.',
  roi: 'Improving outcomes for even a small share of the batch typically offsets the per-seat cost.',
  /** ₹799 / 365 ≈ ₹2.19 — keep in sync with FAQ / campus annual seat price */
  perStudentPerDay: '₹2.19 per student per day',
  missedOpportunity: '₹2.19 per student per day — built for every batch, not just your top performers',
} as const;

export const FINAL_CTA = {
  headline: 'Set up your campus workspace before placement season',
  urgencyLine:
    'Structured practice compounds. The earlier your batch starts, the more reps every student gets before Day 1.',
  body: 'We cap concurrent pilots so each campus gets proper rollout support. Book 20 minutes: live product walkthrough, batch alignment, and a 20-student pilot so your committee decides on proof — not slides.',
  closingLine: '',
  timelineTitle: 'Typical onboarding timeline',
  timeline: [
    { phase: 'Week 0', detail: '20-minute call: scope batch slice, roles, pilot start date.' },
    { phase: 'Week 1', detail: 'Seats live, invites sent, optional student briefing.' },
    { phase: 'Weeks 2–4', detail: 'Students practice; your team reviews weekly cohort metrics.' },
    { phase: 'Pre-drive', detail: 'Scale seats or annual contract — based on what the data shows.' },
  ],
} as const;

export const FAQ_ITEMS = [
  {
    q: 'How does billing work?',
    a: '₹799 per student per year, billed annually. Minimum 50 seats (₹39,950/year). Volume discounts apply for 200+ seats.',
  },
  {
    q: 'Can students use mobile browsers?',
    a: 'Yes. InterviewEra runs in the browser — no app install. Use a stable connection and a quiet space for the best voice experience where enabled.',
  },
  {
    q: 'How many interviews can each student run?',
    a: 'Unlimited for campus-tier seats. Consumer credit limits do not apply; the contract is built for whole-batch repetition.',
  },
  {
    q: 'Can we align questions with our recruiters?',
    a: 'Yes. Configure role, difficulty, and domain-style packs to match your dominant hiring patterns. Ask for a rollout playbook matched to your top recruiters.',
  },
  {
    q: 'Is there a pilot for institutions?',
    a: 'Yes. After a short demo we can open a free 30-day pilot for up to 20 students so your committee evaluates on real usage, not slides.',
  },
] as const;
