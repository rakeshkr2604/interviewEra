/** Homepage FAQ — canonical copy + category IA (single source of truth). */

export type LandingFaqItem = { q: string; a: string };

export const LANDING_FAQ_REGISTRY = {
  whatIs: {
    q: 'What is InterviewEra?',
    a: 'InterviewEra is Mock Interview practice for campus placements and early-career hiring. Upload your resume for Resume-aware questions, answer by voice, face Adaptive Follow-up Questions, get Answer Feedback on every response, and finish with an Interview Report — the same path every session.',
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
  credits: {
    q: 'How do credits and pricing work?',
    a: 'One credit = one complete Mock Interview. Credits deduct when the session starts. Free sign-up includes 3 lifetime credits with no card required. Paid plans add more credits on one-time 30-day access: Starter (₹149, 8 credits) and Pro (₹399, 25 credits). When you run out, upgrade or wait until you have credits again — see pricing for current limits.',
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
    faqs: ['whatIs', 'chatgpt', 'whyPractice', 'mockInterview', 'whoIsFor', 'questionBank', 'guarantee'],
  },
  {
    id: 'mock-interviews',
    label: 'Mock Interviews',
    faqs: ['resume', 'voice', 'followUps', 'roles', 'differentQuestions', 'practiceMultiple'],
  },
  {
    id: 'ai-evaluation',
    label: 'AI Evaluation & Reports',
    faqs: ['answerFeedback', 'interviewReport'],
  },
  {
    id: 'pricing',
    label: 'Pricing & Credits',
    faqs: ['credits'],
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
