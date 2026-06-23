import Link from 'next/link';
import Image from 'next/image';
import { BlogEditorialFaq } from '@/components/blog/BlogEditorialHeader';
import { BlogSignupCta } from '@/components/blog/BlogSignupCta';
import {
  AgenticGeoLead,
  AgenticHubTable,
  AgenticQuestionCard,
  AgenticStatusBadge,
} from '@/components/blog/agentic/AgenticHubTables';
import { AgenticHubExecutiveSummary } from '@/components/blog/agentic/AgenticHubExecutiveSummary';
import { AGENTIC_CLUSTER_MVP_PAGES, AGENTIC_PILLAR_PATH } from '@/lib/seo/blog/agentic-cluster-mvp';
import { AgenticHubHero } from '@/components/blog/agentic/AgenticHubHero';
import { AgenticHubMistakesAccordion } from '@/components/blog/agentic/AgenticHubMistakesAccordion';
import { AgenticHubPartDivider } from '@/components/blog/agentic/AgenticHubPartDivider';
import { AgenticHubPromptBlock } from '@/components/blog/agentic/AgenticHubPromptBlock';
import { AgenticHubQuiz } from '@/components/blog/agentic/AgenticHubQuiz';
import { AgenticHubReadingShell } from '@/components/blog/agentic/AgenticHubReadingShell';
import { AgenticHubSection } from '@/components/blog/agentic/AgenticHubSection';
import { AgenticHubCallout, AgenticHubCompareCards } from '@/components/blog/agentic/AgenticHubVisualBreak';
import { AgenticInterviewFlow } from '@/components/blog/visualizations/AgenticInterviewFlow';
import { AgenticInterviewTimeline } from '@/components/blog/visualizations/AgenticInterviewTimeline';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import {
  AGENTIC_CONTEXTUAL_LINKS,
  AGENTIC_EDITORIAL_NOTE,
  AGENTIC_FUTURE_SKILLS,
  AGENTIC_GEO_LEADS,
  AGENTIC_HERO_ALT,
  AGENTIC_HERO_PATH,
  AGENTIC_H1_LINE,
  AGENTIC_H1_ACCENT,
  AGENTIC_LAST_UPDATED,
  AGENTIC_MINDSET_ALT,
  AGENTIC_MINDSET_PATH,
  AGENTIC_MISCONCEPTIONS,
  AGENTIC_REVIEWED_DATE,
  AGENTIC_AUTHOR_NAME,
  AGENTIC_REVIEWER_NAME,
  AGENTIC_ROADMAP_ALT,
  AGENTIC_ROADMAP_HEIGHT,
  AGENTIC_ROADMAP_PATH,
  AGENTIC_ROADMAP_WIDTH,
  AGENTIC_SENIOR_SCENARIOS,
  AGENTIC_TRADITIONAL_VS_AGENTIC,
  AGENTIC_UPDATED_LABEL,
} from '@/lib/seo/blog/agentic-ai-hub';
import {
  AGENTIC_CHAPTER_META_LABEL,
  getAgenticChapterById,
} from '@/lib/seo/blog/agentic-ai-hub-chapters';
import { AGENTIC_FAQ_ITEMS } from '@/lib/seo/blog/agentic-ai-hub-faq';
import { AGENTIC_INTERVIEW_FORMATS } from '@/lib/seo/blog/agentic-ai-hub-formats';
import {
  AGENTIC_INDIA_ADOPTION,
  AGENTIC_INDIA_CONFIRMED_FACTS,
  AGENTIC_INDIA_PROJECTIONS,
  AGENTIC_INDIA_WHY_ADOPT,
} from '@/lib/seo/blog/agentic-ai-hub-india';
import { AGENTIC_COMMON_MISTAKES } from '@/lib/seo/blog/agentic-ai-hub-mistakes';
import {
  AGENTIC_INTERVIEW_QUESTIONS,
  AGENTIC_QUESTION_CATEGORIES,
} from '@/lib/seo/blog/agentic-ai-hub-questions';
import { AGENTIC_PREP_ROADMAPS, AGENTIC_PRACTICE_LOOP_STEPS } from '@/lib/seo/blog/agentic-ai-hub-roadmaps';
import {
  AGENTIC_RUBRIC_DIMENSIONS,
  AGENTIC_SAMPLE_SCORECARDS,
} from '@/lib/seo/blog/agentic-ai-hub-rubric';
import {
  AGENTIC_60_MIN_WORKFLOW,
  AGENTIC_BAD_PROMPT_SAMPLE,
  AGENTIC_BAD_VS_EXCELLENT,
  AGENTIC_EXCELLENT_PROMPT_SAMPLE,
  AGENTIC_SIMULATION_TASK,
} from '@/lib/seo/blog/agentic-ai-hub-simulation';
import { AGENTIC_PARTS } from '@/lib/seo/blog/agentic-ai-hub-parts';
import {
  AGENTIC_PROMPT_CLARIFICATION,
  AGENTIC_PROMPT_DEBUG,
  AGENTIC_PROMPT_REVIEW,
} from '@/lib/seo/blog/agentic-ai-hub-prompts';
import { AGENTIC_PART_QUIZZES } from '@/lib/seo/blog/agentic-ai-hub-quizzes';
import { AGENTIC_SKILLS_EVALUATED } from '@/lib/seo/blog/agentic-ai-hub-skills';
import { agenticPastelCardClass } from '@/lib/seo/blog/agentic-pastel';

function Ch({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const chapter = getAgenticChapterById(id)!;
  return (
    <AgenticHubSection
      id={id}
      title={title}
      readTime={chapter.readTime}
      takeaways={chapter.takeaways}
    >
      {children}
    </AgenticHubSection>
  );
}

export function AgenticAiHubArticle() {
  return (
    <article className="ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-blog-prose--agentic-hub mx-auto w-full min-w-0">
      <AgenticHubHero
        category="AI-assisted interviews"
        titleLine={AGENTIC_H1_LINE}
        titleAccent={AGENTIC_H1_ACCENT}
        metaLine={AGENTIC_CHAPTER_META_LABEL}
        updatedLabel={AGENTIC_UPDATED_LABEL}
        heroSrc={AGENTIC_HERO_PATH}
        heroAlt={AGENTIC_HERO_ALT}
      />

      <AgenticHubExecutiveSummary />

      <aside className="ie-agentic-hub-about-card ie-agentic-pastel-card ie-agentic-pastel-card--mint p-4" aria-label="Focused guides in this series">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          Agentic AI series
        </p>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          New to agentic interviews? Start with a focused guide, then return here for the full rubric and roadmaps.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {AGENTIC_CLUSTER_MVP_PAGES.filter((p) => p.path !== AGENTIC_PILLAR_PATH).map((page) => (
            <Link key={page.path} href={page.path} className="ie-agentic-pastel-link-card text-sm">
              {page.label} →
            </Link>
          ))}
        </div>
      </aside>

      <aside className="ie-agentic-hub-about-card ie-agentic-pastel-card ie-agentic-pastel-card--lavender p-4" aria-label="Article metadata">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          About this guide
        </p>
        <dl className="mt-2 space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <div className="flex flex-wrap gap-x-1">
            <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Author:</dt>
            <dd className="m-0">{AGENTIC_AUTHOR_NAME}</dd>
          </div>
          <div className="flex flex-wrap gap-x-1">
            <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
            <dd className="m-0">{AGENTIC_REVIEWER_NAME}</dd>
          </div>
          <div className="flex flex-wrap gap-x-1">
            <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
            <dd className="m-0">{AGENTIC_LAST_UPDATED}</dd>
          </div>
          <div className="flex flex-wrap gap-x-1">
            <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
            <dd className="m-0">{AGENTIC_REVIEWED_DATE}</dd>
          </div>
        </dl>
        <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
          {AGENTIC_EDITORIAL_NOTE}
        </p>
      </aside>

      <AgenticHubReadingShell>
        <p>
          A few years ago, interviewers wanted to know whether you could write code without Google. Today, some of the
          world&apos;s fastest-growing AI companies hand you <strong>Cursor</strong>, <strong>Claude</strong>, or{' '}
          <strong>ChatGPT</strong> on day one — and judge how effectively you <em>collaborate</em> with AI instead.
        </p>
        <p>
          That shift produced the <strong>agentic AI interview round</strong>: not a trick question about algorithms
          memorized at 2 a.m., but a realistic slice of modern engineering where you clarify requirements, plan,
          delegate, verify, test, and own the outcome. This guide is InterviewEra&apos;s flagship hub for candidates,
          recruiters, engineering managers, and students preparing for that new bar — from first principles through
          rubrics, India-specific trends, and daily prep roadmaps.
        </p>

        <AgenticHubPartDivider part={AGENTIC_PARTS[0]!} partIndex={0} />

        <Ch id="what-is-agentic-ai-interview" title="What is an Agentic AI Interview Round?">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.whatIs}</AgenticGeoLead>
          <p>
            Traditional coding interviews optimized for a world where IDEs were offline and Stack Overflow was taboo.
            Agentic AI rounds optimize for 2026: engineers ship features with AI agents in the loop, and companies need
            to know you will not ship hallucinated garbage to production.
          </p>
          <p>
            The round is still a <strong>technical interview</strong>. You may build an API, fix a bug, or extend a
            frontend — but permitted AI tools are part of the environment. Interviewers watch <em>how</em> you work,
            not whether you can outperform a language model on raw typing speed.
          </p>
          <p>
            <strong>AI-assisted coding</strong> is using autocomplete or a single suggestion.{' '}
            <strong>AI dependency</strong> is accepting output you cannot explain or test.{' '}
            <strong>Agentic collaboration</strong> sits between: you orchestrate multi-step work, iterate on prompts,
            review diffs, and remain accountable.
          </p>
          <AgenticHubTable
            wide
            caption="Traditional coding interview vs agentic AI interview"
            headers={['Dimension', 'Traditional', 'Agentic AI']}
            rows={AGENTIC_TRADITIONAL_VS_AGENTIC}
          />
        </Ch>

        <Ch id="why-companies-adopt" title="Why Companies Are Introducing Agentic AI Rounds">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.whyCompanies}</AgenticGeoLead>
          <AgenticHubCallout variant="insight" title="The signal companies actually want">
            <p>
              A backend bug returning 500 on null fields separates juniors who paste AI fixes from seniors who ask which
              layer validates, add a regression test, and log structured errors — using AI only for boilerplate.
            </p>
          </AgenticHubCallout>
          <p>
            Three forces converged. First, <strong>tool adoption</strong>: Copilot, Cursor, and Claude Code are line
            items on engineering budgets. Second, <strong>productivity</strong>: teams that collaborate well with AI
            ship faster. Third, <strong>hiring signal</strong>: coding speed alone no longer separates strong seniors
            from weak hires — judgment does.
          </p>
          <ul>
            <li>
              <strong>Real workflows:</strong> Pairing with AI mirrors daily delivery more than isolated LeetCode.
            </li>
            <li>
              <strong>Senior vs junior thinking:</strong> Juniors prompt; seniors direct, review, and cut scope.
            </li>
            <li>
              <strong>Engineering judgment:</strong> Trade-offs, security, and operability remain human-owned.
            </li>
          </ul>
        </Ch>

        <Ch id="interview-evolution-timeline" title="Evolution of Technical Interviews">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.evolution}</AgenticGeoLead>
          <p>
            Understanding the timeline explains why your seniors trained differently — and why your cohort needs agentic
            skills now, not after offer letter.
          </p>
          <AgenticInterviewTimeline />
        </Ch>

        <Ch id="what-agentic-means" title='What Does "Agentic" Actually Mean?'>
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.agenticMeaning}</AgenticGeoLead>
          <p>
            An <strong>AI agent</strong> can plan subtasks, call tools, read files, and propose multi-file changes. That
            is qualitatively different from tab-completion. <strong>Human oversight</strong> means you validate each step
            against requirements and risk appetite. <strong>Decision ownership</strong> never transfers.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {AGENTIC_MISCONCEPTIONS.map((item, i) => (
              <div key={item.myth} className={agenticPastelCardClass(i)}>
                <p className="ie-agentic-pastel-card__title">Myth: {item.myth}</p>
                <p className="ie-agentic-pastel-card__body">Reality: {item.reality}</p>
              </div>
            ))}
          </div>
          <AgenticHubPromptBlock examples={AGENTIC_PROMPT_CLARIFICATION} />
        </Ch>

        {AGENTIC_PART_QUIZZES[0] ? <AgenticHubQuiz quiz={AGENTIC_PART_QUIZZES[0]} /> : null}

        <AgenticHubPartDivider part={AGENTIC_PARTS[1]!} partIndex={1} />

        <Ch id="how-it-works" title="How an Agentic AI Interview Works">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.howItWorks}</AgenticGeoLead>
          <p>
            Loops vary by company, but the macro flow is stable. You are evaluated continuously — not only on the final
            diff.
          </p>
          <AgenticInterviewFlow />
        </Ch>

        <Ch id="skills-evaluated" title="Skills Being Evaluated">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.skills}</AgenticGeoLead>
          <p>
            Interviewers use a multi-dimensional rubric (see Section 12). Below: what each skill means, strong vs weak
            signals, and what they write on the scorecard.
          </p>
          <AgenticHubTable
            wide
            caption="Skills evaluated in agentic AI rounds"
            headers={['Skill', 'Why it matters', 'Good signal', 'Bad signal']}
            rows={AGENTIC_SKILLS_EVALUATED.map((s) => [
              s.skill,
              s.whyItMatters,
              s.goodExample,
              s.badExample,
            ])}
          />
          <AgenticHubPromptBlock examples={AGENTIC_PROMPT_REVIEW} />
        </Ch>

        <Ch id="senior-engineer-mindset" title="Senior Engineer Mindset">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.mindset}</AgenticGeoLead>
          <p>
            The mental model that separates hires:{' '}
            <strong>You are the senior engineer. AI is your junior teammate.</strong> You delegate boilerplate; you
            never delegate accountability.
          </p>
          <figure className="ie-blog-card my-8 overflow-hidden p-2 sm:my-10" style={{ marginLeft: 0, marginRight: 0 }}>
            <Image
              src={AGENTIC_MINDSET_PATH}
              alt={AGENTIC_MINDSET_ALT}
              width={1200}
              height={800}
              className="h-auto w-full rounded-lg"
            />
          </figure>
          <div className="space-y-4">
            {AGENTIC_SENIOR_SCENARIOS.map((scenario, i) => (
              <div key={scenario.title} className={agenticPastelCardClass(i)}>
                <p className="ie-agentic-pastel-card__title">Scenario: {scenario.title}</p>
                <p className="ie-agentic-pastel-card__body">{scenario.response}</p>
              </div>
            ))}
          </div>
        </Ch>

        <Ch id="interview-formats" title="Common Agentic AI Interview Formats">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.formats}</AgenticGeoLead>
          <AgenticHubTable
            wide
            caption="Format expectations and AI tips"
            headers={['Format', 'Typical task', 'Interviewer expectations', 'AI collaboration tip']}
            rows={AGENTIC_INTERVIEW_FORMATS.map((f) => [f.format, f.task, f.expectations, f.aiTips])}
          />
        </Ch>

        <Ch id="sample-60-minute-workflow" title="Sample 60-Minute Interview Workflow">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.workflow}</AgenticGeoLead>
          <AgenticHubCallout variant="tip" title="Timebox discipline">
            <p>
              Strong candidates front-load clarification and planning. If you have not asked structured questions by
              minute 10, you are likely building the wrong thing.
            </p>
          </AgenticHubCallout>
          <p>
            Task: build a CRUD endpoint for internal tasks with validation. Below is how a strong candidate allocates
            time — with visible AI use at the right moments.
          </p>
          <AgenticHubTable
            wide
            caption="Minute-by-minute workflow (illustrative)"
            headers={['Time', 'Candidate', 'AI', 'Interviewer']}
            rows={AGENTIC_60_MIN_WORKFLOW.map((r) => [r.minute, r.candidate, r.aiAction, r.interviewer])}
          />
          <AgenticHubPromptBlock examples={AGENTIC_PROMPT_CLARIFICATION} />
          <div className="my-10 sm:my-12">
            <BlogSignupCta
              title="Run this 60-minute workflow under pressure"
              body="Pick a practical task, answer out loud, and get rubric-style feedback — the same dimensions interviewers score in agentic rounds."
              href="/signup"
              ctaLabel="Start free scored interview"
            />
          </div>
        </Ch>

        <Ch id="real-example-simulation" title="Real Example: Bad vs Excellent Candidate">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.simulation}</AgenticGeoLead>
          <p>
            <strong>Task:</strong> {AGENTIC_SIMULATION_TASK}
          </p>
          <AgenticHubCompareCards
            leftTitle="Weak approach"
            rightTitle="Strong approach"
            left={<p>Single vague prompt, no tests, cannot explain validation layer.</p>}
            right={<p>Structured prompts per layer, edge-case tests, owns trade-offs in discussion.</p>}
          />
          <AgenticHubTable
            wide
            caption="Same task, different outcomes"
            headers={['Aspect', 'Weak candidate', 'Strong candidate']}
            rows={AGENTIC_BAD_VS_EXCELLENT.map((r) => [r.aspect, r.bad, r.excellent])}
          />
          <AgenticHubPromptBlock
            layout="duo"
            examples={[
              { variant: 'poor', title: 'Weak prompt', code: AGENTIC_BAD_PROMPT_SAMPLE },
              { variant: 'improved', title: 'Strong prompt', code: AGENTIC_EXCELLENT_PROMPT_SAMPLE },
            ]}
          />
          <AgenticHubPromptBlock examples={AGENTIC_PROMPT_DEBUG} />
        </Ch>

        {AGENTIC_PART_QUIZZES[1] ? <AgenticHubQuiz quiz={AGENTIC_PART_QUIZZES[1]} /> : null}

        <AgenticHubPartDivider part={AGENTIC_PARTS[2]!} partIndex={2} />

        <Ch id="interview-questions" title="50 Agentic AI Interview Questions">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.questions}</AgenticGeoLead>
          <p>
            Use these for self-practice or interviewer prep. Each includes answer guidance and the signal being probed.
          </p>
          {AGENTIC_QUESTION_CATEGORIES.map((category) => (
            <div key={category} className="mt-8">
              <h3 className="text-base font-bold tracking-tight sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                {category}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {AGENTIC_INTERVIEW_QUESTIONS.filter((q) => q.category === category).map((q, i) => (
                <AgenticQuestionCard
                  key={q.question}
                  question={q.question}
                  guidance={q.guidance}
                  signal={q.interviewerSignal}
                  variantIndex={i}
                />
              ))}
              </div>
            </div>
          ))}
        </Ch>

        <Ch id="evaluation-rubric" title="Evaluation Rubric &amp; Scorecards">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.rubric}</AgenticGeoLead>
          <AgenticHubTable
            wide
            caption="Scoring matrix (1 = fail, 4 = exceptional)"
            headers={['Dimension', 'Weight', '1', '2', '3', '4']}
            rows={AGENTIC_RUBRIC_DIMENSIONS.map((d) => [
              d.dimension,
              d.weight,
              d.score1,
              d.score2,
              d.score3,
              d.score4,
            ])}
          />
          {AGENTIC_SAMPLE_SCORECARDS.map((card) => (
            <div key={card.label} className="ie-agentic-pastel-scorecard my-6">
              <p className="m-0 font-semibold" style={{ color: 'var(--text-primary)' }}>
                Sample: {card.label} — {card.outcome}
              </p>
              <ul className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {Object.entries(card.scores).map(([dim, score]) => (
                  <li key={dim}>
                    {dim}: {score}/4
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {card.notes}
              </p>
            </div>
          ))}
        </Ch>

        <Ch id="common-mistakes" title="Common Mistakes">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.mistakes}</AgenticGeoLead>
          <AgenticHubCallout variant="warning" title="Expand each mistake for the fix">
            <p>Twenty-two failure patterns — tap any row to see consequence and remediation.</p>
          </AgenticHubCallout>
          <AgenticHubMistakesAccordion items={AGENTIC_COMMON_MISTAKES} />
        </Ch>

        <Ch id="preparation-roadmap" title="Preparation Roadmaps">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.roadmap}</AgenticGeoLead>
          <figure className="ie-blog-card my-8 overflow-hidden p-2 sm:my-10" style={{ marginLeft: 0, marginRight: 0 }}>
            <Image
              src={AGENTIC_ROADMAP_PATH}
              alt={AGENTIC_ROADMAP_ALT}
              width={AGENTIC_ROADMAP_WIDTH}
              height={AGENTIC_ROADMAP_HEIGHT}
              className="h-auto w-full rounded-lg"
            />
          </figure>
          {AGENTIC_PREP_ROADMAPS.map((roadmap) => (
            <div key={roadmap.label} className="mb-10">
              <h3 className="text-base font-bold tracking-tight sm:text-lg" style={{ color: 'var(--text-primary)' }}>
                {roadmap.label} ({roadmap.days} days)
              </h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {roadmap.summary}
              </p>
              <div className="mt-4 space-y-3">
                {roadmap.schedule.map((day) => (
                  <div key={day.day} className="ie-agentic-pastel-day-card">
                    <p className="ie-agentic-pastel-day-card__label">Day {day.day}</p>
                    <ul className="mt-2 mb-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {day.tasks.map((t) => (
                        <li key={t}>{t}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Ch>

        <Ch id="practice-framework" title="Self-Practice Framework">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.practice}</AgenticGeoLead>
          <p>
            Live interviews are scarce; reps are not. This loop mirrors what strong candidates do weekly — and what
            InterviewEra mock sessions reinforce with scored feedback.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {AGENTIC_PRACTICE_LOOP_STEPS.map((step, i) => (
              <div key={step.step} className="ie-agentic-pastel-loop-card">
                <p className="ie-agentic-pastel-loop-card__step">
                  {i + 1}. {step.step}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.body}
                </p>
              </div>
            ))}
          </div>
          <p>
            Generate ambiguous tasks with the{' '}
            <Link href="/tools/question-generator" className="ie-blog-inline-link">
              free question generator
            </Link>
            , run timed sessions with your AI IDE of choice, then compare self-scores to the rubric above.
          </p>
          <div className="my-10 sm:my-12">
            <BlogSignupCta
              title="Close the feedback loop"
              body="Self-scoring is necessary but biased. Run agentic-style mocks on InterviewEra for third-party rubric feedback on communication and ownership."
              href="/signup"
              ctaLabel="Start your practice loop"
            />
          </div>
        </Ch>

        {AGENTIC_PART_QUIZZES[2] ? <AgenticHubQuiz quiz={AGENTIC_PART_QUIZZES[2]} /> : null}

        <AgenticHubPartDivider part={AGENTIC_PARTS[3]!} partIndex={3} />

        <Ch id="india-adoption" title="Agentic AI Interview Trends in India">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.india}</AgenticGeoLead>
          <p>
            India&apos;s hiring market is dual-speed: mass campus OAs remain DSA-heavy, while product hubs and GCCs align
            with global AI-native engineering. Below we separate <strong>confirmed trends</strong> from{' '}
            <strong>projections</strong>.
          </p>
          <aside className="ie-agentic-pastel-aside ie-agentic-pastel-aside--mint my-6">
            <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Confirmed (2024–2026)
            </p>
            <ul className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {AGENTIC_INDIA_CONFIRMED_FACTS.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </aside>
          <aside className="ie-agentic-pastel-aside ie-agentic-pastel-aside--peach my-6">
            <p className="m-0 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Projected (2026+)
            </p>
            <ul className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {AGENTIC_INDIA_PROJECTIONS.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </aside>
          <p>Why Indian companies adopt agentic-style assessment:</p>
          <ul>
            {AGENTIC_INDIA_WHY_ADOPT.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <AgenticHubTable
            wide
            caption="Adoption by segment (India)"
            headers={['Segment', 'Status', 'Timeline', 'Notes']}
            rows={AGENTIC_INDIA_ADOPTION.map((r) => [
              r.segment,
              r.status.charAt(0).toUpperCase() + r.status.slice(1),
              r.timeline,
              r.notes,
            ])}
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AGENTIC_INDIA_ADOPTION.map((row, i) => (
              <div key={row.segment} className={agenticPastelCardClass(i)}>
                <div className="flex flex-wrap items-center gap-2">
                  <AgenticStatusBadge status={row.status} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {row.timeline}
                  </span>
                </div>
                <p className="ie-agentic-pastel-card__title">{row.segment}</p>
                <p className="ie-agentic-pastel-card__body">{row.notes}</p>
              </div>
            ))}
          </div>
        </Ch>

        <Ch id="future-of-hiring" title="Future of Hiring">
          <AgenticGeoLead>{AGENTIC_GEO_LEADS.future}</AgenticGeoLead>
          <p>
            <strong>AI-native engineers</strong> will default to collaborative workflows.{' '}
            <strong>Autonomous software development</strong> is not “no humans”; it is humans supervising agent fleets
            with merge authority and production accountability.
          </p>
          <AgenticHubTable
            wide
            caption="Skill durability in AI-native hiring (illustrative)"
            headers={['Skill', 'Durability', 'Why']}
            rows={AGENTIC_FUTURE_SKILLS}
          />
          <p>
            Pair this hub with our{' '}
            <Link href="/blog/top-dsa-interview-questions" className="ie-blog-inline-link">
              DSA topic map
            </Link>{' '}
            and{' '}
            <Link href="/blog/ai-mock-interviews-smartest-prep-2026" className="ie-blog-inline-link">
              AI mock interview guide
            </Link>
            .
          </p>
        </Ch>

        <Ch id="faq" title="Frequently Asked Questions">
          <BlogEditorialFaq items={AGENTIC_FAQ_ITEMS} accordion />
        </Ch>

        {AGENTIC_PART_QUIZZES[3] ? <AgenticHubQuiz quiz={AGENTIC_PART_QUIZZES[3]} /> : null}

        <section id="contextual-links" className="ie-agentic-hub-section scroll-mt-24">
          <h2 className="ie-agentic-hub-section__title">Related Preparation Guides</h2>
          <p>
            Agentic rounds sit inside full hiring loops — DSA, behavioral, and system design still matter. Cross-train
            with these InterviewEra resources.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AGENTIC_CONTEXTUAL_LINKS.map((link) => (
              <Link key={link.href + link.label} href={link.href} className="ie-agentic-pastel-link-card">
                {link.label} →
              </Link>
            ))}
          </div>
        </section>

        <section id="conclusion" className="ie-agentic-hub-section scroll-mt-24">
          <h2 className="ie-agentic-hub-section__title">Conclusion</h2>
          <p>
            The agentic AI interview round is not a fad filter for prompt engineers — it is the interview format
            catching up to how software is built in 2026. Companies do not hire you to type faster than Claude; they hire
            you to think clearly, collaborate responsibly, test ruthlessly, and own what ships.
          </p>
          <p>
            Start with clarification and planning. Treat AI as a junior teammate. Score yourself honestly against the
            rubric. Run the 7-day or 30-day roadmap if you are weeks out; run the 60-minute workflow drill if you are
            days out.
          </p>
          <div className="mt-12 sm:mt-16">
            <FreeToolCtaBlock
              title="Practice agentic-style interviews with scored feedback"
              body="Upload your resume, run AI mock interviews, and sharpen the communication and ownership signals that agentic rounds reward."
              href="/signup"
              ctaLabel="Start free practice"
            />
          </div>
        </section>
      </AgenticHubReadingShell>
    </article>
  );
}
