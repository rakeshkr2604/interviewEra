import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Captions,
  CheckCircle2,
  FileText,
  Gauge,
  Languages,
  MessagesSquare,
  Mic,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { howToJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld';
import { generateMetadata, schemaIds, siteConfig } from '@/lib/seo/metadata';
import type { SeoTextLink } from '@/lib/seo/internal-links';

const PAGE_PATH = '/how-it-works';
const PAGE_DESCRIPTION =
  'How InterviewEra works: upload your resume, run a voice mock interview with adaptive follow-ups and live captions, and get rubric-based scoring — built for Indian campus placements.';

export const metadata: Metadata = generateMetadata({
  title: 'How It Works',
  documentTitleAbsolute: 'How InterviewEra Works — Adaptive Mock Interviews',
  socialTitle: 'How InterviewEra Works',
  description: PAGE_DESCRIPTION,
  path: PAGE_PATH,
  keywords: [
    'how InterviewEra works',
    'AI mock interview process',
    'adaptive interview questions',
    'rubric interview scoring',
    'campus placement interview practice',
  ],
});

// ── Content (kept as data so JSX stays clean + lint-safe) ─────────────────────

const QUICK_FEATURES = [
  { icon: MessagesSquare, title: 'Adaptive follow-ups', body: 'It probes deeper when an answer is vague and challenges claims it cannot verify — like a real interviewer, not a fixed script.' },
  { icon: Languages, title: 'Understands Hinglish', body: 'Slip into Hindi when nerves hit and it still follows you. The interviewer keeps replying in professional English, so the simulation stays realistic.' },
  { icon: Captions, title: 'Live captions', body: 'Your words appear in real time, like live subtitles — so a stumble does not become a spiral. Confidence support, not answer assistance.' },
  { icon: Gauge, title: 'One consistent rubric', body: 'Five weighted dimensions, applied the same way every session. No mood scoring, no vague encouragement.' },
] as const;

const JOURNEY_STEPS = [
  { tag: 'UPLOAD', icon: FileText, title: 'Upload your resume', body: 'Parsed once on upload. Your projects, skills, and experience are indexed so the session is built around your actual background.' },
  { tag: 'GENERATE', icon: Sparkles, title: 'Get role-aware questions', body: 'Questions are generated from what you actually wrote and sequenced the way a real campus panel runs — technical depth, behavioural scenarios, or a mixed loop.' },
  { tag: 'INTERVIEW', icon: Mic, title: 'The interview begins', body: 'Voice-first. You speak your answers out loud, the way you will in the room — not type them into a chat box.' },
  { tag: 'PROBE', icon: MessagesSquare, title: 'Follow-ups go deeper', body: 'It listens to each answer, then probes for detail, asks you to clarify a vague point, or challenges a claim that needs evidence.' },
  { tag: 'SUPPORT', icon: Captions, title: 'Live captions keep you steady', body: 'A real-time transcript runs alongside the interview so you can recover when you lose your thread — without breaking the flow.' },
  { tag: 'SCORE', icon: BarChart3, title: 'Every answer is scored', body: 'Each response is evaluated across five weighted dimensions, with specific gaps to fix — a number you can act on, not a feeling.' },
  { tag: 'TRACK', icon: TrendingUp, title: 'Track progress across sessions', body: 'Scores are saved so you can watch them move as you tighten your answers. Improvement you can measure, session over session.' },
] as const;

const FOLLOWUP_DIALOGUE = [
  { who: 'interviewer', label: 'InterviewEra', text: 'Walk me through the payment API failure you handled on your final-year project.' },
  { who: 'candidate', label: 'You', text: 'Yeah, so the payments were failing sometimes and I fixed it with my team.' },
  { who: 'interviewer', label: 'Follow-up · clarify', text: 'When you say "sometimes" — what was the actual failure rate, and how did you measure it?' },
  { who: 'candidate', label: 'You', text: 'It was around 8% of transactions. We saw it in the logs during the demo week.' },
  { who: 'interviewer', label: 'Follow-up · challenge', text: 'You said "we" — what did you specifically own? Walk me through the fix you wrote.' },
] as const;

const FOLLOWUP_TYPES = [
  { title: 'Probe deeper', body: 'When an answer is shallow, it asks the next layer down — design trade-offs, edge cases, what you would do differently.' },
  { title: 'Clarify the vague', body: 'Words like "some", "a lot", or "we improved it" get pinned to specifics: numbers, your role, the actual decision.' },
  { title: 'Challenge weak claims', body: 'A claim it cannot verify gets pushed — politely, but the way a panel does — so you learn to back statements with evidence.' },
] as const;

const CONFIDENCE_STAGES = [
  { step: 'Stage 1', title: 'Start in low-pressure voice mocks', body: 'Get comfortable saying answers out loud. Short sessions, supportive pacing, and patient endpointing that does not cut you off mid-thought.' },
  { step: 'Stage 2', title: 'Move to deeper, adaptive sessions', body: 'As you steady, the follow-ups get sharper and the loop gets longer — closer to how a real interview keeps testing your reasoning.' },
  { step: 'Stage 3', title: 'Run a full mock under realistic pressure', body: 'Sit a complete scored session the way a panel would run it, and benchmark yourself against the same rubric every time.' },
] as const;

const SCORING_DIMENSIONS = [
  { name: 'Communication clarity', weight: '20%', desc: 'Concise, professional wording — minimal filler or hedging.' },
  { name: 'Technical depth', weight: '25%', desc: 'Accuracy, correct terminology, and real domain knowledge.' },
  { name: 'Answer structure', weight: '20%', desc: 'STAR-style flow a panel can follow and actually score.' },
  { name: 'Confidence', weight: '15%', desc: 'Clear ownership — "I did X", not "we maybe tried…".' },
  { name: 'Relevance', weight: '20%', desc: 'Stays on the question instead of drifting away from it.' },
] as const;

const COMPARISON = [
  { kind: 'other', label: 'Static question lists', points: ['Fixed questions in a fixed order', 'No reaction to what you actually said', 'You grade yourself — no rubric'] },
  { kind: 'other', label: 'Open-ended AI chat', points: ['No interview structure or sequencing', 'Praise without a consistent standard', 'Typed answers, not spoken under pressure'] },
  { kind: 'us', label: 'InterviewEra', points: ['Adaptive follow-ups react to your answer', 'Panel-style structure for your role', 'Scored on one fixed five-dimension rubric'] },
] as const;

const LOOP = [
  { icon: Mic, title: 'Practice', body: 'Run a realistic, adaptive session from your resume.' },
  { icon: BarChart3, title: 'Feedback', body: 'Get a rubric score and the specific gaps to fix.' },
  { icon: RefreshCw, title: 'Retry', body: 'Re-answer with the structure you were missing.' },
  { icon: Target, title: 'Improve', body: 'Watch the number move — measurable, not vibes.' },
] as const;

const EXPLORE_LINKS: SeoTextLink[] = [
  { href: '/interview-questions', label: 'Interview questions by role' },
  { href: '/tools/question-generator', label: 'Free question generator' },
  { href: '/tools/ats-checker', label: 'ATS resume checker' },
  { href: '/tools/star-builder', label: 'STAR answer builder' },
  { href: '/campus', label: 'For campus placement cells' },
  { href: '/interviewera', label: 'What is InterviewEra' },
  { href: '/pricing', label: 'Pricing' },
];

const FAQS = [
  { question: 'Is InterviewEra a real interview simulation or a chatbot?', answer: 'It is a structured interview simulation. Questions are generated from your resume and sequenced like a real panel, and the interviewer asks adaptive follow-up questions that react to your answers — it does not just trade messages like an open-ended chatbot.' },
  { question: 'Do I need to type my answers?', answer: 'No. InterviewEra is voice-first — you speak your answers out loud the way you would in a real interview, with live captions running alongside so you can stay on track.' },
  { question: 'What if I get nervous and switch to Hindi?', answer: 'The interviewer understands Hinglish, so you can slip into Hindi when you are nervous and it will still follow you. To keep the simulation realistic, the interviewer continues responding in professional English.' },
  { question: 'How are my answers scored?', answer: 'Every answer is scored across five weighted dimensions — communication clarity, technical depth, answer structure, confidence, and relevance — using the same rubric in every session, with specific feedback on what to improve.' },
] as const;

// ── Small presentational helpers ──────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em]"
      style={{ color: 'var(--accent-hover)' }}
    >
      {children}
    </span>
  );
}

const cardShell = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 82%, transparent)',
} as const;

export default function HowItWorksPage() {
  const howToLd = howToJsonLd(
    'How InterviewEra works',
    PAGE_DESCRIPTION,
    JOURNEY_STEPS.map((s) => ({ name: s.title, text: s.body })),
  );
  const faqLd = faqPageJsonLd([...FAQS]);
  const webPageLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'How InterviewEra Works',
    description: PAGE_DESCRIPTION,
    url: `${siteConfig.url}${PAGE_PATH}`,
    inLanguage: 'en-IN',
    isPartOf: { '@id': `${siteConfig.url}#website` },
    about: { '@id': schemaIds.organization },
  } as const;

  return (
    <main id="main-content" style={{ color: 'var(--text-primary)' }}>
      {/* ── HERO ── */}
      <section className="relative overflow-hidden px-5 pt-16 pb-14 sm:pt-20 sm:pb-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(var(--card-border) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 15%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 0%, black 15%, transparent 75%)',
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Eyebrow>
            <Sparkles className="size-3.5" aria-hidden />
            How it works
          </Eyebrow>
          <h1
            className="mt-5 text-balance text-[2.1rem] font-extrabold leading-[1.05] tracking-tight sm:text-5xl"
            style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
          >
            The interview,{' '}
            <span className="v3-hero-gradient-text" style={{ fontStyle: 'normal' }}>
              before the interview.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            InterviewEra runs a realistic, voice-based mock interview built from your resume — with
            adaptive follow-up questions, live captions, and rubric-based scoring on every answer.
            Structured practice that feels real, with progress you can measure.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--accent-primary)', boxShadow: '0 10px 28px color-mix(in srgb, var(--accent-primary) 32%, transparent)' }}
            >
              Run your first scored mock
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="#journey"
              className="inline-flex items-center gap-2 rounded-xl border-2 px-7 py-3.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-primary)' }}
            >
              See the full journey
            </Link>
          </div>
          <p className="mt-4 text-xs font-medium tracking-wide" style={{ color: 'var(--text-muted)' }}>
            Free to start · no credit card · built for Indian campus placements
          </p>
        </div>

        {/* Quick differentiators */}
        <div className="relative mx-auto mt-14 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {QUICK_FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border-2 p-5" style={cardShell}>
              <span
                className="flex size-10 items-center justify-center rounded-xl"
                style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' }}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-[15px] font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── JOURNEY ── */}
      <section id="journey" className="px-5 py-16 sm:py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>The interview journey</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            From resume to measurable progress
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Seven steps, one continuous session. Each one is designed to feel like the real thing —
            and to leave you with something you can act on.
          </p>
        </div>

        <ol className="relative mx-auto mt-12 max-w-3xl list-none space-y-4 p-0">
          {/* vertical rail */}
          <span
            aria-hidden
            className="absolute left-6.75 top-2 bottom-2 hidden w-px sm:block"
            style={{ background: 'linear-gradient(var(--accent-primary), transparent)' }}
          />
          {JOURNEY_STEPS.map(({ tag, icon: Icon, title, body }, i) => (
            <li key={tag} className="relative flex gap-5 rounded-2xl border-2 p-5 sm:p-6" style={cardShell}>
              <div className="flex flex-col items-center">
                <span
                  className="flex size-14 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                    color: 'var(--accent-primary)',
                    border: '2px solid color-mix(in srgb, var(--accent-primary) 22%, transparent)',
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-4" style={{ color: 'var(--accent-hover)' }} aria-hidden />
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                    {tag}
                  </span>
                </div>
                <h3 className="mt-1.5 text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                  {body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── DYNAMIC FOLLOW-UPS ── */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto grid max-w-5xl items-start gap-10 lg:grid-cols-2 lg:gap-14">
          <div>
            <Eyebrow>Adaptive simulation</Eyebrow>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
              It does not read from a script
            </h2>
            <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A real interviewer reacts to what you just said. So does InterviewEra. It listens to each
              answer and decides what to ask next — pushing for depth, pinning down vague claims, and
              testing the statements you cannot yet back up.
            </p>
            <ul className="mt-7 space-y-4 p-0">
              {FOLLOWUP_TYPES.map(({ title, body }) => (
                <li key={title} className="flex gap-3">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                  <span>
                    <strong className="font-semibold">{title}.</strong>{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dialogue mock */}
          <div className="rounded-3xl border-2 p-5 sm:p-6" style={cardShell}>
            <div className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              <MessagesSquare className="size-4" aria-hidden />
              Live session · sample
            </div>
            <div className="space-y-3">
              {FOLLOWUP_DIALOGUE.map((turn, i) => {
                const isInterviewer = turn.who === 'interviewer';
                return (
                  <div key={i} className={isInterviewer ? 'flex flex-col items-start' : 'flex flex-col items-end'}>
                    <span className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: isInterviewer ? 'var(--accent-hover)' : 'var(--text-muted)' }}>
                      {turn.label}
                    </span>
                    <p
                      className="max-w-[88%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed"
                      style={
                        isInterviewer
                          ? { background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--text-primary)', borderTopLeftRadius: 4 }
                          : { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderTopRightRadius: 4 }
                      }
                    >
                      {turn.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── CONFIDENCE PROGRESSION ── */}
      <section className="px-5 py-16 sm:py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Confidence progression</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Start gentle. Build pressure on your terms.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Interview anxiety is real, especially for a first placement season. The path is built to
            move you from hesitant to composed — one voice session at a time, never thrown in the deep end.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {CONFIDENCE_STAGES.map(({ step, title, body }) => (
            <div key={step} className="rounded-2xl border-2 p-6" style={cardShell}>
              <span className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-hover)' }}>
                {step}
              </span>
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SCORING ── */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Real-time feedback &amp; scoring</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            A score, not a feeling
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Every answer is measured against the same five weighted dimensions — the things a panel
            actually evaluates. You get a number and the specific gaps behind it.
          </p>
        </div>
        <div className="mx-auto mt-12 max-w-3xl overflow-hidden rounded-2xl border-2" style={cardShell}>
          {SCORING_DIMENSIONS.map((d, i) => (
            <div
              key={d.name}
              className="flex items-start gap-4 p-5 sm:p-6"
              style={{ borderTop: i === 0 ? 'none' : '1px solid var(--card-border)' }}
            >
              <span
                className="mt-0.5 inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1 font-mono text-xs font-bold"
                style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-hover)' }}
              >
                {d.weight}
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold">{d.name}</h3>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {d.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-4 max-w-3xl text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Same rubric every session · consistent across all roles · no mood scoring
        </p>
      </section>

      {/* ── WHY IT FEELS REAL ── */}
      <section className="px-5 py-16 sm:py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Why it feels real</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Closer to a real interview
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Most prep tools sit at one of two extremes. InterviewEra is built to sit where a real
            interview does — structured, reactive, and measured.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
          {COMPARISON.map((col) => {
            const isUs = col.kind === 'us';
            return (
              <div
                key={col.label}
                className="rounded-2xl border-2 p-6"
                style={
                  isUs
                    ? { borderColor: 'color-mix(in srgb, var(--accent-primary) 45%, transparent)', background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)' }
                    : cardShell
                }
              >
                <h3 className="text-base font-bold" style={isUs ? { color: 'var(--accent-primary)' } : undefined}>
                  {col.label}
                </h3>
                <ul className="mt-4 space-y-2.5 p-0">
                  {col.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {isUs ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
                      ) : (
                        <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: 'var(--text-muted)' }} />
                      )}
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── IMPROVEMENT LOOP ── */}
      <section className="px-5 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>The improvement loop</Eyebrow>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Practice that compounds
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            One good answer is luck. A repeatable loop is preparation. This is the cycle that turns a
            weak first attempt into a composed, scoreable one.
          </p>
        </div>
        <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {LOOP.map(({ icon: Icon, title, body }, i) => (
            <div key={title} className="relative rounded-2xl border-2 p-6" style={cardShell}>
              <div className="flex items-center justify-between">
                <span
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)', color: 'var(--accent-primary)' }}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="font-mono text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
                  0{i + 1}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="px-5 py-20" style={{ background: 'var(--v3-cta-bg)', borderTop: '1px solid var(--v3-cta-brd)' }}>
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="inline-block rounded-full border px-4 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--v3-accbrd)', background: 'var(--v3-accdim)', color: 'var(--accent-hover)' }}
          >
            Free to start — no card required
          </div>
          <h2 className="mt-5 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl" style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            Practice the interview before it counts
          </h2>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Upload your resume, run a realistic scored mock, and leave knowing exactly what to tighten —
            measurable confidence, built one session at a time.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--accent-primary)', boxShadow: '0 10px 28px color-mix(in srgb, var(--accent-primary) 32%, transparent)' }}
            >
              Run your first scored mock
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border-2 px-7 py-3.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--v3-cta-brd)', color: 'var(--text-primary)' }}
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <SeoCrossLinksSection heading="Explore InterviewEra" links={EXPLORE_LINKS} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </main>
  );
}
