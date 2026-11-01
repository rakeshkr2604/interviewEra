import type { ReactNode } from 'react';
import { ArrowRight, Check, FileSearch, ListChecks, Mic2, MessageSquareQuote, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { Reveal } from '@/components/landing/landing-home-shared';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import {
  HOME_FREE_TOOLS,
  HOME_FREE_TOOLS_NOTE,
  HOME_MOCK_INTERVIEW_CARD,
  type HomeFreeTool,
  type HomeFreeToolId,
} from '@/lib/landing/home-content';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { LANDING_SAMPLE_SESSION_LABEL } from '@/lib/landing/demo-disclosure';
import { cn } from '@/lib/utils';
import '@/components/landing/LandingHomeSections.css';

const TOOL_ICONS: Record<HomeFreeToolId, LucideIcon> = {
  'ats-checker': FileSearch,
  'question-generator': ListChecks,
  'star-builder': MessageSquareQuote,
  'prompt-builder': Sparkles,
};

/* ── Static previews: plain HTML, illustrative content only (no tool code is loaded). ── */

function SampleTag() {
  return <span className="ie-bento-preview__tag">Sample</span>;
}

function AtsPreview() {
  const rows = [
    { label: 'Parseability', value: 86 },
    { label: 'Structure', value: 74 },
    { label: 'Impact wording', value: 61 },
  ];
  return (
    <div className="ie-bento-preview ie-bento-preview--ats" aria-hidden>
      <SampleTag />
      <div className="ie-bento-ats__score">
        <span className="ie-bento-ats__value">74</span>
        <span className="ie-bento-ats__outof">/ 100</span>
      </div>
      <ul className="ie-bento-ats__bars">
        {rows.map((row) => (
          <li key={row.label}>
            <span>{row.label}</span>
            <span className="ie-bento-ats__track">
              <span className="ie-bento-ats__fill" style={{ width: `${row.value}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function QuestionPreview() {
  const questions = [
    'Walk me through a project you are proud of.',
    'How would you debug a slow API endpoint?',
    'Tell me about a disagreement in your team.',
  ];
  return (
    <div className="ie-bento-preview" aria-hidden>
      <SampleTag />
      <p className="ie-bento-preview__meta">Frontend Developer · Fresher</p>
      <ol className="ie-bento-questions">
        {questions.map((q, i) => (
          <li key={q}>
            <span className="ie-bento-questions__num">Q{i + 1}</span>
            <span>{q}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function StarPreview() {
  const blocks = [
    { key: 'S', label: 'Situation', text: 'Payment API failing two days before demo' },
    { key: 'T', label: 'Task', text: 'I owned backend debugging' },
    { key: 'A', label: 'Action', text: 'Traced a retry race, added idempotent keys' },
    { key: 'R', label: 'Result', text: 'Demo ran with zero failed payments' },
  ];
  return (
    <div className="ie-bento-preview" aria-hidden>
      <SampleTag />
      <ul className="ie-bento-star">
        {blocks.map((b) => (
          <li key={b.key} className={`ie-bento-star__block ie-bento-star__block--${b.key.toLowerCase()}`}>
            <span className="ie-bento-star__key">{b.key}</span>
            <span className="min-w-0">
              <span className="ie-bento-star__label">{b.label}</span>
              <span className="ie-bento-star__text">{b.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PromptPreview() {
  return (
    <div className="ie-bento-preview ie-bento-preview--prompt" aria-hidden>
      <SampleTag />
      <p className="ie-bento-prompt__line">
        <span className="ie-bento-prompt__key">Role</span> Data Analyst intern
      </p>
      <p className="ie-bento-prompt__line">
        <span className="ie-bento-prompt__key">Focus</span> SQL · case questions
      </p>
      <p className="ie-bento-prompt__line ie-bento-prompt__line--muted">
        Act as my interviewer. Ask one question at a time and wait for my answer…
        <span className="ie-bento-prompt__caret" />
      </p>
    </div>
  );
}

const TOOL_PREVIEWS: Record<HomeFreeToolId, () => ReactNode> = {
  'ats-checker': AtsPreview,
  'question-generator': QuestionPreview,
  'star-builder': StarPreview,
  'prompt-builder': PromptPreview,
};

function ToolCard({ tool, index }: { tool: HomeFreeTool; index: number }) {
  const Icon = TOOL_ICONS[tool.id];
  const Preview = TOOL_PREVIEWS[tool.id];
  return (
    <Reveal delay={0.06 + index * 0.06} className={cn('ie-bento-cell', `ie-bento-cell--${tool.id}`)}>
      <article className="ie-bento-card" aria-labelledby={`bento-${tool.id}-title`}>
        <div className="ie-bento-card__head">
          <span className="ie-bento-card__icon" aria-hidden>
            <Icon className="size-[1.1rem]" strokeWidth={1.9} />
          </span>
          <p className="ie-bento-card__name">{tool.name}</p>
        </div>
        <h3 id={`bento-${tool.id}-title`} className="ie-bento-card__headline">
          {tool.headline}
        </h3>
        <Preview />
        <ul className="ie-bento-card__points">
          {tool.points.map((point) => (
            <li key={point}>
              <Check className="ie-bento-card__check size-3.5" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <p className="ie-bento-card__free">{HOME_FREE_TOOLS_NOTE.badge}</p>
        <TrackedCtaLink
          href={tool.href}
          ctaKey={CTA_KEYS.HOME_TOOL_CARD}
          ctaText={tool.cta}
          section={`home_tool_${tool.id.replace(/-/g, '_')}`}
          className="ie-bento-card__cta ie-focus-visible"
        >
          {tool.cta}
          <ArrowRight className="ie-bento-card__arrow size-4" aria-hidden />
        </TrackedCtaLink>
      </article>
    </Reveal>
  );
}

function MockInterviewCard() {
  return (
    <Reveal className="ie-bento-cell ie-bento-cell--mock">
      <article className="ie-bento-card ie-bento-card--mock" aria-labelledby="bento-mock-title">
        <div className="ie-bento-mock-copy">
          <div className="ie-bento-card__head">
            <span className="ie-bento-card__icon ie-bento-card__icon--mock" aria-hidden>
              <Mic2 className="size-[1.1rem]" strokeWidth={1.9} />
            </span>
            <p className="ie-bento-card__name">{HOME_MOCK_INTERVIEW_CARD.name}</p>
            <span className="ie-bento-card__credits">Uses 1 credit per session</span>
          </div>
          <h3 id="bento-mock-title" className="ie-bento-card__headline ie-bento-card__headline--lg">
            {HOME_MOCK_INTERVIEW_CARD.headline}
          </h3>
          <ul className="ie-bento-card__points">
            {HOME_MOCK_INTERVIEW_CARD.points.map((point) => (
              <li key={point}>
                <Check className="ie-bento-card__check size-3.5" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <TrackedCtaLink
            href="/signup"
            ctaKey={CTA_KEYS.START_MOCK_INTERVIEW}
            ctaText={HOME_MOCK_INTERVIEW_CARD.cta}
            section="home_tool_mock_interview"
            className="v3-btn-primary ie-bento-card__cta-primary"
          >
            {HOME_MOCK_INTERVIEW_CARD.cta}
            <ArrowRight className="size-4" aria-hidden />
          </TrackedCtaLink>
        </div>

        <div className="ie-bento-mock" aria-hidden>
          <span className="ie-bento-preview__tag">{LANDING_SAMPLE_SESSION_LABEL}</span>
          <picture className="ie-bento-mock__avatar">
            <source
              type="image/avif"
              srcSet="/assets/female-avatar-300.avif 300w, /assets/female-avatar-600.avif 600w"
              sizes="160px"
            />
            <img
              src="/assets/female-avatar-300.webp"
              alt=""
              width={150}
              height={200}
              loading="lazy"
              decoding="async"
            />
          </picture>
          <div className="ie-bento-mock__panel">
            <p className="ie-bento-mock__label">Follow-up · from your answer</p>
            <p className="ie-bento-mock__question">
              “You said messages duplicated on reconnect — how does your fix behave with two tabs open?”
            </p>
            <div className="ie-bento-mock__wave">
              {Array.from({ length: 18 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${(i % 6) * 0.12}s` }} />
              ))}
            </div>
            <ul className="ie-bento-mock__dims">
              {[
                ['Clarity', 7.4],
                ['Accuracy', 7.6],
                ['Structure', 8.3],
                ['Specificity', 7.4],
                ['Relevance', 7.5],
              ].map(([label, value]) => (
                <li key={label as string}>
                  <span>{label}</span>
                  <span className="tabular-nums">{(value as number).toFixed(1)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </article>
    </Reveal>
  );
}

/**
 * Homepage Bento — four free preparation tools + the core mock-interview product.
 * Server-rendered; previews are static HTML so no tool application ships on `/`.
 */
export function FreePreparationToolkit() {
  return (
    <section
      id="free-tools"
      className="landing-free-tools scroll-mt-20 px-4 py-16 sm:px-5 sm:py-20 lg:py-24"
      aria-labelledby="free-tools-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <Reveal className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>Product &amp; free toolkit</span>
          <h2 id="free-tools-heading" className={LANDING_HOME_HEADING}>
            Everything you need before the interview, in one place.
          </h2>
          <p className={LANDING_HOME_SUBHEAD}>
            Four free preparation tools and realistic AI mock interviews.{' '}
            {HOME_FREE_TOOLS_NOTE.detail}
          </p>
        </Reveal>

        <div className="ie-bento mx-auto mt-10 max-w-[70rem] sm:mt-12">
          <MockInterviewCard />
          {HOME_FREE_TOOLS.map((tool, index) => (
            <ToolCard key={tool.id} tool={tool} index={index} />
          ))}
        </div>

        <p className="ie-bento-footnote">
          Previews show illustrative sample content. Tool pages are public to read; running a tool needs a
          free, verified account.
        </p>
      </div>
    </section>
  );
}
