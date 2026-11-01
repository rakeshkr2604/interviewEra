/**
 * Campus (B2B) landing — copy and structured content.
 * Pricing: ₹799/student/year, min 50 seats (matches cost-engine `campus` list price).
 *
 * Accuracy rules for this file:
 *  - Mock interviews debit credits on every plan (create_interview_with_credit) — never
 *    claim "unlimited". Session allowance per seat is agreed in the campus contract.
 *  - The five dimensions are Communication Clarity, Content Accuracy, Answer Structure,
 *    Specificity and Relevance.
 *  - Dashboard capabilities listed here exist under /college/dashboard (students, bulk
 *    invites, deadlines + reminders, analytics charts, student CSV export).
 *  - No institutional logos, testimonials, adoption counts or ROI claims until approved.
 */

export const CAMPUS_META = {
  title: 'AI Mock Interview Platform for Colleges',
  description:
    'Run structured AI mock interviews for your placement batch, track student readiness and plan improvement before placement drives. From ₹799/student/year.',
} as const;

/** Metadata when `/campus` is in Coming Soon mode (admin-togglable). */
export const CAMPUS_COMING_SOON_META = {
  title: 'Campus Placements — Coming Soon',
  description:
    'AI mock interviews for college placement batches are coming soon on InterviewEra. Contact us for pilots, demos, and T&P rollout.',
} as const;

export const HERO = {
  badge: 'For T&P (Training & Placement) teams and campus leadership',
  headlineLead: 'Make your placement batch',
  headlineAccent: 'interview-ready.',
  body: 'Run structured AI mock interviews at scale, understand student readiness and identify improvement areas before placement drives.',
} as const;

/** Shown under hero CTAs. */
export const HERO_BULLETS = [
  'Structured mock interviews for whole batches',
  'Student readiness visible before Day 1',
  'Fewer manual coordination steps for the placement team',
] as const;

export const HERO_PRICE_LINE =
  '₹799/student/year · min 50 seats · high-volume practice per seat' as const;

/** 03 · Institutional credibility without logos — the operational problems addressed. */
export const DESIGNED_FOR = {
  eyebrow: 'Designed for Placement Cells and T&P Teams',
  title: 'Built around the work your placement office already does',
  items: [
    {
      title: 'Scheduling mocks for a whole batch',
      body: 'Faculty and alumni time covers a fraction of students. Self-serve AI mocks reach everyone on a seat.',
    },
    {
      title: 'Comparing students fairly',
      body: 'Different mentors use different bars. One rubric makes readiness comparable across the batch.',
    },
    {
      title: 'Knowing who needs help',
      body: 'Attendance does not show readiness. Score trends and practice activity do.',
    },
    {
      title: 'Chasing practice before drives',
      body: 'Deadlines and reminders replace manual follow-up over email and WhatsApp.',
    },
  ],
} as const;

/** 04 · About InterviewEra for colleges — founder-led vision and the workflow gap. */
export const ABOUT_FOR_COLLEGES = {
  eyebrow: 'About InterviewEra for colleges',
  title: 'Placement prep breaks at structure, scale and measurement',
  body: 'InterviewEra started as a founder-built practice system for Indian campus and early-career interviews. For colleges, it becomes an operational layer: the same interview bar for every student, practice that scales with the batch, and cohort signal for the office.',
} as const;

/** 05 · Platform capabilities — each item maps to shipped product functionality. */
export const CAPABILITIES_SECTION = {
  eyebrow: 'Platform capabilities',
  title: 'What your campus workspace includes',
  subtitle: 'Student practice and the placement-office view, in one product.',
} as const;

export const CAPABILITIES = [
  {
    id: 'batch',
    title: 'Batch interview preparation',
    body: 'Invite students in bulk; each runs technical, HR and behavioural, or mixed mock interviews by voice.',
  },
  {
    id: 'evaluation',
    title: 'Standardised evaluation',
    body: 'Every answer is scored on Communication Clarity, Content Accuracy, Answer Structure, Specificity and Relevance.',
  },
  {
    id: 'resume',
    title: 'Resume-aware questioning',
    body: 'Questions and follow-ups come from each student’s own resume and target role.',
  },
  {
    id: 'tracking',
    title: 'Student performance tracking',
    body: 'Per-student history, score trends and practice activity in the campus dashboard.',
  },
  {
    id: 'reports',
    title: 'Reports and analytics',
    body: 'Cohort analytics charts, individual interview reports and a CSV export of student progress.',
  },
  {
    id: 'onboarding',
    title: 'Campus onboarding support',
    body: 'Help setting up your workspace, inviting the batch and planning practice deadlines with reminders.',
  },
] as const;

/** 06 · Why InterviewEra — no outcome guarantees. */
export const WHY_POINTS = [
  'Consistent evaluation',
  'Scalable practice',
  'Student readiness visibility',
  'Fewer manual coordination steps',
  'Actionable reports',
] as const;

export const BEFORE_AFTER = {
  title: 'Why InterviewEra',
  subtitle:
    'Less guessing about who is ready. Clearer, more structured answers from students. Standardised signal for the office before drives. Placement outcomes still depend on companies and candidates.',
  before: [
    'Students give generic, unstructured answers with no one checking Situation → Task → Action → Result',
    'Human mocks hit a ceiling; much of the batch never gets a real practice round',
    'Feedback depends on who ran the mock — no single bar to compare students',
    'Readiness is assumed from attendance, not evaluated answers',
  ],
  after: [
    'Every answer is scored, including its structure, with specific feedback on what is missing',
    'The batch practises AI mocks on demand without adding coordinator hours',
    'One rubric: Communication Clarity, Content Accuracy, Answer Structure, Specificity, Relevance',
    'Readiness is tracked across the cohort, so weak dimensions and students surface early',
  ],
} as const;

/** 07 · Platform facts — product capabilities only, never adoption numbers. */
export const PLATFORM_FACTS = [
  { value: '5', label: 'evaluation dimensions on every answer' },
  { value: '3', label: 'interview modes: technical, HR & behavioural, mixed' },
  { value: '1', label: 'rubric shared by every student in the batch' },
  { value: 'CSV', label: 'export of student progress for internal reviews' },
] as const;

/** 08 · Campus process. */
export const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: 'Campus onboarding',
    body: 'Pilot or contract confirmed → workspace created and seats provisioned, with a coordinator walkthrough.',
  },
  {
    step: 2,
    title: 'Student invitations',
    body: 'Bulk-invite the batch. Students accept, upload their resume and pick a target role.',
  },
  {
    step: 3,
    title: 'Structured mock interviews',
    body: 'Students run voice-based sessions with adaptive follow-ups and five-dimension feedback.',
  },
  {
    step: 4,
    title: 'Performance tracking',
    body: 'Your team reviews cohort analytics: who is practising, which dimensions lag, who needs attention.',
  },
  {
    step: 5,
    title: 'Improvement planning',
    body: 'Set practice deadlines, send reminders and target clinics or mentor time where the data points.',
  },
] as const;

/** 09 · Product demonstration — illustrative data, never a real deployment. */
export const DEMO_SECTION = {
  eyebrow: 'Product walkthrough',
  title: 'What students and your team see',
  subtitle:
    'Previews below use illustrative data. They show product screens, not results from any college deployment.',
  disclosure: 'Illustrative data — not from a real campus.',
} as const;

/** 10 · Founder — real person only (siteOrganizationStructured.founder). */
export const FOUNDER_SECTION = {
  eyebrow: 'Founder-led',
  title: 'Built by someone who went through the same placement season',
  body: [
    'InterviewEra is a founder-built product, created after navigating the same Indian campus and early-career job market that your students face.',
    'Campus pilots are run directly with the founder, so feedback from your placement team shapes the product.',
  ],
} as const;

/** 11 · Replaces testimonials until genuine, approved ones exist. */
export const PILOT_CRITERIA = {
  eyebrow: 'Evaluate on evidence',
  title: 'What placement teams can evaluate during a pilot',
  subtitle: 'A free 30-day pilot for up to 20 students, so your committee decides on real usage — not slides.',
  items: [
    { title: 'Student participation', body: 'How many invited students start and complete mock interviews.' },
    { title: 'Answer quality over time', body: 'Whether dimension scores move between a student’s sessions.' },
    { title: 'Report usefulness', body: 'Whether reports give mentors something specific to coach on.' },
    { title: 'Coordinator effort', body: 'How much manual scheduling and follow-up the pilot removes.' },
  ],
} as const;

export type ComparisonRow = {
  criterion: string;
  manual: string;
  randomPractice: string;
  chatgpt: string;
  interviewEra: string;
};

export const PLACEMENT_PREP_COMPARISON: readonly ComparisonRow[] = [
  {
    criterion: 'Readiness signal',
    manual: 'Mentor judgement',
    randomPractice: 'Self-reported',
    chatgpt: 'Self-reported',
    interviewEra: 'Scored sessions per student',
  },
  {
    criterion: 'Answer structure feedback',
    manual: 'Varies by mentor',
    randomPractice: 'None',
    chatgpt: 'If the student asks for it',
    interviewEra: 'Scored on every answer',
  },
  {
    criterion: 'Whole batch coverage',
    manual: 'Capped by people hours',
    randomPractice: 'Yes — unstructured',
    chatgpt: 'Yes — no shared rubric',
    interviewEra: 'Yes — same rubric for all',
  },
  {
    criterion: 'Comparable scores',
    manual: 'Inconsistent',
    randomPractice: 'None',
    chatgpt: 'Varies between chats',
    interviewEra: 'Five fixed dimensions',
  },
  {
    criterion: 'Cohort-level visibility',
    manual: 'Hard to aggregate',
    randomPractice: 'None',
    chatgpt: 'None',
    interviewEra: 'Dashboard + CSV export',
  },
  {
    criterion: 'Placement team effort',
    manual: 'Heavy scheduling',
    randomPractice: 'Low, but no oversight',
    chatgpt: 'Low, but no oversight',
    interviewEra: 'Low, with tracking',
  },
] as const;

export const PRICING_FEATURES = [
  'High-volume mock-interview practice per seat — allowance agreed in your campus contract',
  'Five-dimension evaluation and an interview report for every session',
  'Campus dashboard with cohort analytics and CSV export',
  'Onboarding and coordinator support',
  'Priority email support',
] as const;

export const PRICING_CONTEXT = {
  /** ₹799 / 365 ≈ ₹2.19 — keep in sync with FAQ / campus annual seat price */
  perStudentPerDay: '₹2.19 per student per day',
  missedOpportunity: 'About ₹2.19 per student per day — built for every student, not just your top performers',
} as const;

export const FINAL_CTA = {
  headline: 'Set up your campus workspace before placement season',
  urgencyLine:
    'Structured practice compounds. The earlier your batch starts, the more practice rounds every student gets before Day 1.',
  body: 'We cap concurrent pilots so each campus gets proper rollout support. Book 20 minutes: a live product walkthrough, batch alignment, and a 20-student pilot so your committee decides on evidence.',
  closingLine: '',
  timelineTitle: 'Typical onboarding timeline',
  timeline: [
    { phase: 'Week 0', detail: '20-minute call: scope batch slice, roles, pilot start date.' },
    { phase: 'Week 1', detail: 'Seats live, invites sent, optional student briefing.' },
    { phase: 'Weeks 2–4', detail: 'Students practise; your team reviews cohort analytics weekly.' },
    { phase: 'Pre-drive', detail: 'Scale seats or move to an annual contract — based on what the pilot shows.' },
  ],
} as const;

export const FAQ_ITEMS = [
  {
    q: 'How does campus onboarding work?',
    a: 'After a short demo, we create your campus workspace, provision seats and walk your coordinator through inviting students, setting deadlines and reading the analytics. Most of the setup happens in the first week of a pilot.',
  },
  {
    q: 'How are student seats provisioned?',
    a: 'Your coordinator bulk-invites students from the campus dashboard. Each student accepts the invitation with their own account, then uploads a resume and starts practising.',
  },
  {
    q: 'Is there a pilot for institutions?',
    a: 'Yes. After a short demo we can open a free 30-day pilot for up to 20 students so your committee evaluates on real usage, not slides.',
  },
  {
    q: 'How does billing work?',
    a: '₹799 per student per year, billed annually. Minimum 50 seats (₹39,950/year). Volume discounts apply for 200+ seats. Campus pricing is separate from individual Starter and Pro plans.',
  },
  {
    q: 'How many interviews can each student run?',
    a: 'Campus seats are built for repeated, high-volume practice. The session allowance per seat is agreed in your campus contract.',
  },
  {
    q: 'What reporting does the placement team get?',
    a: 'Cohort analytics charts, per-student history and score trends, deadline tracking with reminders, and a CSV export of student progress. Students also receive an interview report after each session.',
  },
  {
    q: 'How is student data handled?',
    a: 'Each student’s resume, answers and reports are tied to their own account and are not published. Your placement team sees the progress and scores needed to support students. See our Privacy Policy for full details.',
  },
  {
    q: 'Can students use mobile browsers?',
    a: 'Yes. InterviewEra runs in the browser — no app install. Chrome gives the most reliable microphone experience; a stable connection and a quiet space help.',
  },
  {
    q: 'What support do we get?',
    a: 'Onboarding help for your coordinator and priority email support at campus@interviewera.com throughout the pilot and contract.',
  },
] as const;
