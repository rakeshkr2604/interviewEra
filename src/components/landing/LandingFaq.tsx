import Link from 'next/link';
import { Minus, Plus, ChevronDown } from 'lucide-react';
import { faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

/** FAQs shown before the “Show more” expander */
export const LANDING_FAQ_VISIBLE_COUNT = 6;

export type LandingFaqItem = { q: string; a: string };

/** Canonical FAQ entries — single source for copy */
const LANDING_FAQ_REGISTRY = {
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

type LandingFaqId = keyof typeof LANDING_FAQ_REGISTRY;

function faqsFromIds(ids: readonly LandingFaqId[]): LandingFaqItem[] {
  return ids.map((id) => LANDING_FAQ_REGISTRY[id]);
}

/** Journey order for the landing accordion + JSON-LD (not category flatten order) */
export const LANDING_FAQ_DISPLAY_ORDER: readonly LandingFaqId[] = [
  'whatIs',
  'chatgpt',
  'whyPractice',
  'mockInterview',
  'resume',
  'followUps',
  'answerFeedback',
  'interviewReport',
  'whoIsFor',
  'questionBank',
  'roles',
  'differentQuestions',
  'practiceMultiple',
  'mobile',
  'credits',
  'privacy',
  'guarantee',
  'community',
];

/** Internal grouping for maintainability — not shown on the landing page */
export const LANDING_FAQ_CATEGORIES: ReadonlyArray<{
  id: string;
  label: string;
  faqs: readonly LandingFaqId[];
}> = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    faqs: ['whatIs', 'chatgpt', 'whyPractice', 'mockInterview', 'whoIsFor', 'questionBank'],
  },
  {
    id: 'interview-experience',
    label: 'Interview Experience',
    faqs: ['resume', 'voice', 'followUps', 'answerFeedback', 'interviewReport'],
  },
  {
    id: 'product',
    label: 'Product',
    faqs: ['roles', 'differentQuestions', 'practiceMultiple', 'mobile', 'credits'],
  },
  {
    id: 'trust',
    label: 'Trust',
    faqs: ['privacy', 'guarantee', 'community'],
  },
];

/** Flat FAQ list for accordion + JSON-LD — follows {@link LANDING_FAQ_DISPLAY_ORDER} */
export const LANDING_FAQS: readonly LandingFaqItem[] = faqsFromIds(LANDING_FAQ_DISPLAY_ORDER);

const COMMUNITY_FAQ_Q = 'How can I join the InterviewEra community?';

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (question === COMMUNITY_FAQ_Q) {
    return (
      <>
        See the{' '}
        <Link
          href={COMMUNITY_HUB_PATH}
          className="ie-lh-text-accent font-semibold underline-offset-2 hover:underline"
        >
          Community Hub
        </Link>{' '}
        for WhatsApp groups, job-alert channels, and social links.
      </>
    );
  }
  return <>{answer}</>;
}

function FaqItem({
  question,
  answer,
  defaultOpen = false,
}: {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className={cn(
        'ie-lh-faq-item group rounded-2xl border px-4 py-3.5 transition-all duration-200 sm:px-5 sm:py-4',
        'hover:border-[color-mix(in_srgb,var(--accent-primary)_28%,var(--card-border))]',
        'open:border-[color-mix(in_srgb,var(--accent-primary)_35%,var(--card-border))]',
        'open:bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--card-bg))]',
        'open:shadow-[0_8px_32px_color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
      )}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="ie-lh-text-primary flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg text-[15px] font-semibold leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:ring-offset-2">
        <span className="min-w-0 pr-2">{question}</span>
        <span className="ie-lh-border-card relative flex size-7 shrink-0 items-center justify-center rounded-lg border transition-colors group-open:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))] group-open:bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]">
          <Plus
            className="ie-lh-text-accent size-3.5 transition-all duration-200 group-open:scale-0 group-open:opacity-0"
            aria-hidden
          />
          <Minus
            className="ie-lh-text-accent absolute size-3.5 scale-0 opacity-0 transition-all duration-200 group-open:scale-100 group-open:opacity-100"
            aria-hidden
          />
        </span>
      </summary>
      <p className="ie-lh-faq-answer-rule mt-3 border-t pt-3 text-sm leading-relaxed sm:text-[15px]">
        <FaqAnswer question={question} answer={answer} />
      </p>
    </details>
  );
}

/**
 * Homepage FAQ — native <details> accordion (SSR, zero client JS) + FAQPage JSON-LD.
 * First {LANDING_FAQ_VISIBLE_COUNT} items visible; rest behind a “Show more” expander.
 */
export function LandingFaq() {
  const faqLd = faqPageJsonLd(LANDING_FAQS.map((f) => ({ question: f.q, answer: f.a })));
  const visibleFaqs = LANDING_FAQS.slice(0, LANDING_FAQ_VISIBLE_COUNT);
  const moreFaqs = LANDING_FAQS.slice(LANDING_FAQ_VISIBLE_COUNT);
  const moreCount = moreFaqs.length;

  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'ie-lh-section-faq border-t')}
      aria-labelledby="home-faq-heading"
    >
      <div className={cn(LANDING_PAGE_CONTAINER, 'max-w-3xl')}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>Questions</span>
          <h2
            id="home-faq-heading"
            className="mt-3 font-[family-name:var(--font-bricolage)] text-[clamp(1.625rem,3.4vw,2.5rem)] font-extrabold leading-tight tracking-tight text-[var(--text-primary)]"
          >
            Remaining questions before you start
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            How Mock Interviews work, how InterviewEra differs from ChatGPT, pricing, and privacy —
            answered before your first session.
          </p>
        </div>

        <div className="mt-10 space-y-2.5 sm:space-y-3">
          {visibleFaqs.map((f, index) => (
            <FaqItem key={f.q} question={f.q} answer={f.a} defaultOpen={index === 0} />
          ))}

          {moreCount > 0 ? (
            <details className="ie-lh-faq-more group/more rounded-2xl border border-dashed transition-colors duration-200 open:border-[color-mix(in_srgb,var(--accent-primary)_30%,var(--card-border))]">
              <summary className="ie-lh-text-accent flex cursor-pointer list-none items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)] focus-visible:ring-offset-2 sm:py-4">
                <span className="group-open/more:hidden">
                  Show {moreCount} more question{moreCount === 1 ? '' : 's'}
                </span>
                <span className="hidden group-open/more:inline">Show fewer questions</span>
                <ChevronDown
                  className="size-4 transition-transform duration-200 group-open/more:rotate-180"
                  aria-hidden
                />
              </summary>
              <div className="ie-lh-border-card space-y-2.5 border-t px-3 pb-3 pt-2 sm:space-y-3 sm:px-4 sm:pb-4 sm:pt-3">
                {moreFaqs.map((f) => (
                  <FaqItem key={f.q} question={f.q} answer={f.a} />
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <div className="ie-lh-faq-footer mt-10 rounded-2xl border px-5 py-4 text-center text-sm sm:px-6">
          Still have questions?{' '}
          <Link
            href="/help-center"
            className="ie-lh-text-accent font-semibold underline-offset-2 hover:underline"
          >
            Help Center
          </Link>
          ,{' '}
          <Link
            href="/how-it-works"
            className="ie-lh-text-accent font-semibold underline-offset-2 hover:underline"
          >
            how it works
          </Link>
          , or{' '}
          <Link
            href={COMMUNITY_HUB_PATH}
            className="ie-lh-text-accent font-semibold underline-offset-2 hover:underline"
          >
            community
          </Link>
          .
        </div>
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  );
}
