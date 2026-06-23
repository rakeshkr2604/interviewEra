import Link from 'next/link'
import { AgenticSpokeShell } from '@/components/blog/agentic/AgenticSpokeShell'
import { AgenticHubCallout } from '@/components/blog/agentic/AgenticHubVisualBreak'
import { AgenticInterviewFlow } from '@/components/blog/visualizations/AgenticInterviewFlow'
import { AGENTIC_CODING_ROUND_CONFIG } from '@/lib/seo/blog/agentic-spoke-coding-round'

export function AgenticCodingRoundArticle() {
  return (
    <AgenticSpokeShell config={AGENTIC_CODING_ROUND_CONFIG}>
      <h2 id="format">Typical format</h2>
      <p>
        Most agentic coding rounds follow a continuous evaluation loop. You are scored from the first clarification
        question through the final trade-off discussion — not only when the timer ends.
      </p>
      <AgenticInterviewFlow />

      <h2 id="timeline">Minute-by-minute expectations</h2>
      <p>
        In a 60-minute session, strong candidates spend roughly 8–12 minutes on requirements, 30–35 minutes implementing
        with verified AI use, and the remainder on tests and discussion. If you have not asked structured questions by
        minute 10, you are likely building the wrong feature.
      </p>
      <ul>
        <li>
          <strong>0–10 min:</strong> Clarify auth, validation, error shapes, scale, and definition of done.
        </li>
        <li>
          <strong>10–40 min:</strong> Implement in layers — prompt, review diff, run tests, iterate.
        </li>
        <li>
          <strong>40–55 min:</strong> Edge-case tests, security sanity check, document deferred scope.
        </li>
        <li>
          <strong>55–60 min:</strong> Walk interviewer through decisions and what you would do with more time.
        </li>
      </ul>

      <h2 id="evaluated">What interviewers evaluate</h2>
      <p>
        Scorecard dimensions align with the{' '}
        <Link href="/blog/agentic-ai-interview-round-2026#evaluation-rubric" className="ie-blog-inline-link">
          rubric in the pillar guide
        </Link>
        : clarification, planning, prompting quality, code review, testing, communication, AI usage discipline, and
        ownership. Weak signals include silent pasting, missing tests, and inability to explain validation layers.
      </p>

      <AgenticHubCallout variant="warning" title="Confirm tool policy first">
        <p>
          Ask explicitly: Which AI tools are allowed? Is browser access permitted? May you install packages? Violating
          unstated assumptions is an avoidable fail.
        </p>
      </AgenticHubCallout>

      <h2 id="weak-vs-strong">Weak vs strong candidate behavior</h2>
      <p>
        <strong>Weak:</strong> Single vague prompt, unreviewed diff, no tests, cannot discuss error handling.{' '}
        <strong>Strong:</strong> Structured prompts per layer, narrated review, happy-path plus edge-case tests, clear
        scope communication under time pressure.
      </p>
      <p>
        Study copy-ready prompt examples in the{' '}
        <Link href="/blog/ai-prompt-engineering-interview" className="ie-blog-inline-link">
          AI prompt engineering guide
        </Link>{' '}
        and tool-specific tactics in the{' '}
        <Link href="/blog/cursor-ai-interview-guide" className="ie-blog-inline-link">
          Cursor interview guide
        </Link>
        .
      </p>

      <h2 id="prep">How to prepare</h2>
      <p>
        Generate ambiguous tasks with the{' '}
        <Link href="/tools/question-generator" className="ie-blog-inline-link">
          free question generator
        </Link>
        , run timed sessions with your permitted IDE, self-score against the rubric, then validate with{' '}
        <Link href="/signup" className="ie-blog-inline-link">
          InterviewEra mock interviews
        </Link>{' '}
        for third-party feedback on communication and ownership.
      </p>
      <p>
        If you are new to the concept, start with{' '}
        <Link href="/blog/what-is-agentic-ai" className="ie-blog-inline-link">
          what agentic AI means
        </Link>{' '}
        before drilling live formats.
      </p>
    </AgenticSpokeShell>
  )
}
