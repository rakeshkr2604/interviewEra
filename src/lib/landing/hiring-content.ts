/**
 * Hiring Teams (B2B) landing — copy and structured content.
 */

export const HIRING_META = {
  title: 'AI Candidate Evaluation for Hiring Teams',
  description:
    'Run structured AI interviews, score every candidate the same way, and manage your hiring pipeline from Applied to Offer — without interviewer bias.',
} as const;

export const HIRING_HERO_BULLETS = [
  'Same rubric for every candidate',
  'Pipeline from Applied → Offer',
  'Compare shortlists without panel bias',
] as const;

export const HIRING_PIPELINE_STAGES = [
  'Applied',
  'AI Interview Completed',
  'Shortlisted',
  'Human Interview',
  'Offer',
  'Rejected',
] as const;

export const HIRING_PAIN_POINTS = [
  {
    title: 'Every interviewer scores differently',
    description:
      'Strong and weak candidates blur together when each panel uses a different bar. You cannot compare Round-2 signal across recruiters.',
  },
  {
    title: 'Early screening burns recruiter hours',
    description:
      'Phone screens and first-round mocks do not scale. Pipelines stall while strong candidates wait and weak ones clog the calendar.',
  },
  {
    title: 'No shared pipeline of record',
    description:
      'Status lives in spreadsheets and Slack threads. Offer/reject decisions lose context when ownership changes mid-loop.',
  },
] as const;

export const HIRING_FEATURES = [
  {
    title: 'Structured AI interviews',
    description:
      'Candidates complete resume-aware mocks with a fixed rubric before they reach a human interviewer.',
  },
  {
    title: 'Bias-resistant scoring',
    description:
      'Communication, structure, and technical depth land on one scale so shortlists are comparable.',
  },
  {
    title: 'Hiring pipeline dashboard',
    description:
      'Move candidates through Applied → AI Interview → Shortlisted → Human Interview → Offer or Rejected.',
  },
] as const;

export const HIRING_HOW_IT_WORKS = [
  {
    step: '1',
    title: 'Create your hiring workspace',
    description: 'Sign up with your work email and company name. Your HR dashboard is ready after email verification.',
  },
  {
    step: '2',
    title: 'Add candidates to the pipeline',
    description: 'Import names and roles. Track each person from Applied through AI interview and human rounds.',
  },
  {
    step: '3',
    title: 'Shortlist with consistent scores',
    description: 'Advance strong profiles, hold mid-band candidates, and reject with a clear stage history.',
  },
] as const;

export type HiringFaqItem = { q: string; a: string };

export type HiringFaqCategory = {
  id: string;
  label: string;
  items: readonly HiringFaqItem[];
};

/** Categorized FAQ — same IA pattern as homepage (`LandingFaqCategorized`). */
export const HIRING_FAQ_CATEGORIES: readonly HiringFaqCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    items: [
      {
        q: 'Who is the Hiring Teams workspace for?',
        a: 'Recruiting teams, early-career hiring managers, and HR ops who need consistent AI-assisted evaluation before human interviews.',
      },
      {
        q: 'How do I create a hiring workspace?',
        a: 'Open For Teams, choose Create hiring workspace, and sign up with your work email and company name. After you verify your email, sign in to open the HR dashboard.',
      },
      {
        q: 'What happens after I sign up?',
        a: 'You get a dedicated hiring workspace and HR dashboard. Add candidates, move them through the pipeline, and keep stage history in one place — separate from student or campus accounts.',
      },
      {
        q: 'Is this the same as the campus (college) product?',
        a: 'No. Campus workspaces serve placement cells and student batches. Hiring Teams is a separate workspace for company recruiters managing candidate pipelines.',
      },
    ],
  },
  {
    id: 'pipeline',
    label: 'Pipeline & Dashboard',
    items: [
      {
        q: 'What stages does the hiring pipeline use?',
        a: 'Applied, AI Interview Completed, Shortlisted, Human Interview, Offer, and Rejected. You can advance candidates along the happy path, reject from an active stage, or reopen a rejected candidate back to Applied.',
      },
      {
        q: 'Can I add candidates manually?',
        a: 'Yes. From the HR dashboard, use Add candidate with name, optional email, and role title. New candidates start in Applied.',
      },
      {
        q: 'Can I reject or reopen a candidate?',
        a: 'Yes. Reject moves someone out of the active columns into Rejected. From Rejected you can reopen them to Applied if you want another look.',
      },
      {
        q: 'Does the dashboard save progress for my team?',
        a: 'Yes. Candidates and stage changes are stored on your hiring workspace, so the pipeline stays consistent when you sign back in.',
      },
    ],
  },
  {
    id: 'scoring',
    label: 'Scoring & Interviews',
    items: [
      {
        q: 'How does structured scoring reduce interviewer bias?',
        a: 'Every candidate is evaluated on the same dimensions — such as communication, structure, and technical depth — so shortlists are comparable across recruiters instead of depending on who ran the panel.',
      },
      {
        q: 'Where do AI interviews fit in the pipeline?',
        a: 'Candidates typically move from Applied to AI Interview Completed after a structured mock. That gives you scored signal before Shortlisted and Human Interview stages.',
      },
      {
        q: 'Can scores sit next to pipeline stage?',
        a: 'Yes. When a score is available it shows on the candidate card in the HR dashboard so you can compare people in the same stage without opening a spreadsheet.',
      },
    ],
  },
  {
    id: 'accounts',
    label: 'Accounts & Access',
    items: [
      {
        q: 'Can I use a personal Gmail to sign up?',
        a: 'Use a work email for your hiring workspace. Personal consumer inboxes (for example Gmail, Yahoo, Outlook.com) are not supported for team accounts.',
      },
      {
        q: 'How do I sign in to the HR dashboard later?',
        a: 'Use Sign in to HR dashboard on the Hiring Teams page, or go to login with next set to the hiring dashboard. After email verification, hiring workspace admins land on the HR dashboard.',
      },
      {
        q: 'Is my hiring workspace separate from a student account?',
        a: 'Yes. Hiring Teams uses its own workspace and pipeline. Student mock-interview practice and campus placement dashboards are different products on InterviewEra.',
      },
    ],
  },
  {
    id: 'pricing-support',
    label: 'Pricing & Support',
    items: [
      {
        q: 'Is Hiring Teams available now?',
        a: 'Yes. You can create a hiring workspace, sign in to the HR dashboard, and run the pipeline for your candidates. Deeper ATS integrations and bulk invite flows may expand over time.',
      },
      {
        q: 'Who do I contact for rollout or sales questions?',
        a: 'For campus placement programs use the Campus page. For hiring-team rollout questions, create a workspace first or reach sales@interviewera.com with your company and hiring volume.',
      },
    ],
  },
] as const;

/** Flat FAQ list for JSON-LD and any non-categorized consumers. */
export const HIRING_FAQ: readonly HiringFaqItem[] = HIRING_FAQ_CATEGORIES.flatMap(
  (category) => category.items,
);
