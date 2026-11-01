/** Homepage & marketing copy — placement-outcome framing, single source for landing */

import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';

/** Bad answer split for red “vague / no structure” highlights */
export const TRANSFORMATION_BAD_SEGMENTS = [
  { text: 'Yeah so basically in my project we had some issues and I worked with my team. ', flaw: 'vague' as const },
  { text: 'We used different things and I did my best. ', flaw: 'vague' as const },
  { text: 'It was tough but we managed to finish it. ', flaw: 'structure' as const },
  {
    text: "I learned a lot from the experience and I'm a quick learner so I can adapt.",
    flaw: 'vague' as const,
  },
] as const;

export const TRANSFORMATION = {
  title: 'From random answers → structured answers panels can score',
  subtitle:
    'Same question. Two ways to answer. Spot the difference in two seconds — vague vs. evidence-backed.',
  question: 'Tell me about a time you solved a hard technical problem under a deadline.',
  badAnswer: `Yeah so basically in my project we had some issues and I worked with my team. We used different things and I did my best. It was tough but we managed to finish it. I learned a lot from the experience and I'm a quick learner so I can adapt.`,
  goodAnswer: {
    situation:
      'Final-year project: payment API failing intermittently two days before submission — team of four, professor demo locked.',
    task: 'I owned backend debugging and had to stabilise retries without breaking existing checkout flow.',
    action:
      'Reproduced with logging, traced race in retry worker, added idempotent keys + backoff; paired with frontend for error UX.',
    result: 'Zero failed demos; submission on time; professor used it as the class example for error handling.',
  },
  highlights: ['Ownership clear', 'Metric in the result'],
  goodMarks: [
    { label: 'STAR format', ok: true as const },
    { label: 'Clear impact', ok: true as const },
  ] as const,
} as const;

/** Placeholder strip — replace with aggregated, opt-in learner stats post-launch. */
export const RESULTS_PROOF = {
  title: 'Private beta · resume-aware scored practice',
  subtitle:
    'We are validating the product with early users — no fabricated placement or shortlist stories.',
  stories: [] as const,
} as const;

export const RESUME_WOW = {
  title: 'Your interviewer starts with your resume',
  subtitle: 'Four beats — from file to score. This pipeline is the product.',
  topics: ['Payment APIs', 'React + TS', 'Team of 4', 'SQL / perf'] as const,
  questions: [
    'Trace the payment retry failure you owned in production.',
    'Who owned the ambiguous checkout bug — you or frontend?',
  ] as const,
} as const;

export const PRESSURE_MISTAKES = {
  title: 'Three mistakes that hurt interview scores under pressure',
  kicker: 'Easy to overlook until feedback shows the pattern.',
  items: [
    {
      title: 'No structure',
      body: 'Panels can’t score ramble — you look unsure even when you know the work.',
    },
    {
      title: 'Generic answers',
      body: 'If it fits any CV, it doesn’t prove you.',
    },
    {
      title: 'No feedback loop',
      body: 'Same weak answers × 10 companies — no numbers, no fix.',
    },
  ],
} as const;

/** Not used on the homepage UI — landing uses an explicit beta block instead of quotes. */
export const TESTIMONIALS = [] as const;

export const PROBLEM_POINTS = [
  {
    title: 'No structured prep',
    body: 'You read notes but never simulate time pressure or follow-up probes.',
    icon: 'layers' as const,
  },
  {
    title: 'Random question lists',
    body: 'Generic banks ignore your projects — you rehearse the wrong stories.',
    icon: 'shuffle' as const,
  },
  {
    title: 'Zero honest feedback',
    body: 'Friends say “you did fine” — you don’t know what actually cost you the round.',
    icon: 'message' as const,
  },
] as const;

export const SOLUTION_POINTS = [
  {
    title: 'Your resume drives the session',
    body: 'Your interviewer starts with your resume — so every mock probes the work you actually wrote.',
    icon: 'file' as const,
  },
  {
    title: 'Follow-ups that feel real',
    body: 'Weak or vague answers trigger follow-up questions, just like a real interviewer.',
    icon: 'layout' as const,
  },
  {
    title: 'Scores you can act on',
    body: 'Know exactly why an answer scored well — and what to improve before your next interview.',
    icon: 'chart' as const,
  },
] as const;

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Upload Resume',
    description: 'Your interviewer starts with your resume — practice should too.',
    icon: 'upload' as const,
  },
  {
    step: 2,
    title: 'Take Voice Interview',
    description: 'Answer out loud under realistic pacing — the way a panel hears you.',
    icon: 'mic' as const,
  },
  {
    step: 3,
    title: 'Handle Follow-ups',
    description: 'Vague answers trigger follow-ups, just like a real interviewer.',
    icon: 'probe' as const,
  },
  {
    step: 4,
    title: 'Get Structured Feedback',
    description: 'Know why you scored well — and what to fix before the next round.',
    icon: 'trend' as const,
  },
] as const;

export const FEATURE_PILLARS = [
  {
    id: 'intelligence',
    title: 'Intelligence',
    subtitle: 'Practice built from your CV',
    icon: 'brain' as const,
    bullets: ['Your resume shapes the question plan', 'Built for Indian campus hiring'],
  },
  {
    id: 'structure',
    title: 'Structure',
    subtitle: 'Frameworks that hold under pressure',
    icon: 'framework' as const,
    bullets: ['STAR expectations on every prompt', 'Same answer feedback — no mood scoring'],
  },
  {
    id: 'outcomes',
    title: 'Practice loop',
    subtitle: 'Measure progress between sessions',
    icon: 'target' as const,
    bullets: ['Scores that show what to fix next', 'Walk in clearer than last week'],
  },
] as const;

/** Illustrative scores for landing visual only */
export const SCORING_VISUAL = [
  { key: 'communication_clarity', label: 'Communication Clarity', value: 7.4 },
  { key: 'content_accuracy', label: 'Content Accuracy', value: 7.6 },
  { key: 'answer_structure', label: 'Answer Structure', value: 8.3 },
  { key: 'specificity', label: 'Specificity', value: 7.4 },
  { key: 'relevance', label: 'Relevance', value: 7.5 },
] as const;

export const EVALUATION_DIMENSIONS = [
  { name: 'Communication Clarity', weight: '20%', detail: 'Concise, professional wording' },
  { name: 'Content Accuracy', weight: '25%', detail: 'Accuracy and terminology' },
  { name: 'Answer Structure', weight: '20%', detail: 'STAR-style flow' },
  { name: 'Specificity', weight: '15%', detail: 'Concrete examples and detail' },
  { name: 'Relevance', weight: '20%', detail: 'Stays on the question' },
] as const;

export type PricingFaqItem = { q: string; a: string };

export type PricingFaqCategory = {
  id: string;
  label: string;
  items: readonly PricingFaqItem[];
};

export const PRICING_FAQ_CATEGORIES: readonly PricingFaqCategory[] = [
  {
    id: 'tools',
    label: 'Free Preparation Tools',
    items: [
      {
        q: 'Are the preparation tools free?',
        a: 'Yes. The ATS Resume Checker, Interview Question Generator, STAR Answer Builder and Interview Prompt Builder are free with every registered InterviewEra account. Sign-up is free and needs no card.',
      },
      {
        q: 'Do free tools consume interview credits?',
        a: 'No. Using the preparation tools never deducts mock-interview credits. Credits are only used when you start a mock interview.',
      },
      {
        q: 'What happens when I reach a fair-use limit?',
        a: 'Each tool has hourly and daily fair-use limits per account. If you reach one, the tool tells you when you can try again, and the limit resets automatically. Your mock-interview credits are not affected.',
      },
      {
        q: 'Why do I need an account to use the tools?',
        a: 'An account lets us apply fair-use limits per person instead of per network, so students sharing a college or hostel connection are not blocked by each other. Tool information and guides stay public.',
      },
    ],
  },
  {
    id: 'credits',
    label: 'Credits & Free Plan',
    items: [
      {
        q: 'How many mock-interview credits are included?',
        a: `One credit starts one mock interview session with a report. New Free accounts receive ${FREE_PLAN.credits} lifetime credits (existing accounts keep their current balance). Starter includes ${PAID_PLANS.starter.credits} credits and Pro includes ${PAID_PLANS.pro.credits}.`,
      },
      {
        q: 'When is an interview credit deducted?',
        a: 'One credit is deducted when a mock interview starts, not when it finishes. A session that is started but left incomplete still uses that credit.',
      },
      {
        q: 'Do my free interview credits expire?',
        a: 'No. Credits included with a Free account are lifetime credits and do not expire. They cannot be transferred to another account.',
      },
      {
        q: 'What happens when my credits run out?',
        a: 'You can keep using the free preparation tools. To start more mock interviews, make a one-time Starter or Pro purchase. If a confirmed technical issue interrupted an interview, the credit may be restored after review.',
      },
    ],
  },
  {
    id: 'plans',
    label: 'Plans & Access',
    items: [
      {
        q: 'How long does Starter or Pro access last?',
        a: `Each Starter or Pro purchase gives ${PAID_PLANS.starter.durationDays} days of plan access. Paid-plan credits are valid during that period and do not carry over after the plan expires. Both are one-time purchases and do not auto-renew.`,
      },
      {
        q: 'Can I renew after my plan expires?',
        a: 'Yes. You can make another one-time purchase whenever you need more preparation. You can also renew early; remaining access days are preserved by extending from your current expiry date, and renewal adds the new plan\'s credits to your remaining balance.',
      },
      {
        q: 'What is included in Starter?',
        a: `Starter includes ${PAID_PLANS.starter.credits} interview credits, ${PAID_PLANS.starter.durationDays}-day access, everything in Free, full answer feedback, dimension notes, a 30-day improvement roadmap, progress tracking, and a post-interview report by email.`,
      },
      {
        q: 'What is included in Pro?',
        a: `Pro includes ${PAID_PLANS.pro.credits} interview credits, ${PAID_PLANS.pro.durationDays}-day access, everything in Starter, model-answer comparison, and PDF report export.`,
      },
      {
        q: 'When will DSA preparation become available?',
        a: 'DSA Interview Preparation is planned for January 2027. It is not available yet and is not included in any current plan.',
      },
    ],
  },
  {
    id: 'payments',
    label: 'Payments & Offers',
    items: [
      {
        q: 'Are payments recurring?',
        a: 'No. Starter and Pro are one-time Razorpay payments with no auto-renewal. Your account returns to the Free plan after paid access expires unless you choose to purchase again.',
      },
      {
        q: 'Which payment methods can I use?',
        a: 'Razorpay supports UPI, cards, net banking, wallets, and other methods shown during checkout. InterviewEra does not store your card or bank account details.',
      },
      {
        q: 'How does the launch offer work?',
        a: 'When a launch offer is live, this page shows the code, the standard and discounted prices, and how many offer purchases remain. Each account can redeem it once, it applies to eligible paid plans only, and it cannot be combined with other offers. The server confirms the final amount before payment. When no offer is shown, none is running.',
      },
      {
        q: 'Can I use a promo code?',
        a: 'Yes. Sign in and open the upgrade page to apply a promo code. The server validates eligibility and shows the final amount before checkout.',
      },
      {
        q: 'What if payment succeeds but my plan does not update?',
        a: 'Plan activation is normally automatic after Razorpay confirms payment. If your plan still does not update, contact support@interviewera.com with your registered email and Razorpay payment ID so the payment can be investigated.',
      },
    ],
  },
  {
    id: 'support',
    label: 'Support & Refunds',
    items: [
      {
        q: 'What happens if a technical issue interrupts my interview?',
        a: 'If a technical issue prevents your interview from being completed, report it through Feedback → Interview technical issue so the team can investigate. If the issue is confirmed after review, the interview credit may be restored.',
      },
      {
        q: 'How do I report an interview technical issue?',
        a: 'Open Feedback, choose “Interview technical issue,” select the affected interview and issue type, and describe what happened. The target resolution time is 48–72 hours.',
      },
      {
        q: 'Are plan payments or unused credits refundable?',
        a: 'One-time plan payments are generally non-refundable after access is granted, except where required by law or for verified billing errors. Unused credits within an active paid period are not refunded separately.',
      },
      {
        q: 'How do I report a billing error or duplicate charge?',
        a: 'Email support@interviewera.com or use the Contact page with your registered email, Razorpay order or payment ID, and a description of the issue. Verified billing errors are handled under the Refund Policy.',
      },
    ],
  },
] as const;

/** Flat list keeps visible FAQ copy and FAQPage JSON-LD in the same order. */
export const PRICING_FAQ = PRICING_FAQ_CATEGORIES.flatMap((category) => category.items);
