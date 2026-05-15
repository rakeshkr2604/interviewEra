import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import { HrAnswerFlowDiagram, HrAnswerQualityRadar } from '@/components/blog/visualizations/BlogDynamicCharts';

import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { articleJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';

const HR_META_TITLE = 'HR Interview Answer Tips & Tricks (With Framework Visuals)';
const HR_CANONICAL_PATH = '/blog/hr-interview-answer-tips-and-tricks';
const HR_DATE = '2026-05-01';
const ORIGIN = getCanonicalSiteOrigin();

export const metadata: Metadata = generateMetadata({
  title: HR_META_TITLE,
  description:
    'Answer HR and managerial round questions with structure: radar model for answer quality, step-by-step delivery flow, and traps to avoid.',
  path: HR_CANONICAL_PATH,
  socialTitle: brandArticleOgTitle(HR_META_TITLE),
  keywords:
    'HR interview tips, HR round preparation India, tell me about yourself, behavioral interview HR, campus placement HR',
  openGraphType: 'article',
});

const HR_ARTICLE_LD = articleJsonLd({
  headline: HR_META_TITLE,
  description: 'Answer HR and managerial round questions with structure: radar model for answer quality, step-by-step delivery flow, and traps to avoid.',
  canonicalUrl: canonicalUrl(HR_CANONICAL_PATH),
  datePublished: HR_DATE,
  authorName: 'InterviewEra Team',
  publisherId: schemaIds.organization,
});

const HR_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'HR Interview Tips', path: HR_CANONICAL_PATH },
  ],
  ORIGIN,
);

const SECTION_IDS = [
  ['#why-hr', 'Why HR filters strong candidates'],
  ['#answer-shape', 'What “good” looks like (radar)'],
  ['#delivery-flow', 'Answer delivery flow (diagram)'],
  ['#templates', 'High-leverage templates'],
  ['#traps', 'Traps that fail the round'],
  ['#questions', 'Questions you should rehearse'],
] as const;

export default function HrInterviewAnswerTipsPage() {
  return (
    <>
      <JsonLdScript id="hr-article-ld" data={HR_ARTICLE_LD} />
      <JsonLdScript id="hr-breadcrumb-ld" data={HR_BREADCRUMB_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
      <article className="ie-blog-prose mx-auto w-full max-w-3xl xl:max-w-[48rem] 2xl:max-w-[52rem]">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            HR & managerial rounds
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
            HR interview answer tips & tricks
          </h1>
          <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            HR rounds reward <strong>signal density</strong>: clear structure, concrete examples, honest reflection, and
            calm delivery. Below are two visual frameworks — a radar comparing weak vs strong answers, and a step flow you
            can memorize for any behavioral or situational prompt.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>11 min read</span>
            <span aria-hidden>·</span>
            <span>Updated April 2026</span>
          </div>
        </header>

        <nav className="ie-blog-card mb-10 p-5 sm:mb-12 sm:p-6" aria-label="Jump to section">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            Jump to section
          </p>
          <ul className="m-0 list-none space-y-2 p-0 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {SECTION_IDS.map(([href, label]) => (
              <li key={href}>
                <a href={href} className="ie-blog-inline-link font-medium">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <h2 id="why-hr">Why HR filters strong technical candidates</h2>
        <p>
          Companies use HR / managerial rounds to test <strong>reliability under ambiguity</strong>, communication,
          self-awareness, and values fit. A vague or defensive answer reads as risk — even if your DSA rounds were
          perfect.
        </p>

        <h2 id="answer-shape">What “good” looks like (radar)</h2>
        <p>
          The radar compares two abstract profiles: a <strong>generic</strong> answer (filler, buzzwords, no metrics) vs a{' '}
          <strong>target</strong> answer after applying the tips on this page. Real interviews are multidimensional; use
          this as a self-checklist before you record yourself or join a mock.
        </p>

        <figure
          className="ie-blog-card my-8 overflow-hidden p-4 sm:my-10 sm:p-6"
          style={{ marginLeft: 0, marginRight: 0 }}
        >
          <figcaption className="mb-1 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            Answer quality dimensions (illustrative scores 1–10)
          </figcaption>
          <p className="mb-4 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Generic = vague or template-heavy; Target = structured, specific, honest, and confidently delivered.
          </p>
          <div className="mx-auto h-[min(22rem,65vh)] w-full max-w-md sm:h-[20rem] lg:max-w-lg">
            <HrAnswerQualityRadar />
          </div>
        </figure>

        <ul>
          <li>
            <strong>Clarity:</strong> First sentence states your point; no 90-second warm-up.
          </li>
          <li>
            <strong>Structure:</strong> STAR (or situation → action → outcome) for experience questions.
          </li>
          <li>
            <strong>Specificity:</strong> Numbers, timelines, tools, stakeholders — one concrete detail beats five adjectives.
          </li>
          <li>
            <strong>Honesty:</strong> Credible failures and trade-offs beat polished fiction.
          </li>
          <li>
            <strong>Confidence:</strong> Measured pace; it’s fine to pause — it’s not fine to ramble.
          </li>
        </ul>

        <h2 id="delivery-flow">Answer delivery flow (diagram)</h2>
        <p>
          For almost any open-ended HR question, run this <strong>six-step pipeline</strong>. On mobile you’ll see a
          vertical timeline; on larger screens it reads left-to-right like a pipeline.
        </p>

        <figure
          className="ie-blog-card my-8 overflow-hidden p-4 sm:my-10 sm:p-6"
          style={{ marginLeft: 0, marginRight: 0 }}
        >
          <figcaption className="mb-4 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            From question to confident close
          </figcaption>
          <HrAnswerFlowDiagram />
        </figure>

        <h2 id="templates">High-leverage templates</h2>
        <h3>“Tell me about yourself” (90 seconds)</h3>
        <p>
          <strong>Present</strong> (one line who you are) → <strong>Past</strong> (2 bullets: education + strongest
          project/intern) → <strong>Future</strong> (what you want from this role + why this company). End with a hook:
          “Happy to go deeper on X or Y.”
        </p>
        <h3>“Why should we hire you?”</h3>
        <p>
          Three bullets: (1) skill match with proof, (2) one behavioral strength with mini-story, (3) how you’ll ramp in
          the first 90 days. Tie each bullet to something they care about from the JD or their product.
        </p>
        <h3>“What is your weakness?”</h3>
        <p>
          Pick a <strong>real</strong> skill gap, show <strong>awareness</strong>, show <strong>corrective action</strong>{' '}
          you already took, end with <strong>current progress</strong>. Never humble-brag (“I work too hard”).
        </p>

        <h2 id="traps">Traps that fail the round</h2>
        <ol>
          <li>
            <strong>Salary too early.</strong> Defer until they show intent unless they force the topic — then give a
            researched range.
          </li>
          <li>
            <strong>Bad-mouthing past managers or professors.</strong> Describe constraints neutrally; own your part.
          </li>
          <li>
            <strong>One-word answers</strong> to “Any questions for us?” — prepare 2 thoughtful questions about team,
            success metrics, or onboarding.
          </li>
          <li>
            <strong>Inconsistent story</strong> vs resume — rehearse every bullet on your CV aloud.
          </li>
        </ol>

        <h2 id="questions">Questions you should rehearse out loud</h2>
        <ul>
          <li>Why this role / company / location?</li>
          <li>Describe a conflict and how you resolved it.</li>
          <li>Tell me about a time you failed.</li>
          <li>How do you prioritize under multiple deadlines?</li>
          <li>Where do you see yourself in 3–5 years?</li>
        </ul>
        <p>
          Draft STAR bullets in our free{' '}
          <Link href="/tools/star-builder" className="ie-blog-inline-link">
            STAR answer builder
          </Link>{' '}
          — then practice speaking, not just typing.
        </p>

        <div className="mt-12 sm:mt-16">
          <FreeToolCtaBlock
            title="Practice HR + technical in one loop"
            body="Resume-aware mock interviews with feedback on clarity and structure — not generic question lists."
            href="/signup"
            ctaLabel="Start free practice"
          />
        </div>
      </article>
    </BlogMarketingShell>
    </>
  );
}
