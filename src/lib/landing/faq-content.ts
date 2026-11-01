/** Homepage FAQ — canonical copy + category IA (single source of truth). */

import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';

export type LandingFaqItem = { q: string; a: string };

export const LANDING_FAQ_REGISTRY = {
  whatIs: {
    q: 'What is InterviewEra?',
    a: 'InterviewEra is a complete AI interview preparation platform for students, freshers, internship candidates and early-career professionals. Four free preparation tools — ATS Resume Checker, Interview Question Generator, STAR Answer Builder and Interview Prompt Builder — help you get ready, and resume-aware AI Mock Interviews let you practise out loud with Adaptive Follow-up Questions, Answer Feedback on every response and an Interview Report at the end.',
  },
  freeTools: {
    q: 'How do the free preparation tools work?',
    a: 'Open any tool from the Free Tools menu. The ATS Resume Checker scores how your resume reads and suggests fixes, the Question Generator creates questions by role, company, topic or job description, the STAR Answer Builder structures and scores a behavioural answer, and the Prompt Builder writes a focused preparation prompt in your browser. Each tool has hourly and daily fair-use limits per account that reset automatically.',
  },
  freeToolsAccount: {
    q: 'Is an account required to use the free tools?',
    a: 'Yes. The tool pages and guides are public to read, but running a tool needs a free, registered InterviewEra account with a verified email. Accounts let fair-use limits apply per person, so students sharing a college or hostel network are not blocked by each other. Sign-up is free and needs no card.',
  },
  freeToolsCredits: {
    q: 'Do the free tools consume mock-interview credits?',
    a: 'No. Using the preparation tools never deducts mock-interview credits. Credits are only used when you start a mock interview. Reaching a fair-use limit does not affect your credits either.',
  },
  chatgpt: {
    q: 'How is InterviewEra different from ChatGPT or other AI tools?',
    a: 'Learn with ChatGPT. Practice with InterviewEra. ChatGPT is strong for understanding concepts. InterviewEra tests whether you can explain those concepts under interview pressure — knowing an answer and communicating it clearly are two different skills. A Mock Interview with Resume-aware questions, Adaptive Follow-up Questions, Answer Feedback, and an Interview Report gives you that pressure before the real panel. Most candidates use both.',
  },
  whyPractice: {
    q: 'Why should I practice with InterviewEra before a real interview?',
    a: 'Real interviews are not the same as reading solved answers. Panels judge how you communicate under pressure, think aloud, handle unexpected probes, and stay composed when follow-ups stack up. InterviewEra recreates those conditions: voice answers, adaptive depth, timing pressure, and an Interview Report that tells you what to work on next — so the real interview is not your first time under that scrutiny.',
  },
  mockInterview: {
    q: 'How does a Mock Interview work?',
    a: 'Upload your resume for Resume-aware questions. You answer by voice in a Mock Interview. When an answer is thin, Adaptive Follow-up Questions dig deeper. Every response gets Answer Feedback. When the session ends, you receive your Interview Report.',
  },
  whoIsFor: {
    q: 'Who is InterviewEra for?',
    a: 'Final-year students, freshers, and early professionals preparing for campus drives, off-campus hiring, internships, and service or product company interviews. If you want voice practice with clear feedback before the real panel, it is built for you.',
  },
  questionBank: {
    q: 'How is this different from a question bank?',
    a: 'Reading questions from a list feels productive, but it skips what actually breaks candidates in panels: no interview flow, no follow-up pressure when you go vague, no voice practice, and no structured feedback — so you grade yourself and overestimate readiness. Self-assessment bias is real. InterviewEra runs a full Mock Interview with Adaptive Follow-up Questions and Answer Feedback so you know what to fix before walk-in day.',
  },
  resume: {
    q: 'Do I need to upload my resume?',
    a: 'Yes. Real interviewers spend most of the session on your resume — your projects, skills, and experience — not generic textbook questions. InterviewEra follows the same approach: questions and follow-ups tie to what you actually built and claimed. Without your resume, the interview cannot mirror what a panel would probe.',
  },
  resumeAware: {
    q: 'What makes the mock interviews resume-aware?',
    a: 'Before the session, InterviewEra reads your uploaded resume — projects, skills, experience and target role — and builds the question plan from it. Follow-up questions then respond to what you actually said, so you practise defending your own work instead of generic textbook questions.',
  },
  voice: {
    q: 'Do I speak my answers or type them?',
    a: 'You speak them. InterviewEra is voice-first: you answer out loud in a Mock Interview, with live captions so you can stay on track if you lose your thread. Speaking builds the same timing and pressure a typed chat cannot.',
  },
  followUps: {
    q: 'Will InterviewEra ask follow-up questions?',
    a: 'Yes — that is core to every session. Say you mention Redis in a project answer. InterviewEra might ask why Redis instead of Memcached, or how you handled cache invalidation. That mirrors a real interviewer testing depth, not accepting a keyword. Adaptive Follow-up Questions appear whenever an answer is vague or incomplete.',
  },
  answerFeedback: {
    q: 'How are my answers evaluated?',
    a: 'Every answer receives Answer Feedback across Communication Clarity, Content Accuracy, Answer Structure, Specificity, and Relevance — the same five dimensions every session. You see what worked and what to improve on each response. After the Mock Interview, those evaluations roll into a complete Interview Report.',
  },
  interviewReport: {
    q: 'What does the Interview Report include?',
    a: 'After each Mock Interview, your Interview Report tells you what to do next — not just what happened. You see your Biggest Improvement, Answer Feedback from each question, clear strengths, areas to improve, and how you scored on Communication Clarity, Content Accuracy, Answer Structure, Specificity, and Relevance. That becomes your next practice focus before your next Mock Interview.',
  },
  roles: {
    q: 'What roles are supported?',
    a: 'Software engineering, data, product, and other early-career roles common in Indian campus hiring — technical, behavioural, and situational questions. Difficulty adapts to your profile and how you answer in the session.',
  },
  differentQuestions: {
    q: 'Will I get different questions every interview?',
    a: 'Questions are generated for your resume and session — not pulled from a static list you memorise. Adaptive Follow-up Questions change based on what you actually said, so two interviews rarely feel identical.',
  },
  practiceMultiple: {
    q: 'Can I practice multiple times?',
    a: 'Yes. Each Mock Interview is a separate session with its own Interview Report. Run another round after you fix what the last report flagged — improvement shows up across reports, not in one session alone.',
  },
  mobile: {
    q: 'Does InterviewEra work on mobile?',
    a: 'Yes — on mobile, laptop, and desktop. Mock Interviews run in the browser; Chrome on Android gives the most reliable mic experience. The same Resume-aware flow, Answer Feedback, and Interview Report apply on any screen size.',
  },
  freeCredits: {
    q: 'How many free mock-interview credits do new users get?',
    a: `New Free accounts receive ${FREE_PLAN.credits} lifetime mock-interview credits, with no card required. They do not expire. Accounts created before this change keep their existing balance.`,
  },
  credits: {
    q: 'What does a mock-interview credit mean?',
    a: `One credit starts one mock interview session with a report. The credit is deducted when the session starts, so a session that is started but left incomplete still uses that credit. Free sign-up includes ${FREE_PLAN.credits} lifetime credits; Starter (₹${PAID_PLANS.starter.amountInr}) includes ${PAID_PLANS.starter.credits} credits and Pro (₹${PAID_PLANS.pro.amountInr}) includes ${PAID_PLANS.pro.credits}. If a confirmed technical problem interrupted a session, report it so the credit can be reviewed.`,
  },
  starterVsPro: {
    q: 'What is the difference between Starter and Pro?',
    a: `Starter (₹${PAID_PLANS.starter.amountInr}) includes ${PAID_PLANS.starter.credits} credits, full answer feedback, dimension notes, a 30-day improvement roadmap, progress tracking and a post-interview report by email. Pro (₹${PAID_PLANS.pro.amountInr}) includes ${PAID_PLANS.pro.credits} credits, everything in Starter, model-answer comparison and PDF report export. Both give ${PAID_PLANS.starter.durationDays}-day access.`,
  },
  validity: {
    q: 'How long are paid plans valid?',
    a: `Each Starter or Pro purchase gives ${PAID_PLANS.starter.durationDays} days of plan access. Paid-plan credits are valid during that period and do not carry over after the plan expires.`,
  },
  recurring: {
    q: 'Are paid plans recurring subscriptions?',
    a: 'No. Starter and Pro are one-time Razorpay payments with no auto-renewal. Your account returns to the Free plan after paid access ends unless you choose to buy again.',
  },
  afterCredits: {
    q: 'What happens after my credits are used?',
    a: 'You can keep using the free preparation tools. To start more mock interviews, make a one-time Starter or Pro purchase whenever you need more practice. Renewing adds the new plan\'s credits to any remaining balance.',
  },
  dsa: {
    q: 'When is DSA interview preparation expected?',
    a: 'DSA-focused interview preparation is planned for January 2027. It is a planned feature, not currently available, and it is not included in any current plan.',
  },
  privacy: {
    q: 'Is my interview data private?',
    a: 'Your sessions, answers, and Interview Reports stay tied to your account and are not published. We do not share your resume or transcripts publicly. See our Privacy Policy for full details.',
  },
  guarantee: {
    q: 'Can InterviewEra guarantee I\'ll get selected?',
    a: 'No. InterviewEra cannot guarantee selection or job offers — no platform can. What it does: structured Mock Interview practice, Answer Feedback, and clearer preparation so you walk in knowing your weak spots. Outcomes still depend on the company, the role, and how you perform on the day.',
  },
  community: {
    q: 'How can I join the InterviewEra community?',
    a: 'WhatsApp groups, job updates, placement discussions, and shared prep resources.',
  },
} satisfies Record<string, LandingFaqItem>;

export type LandingFaqId = keyof typeof LANDING_FAQ_REGISTRY;

export type LandingFaqCategory = {
  id: string;
  label: string;
  faqs: readonly LandingFaqId[];
};

/** Categorized IA — drives sidebar / chips + panel grouping */
export const LANDING_FAQ_CATEGORIES: readonly LandingFaqCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    faqs: ['whatIs', 'chatgpt', 'whyPractice', 'mockInterview', 'whoIsFor', 'questionBank', 'guarantee', 'dsa'],
  },
  {
    id: 'free-tools',
    label: 'Free Tools',
    faqs: ['freeTools', 'freeToolsAccount', 'freeToolsCredits'],
  },
  {
    id: 'mock-interviews',
    label: 'Mock Interviews',
    faqs: ['resume', 'resumeAware', 'voice', 'followUps', 'roles', 'differentQuestions', 'practiceMultiple'],
  },
  {
    id: 'ai-evaluation',
    label: 'AI Evaluation & Reports',
    faqs: ['answerFeedback', 'interviewReport'],
  },
  {
    id: 'pricing',
    label: 'Pricing & Credits',
    faqs: ['freeCredits', 'credits', 'starterVsPro', 'validity', 'recurring', 'afterCredits'],
  },
  {
    id: 'privacy',
    label: 'Privacy & Security',
    faqs: ['privacy'],
  },
  {
    id: 'technical',
    label: 'Technical',
    faqs: ['mobile'],
  },
  {
    id: 'support',
    label: 'Community & Support',
    faqs: ['community'],
  },
] as const;

export type LandingFaqCategoryId = (typeof LANDING_FAQ_CATEGORIES)[number]['id'];

export type LandingFaqCategoryView = LandingFaqCategory & {
  items: readonly LandingFaqItem[];
};

function faqsFromIds(ids: readonly LandingFaqId[]): LandingFaqItem[] {
  return ids.map((id) => LANDING_FAQ_REGISTRY[id]);
}

/** Resolved categories for UI rendering */
export const LANDING_FAQ_CATEGORY_VIEWS: readonly LandingFaqCategoryView[] = LANDING_FAQ_CATEGORIES.map(
  (category) => ({
    ...category,
    items: faqsFromIds(category.faqs),
  }),
);

/** Flat list for FAQPage JSON-LD — every registry entry, category order */
export const LANDING_FAQS: readonly LandingFaqItem[] = LANDING_FAQ_CATEGORY_VIEWS.flatMap(
  (category) => category.items,
);

export const COMMUNITY_FAQ_Q = LANDING_FAQ_REGISTRY.community.q;
