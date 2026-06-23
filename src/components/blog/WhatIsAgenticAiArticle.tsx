import Link from 'next/link'
import { AgenticSpokeShell } from '@/components/blog/agentic/AgenticSpokeShell'
import { AgenticHubCallout } from '@/components/blog/agentic/AgenticHubVisualBreak'
import { AgenticInterviewTimeline } from '@/components/blog/visualizations/AgenticInterviewTimeline'
import { AGENTIC_MISCONCEPTIONS } from '@/lib/seo/blog/agentic-ai-hub'
import { WHAT_IS_AGENTIC_AI_CONFIG } from '@/lib/seo/blog/agentic-spoke-what-is'
import { agenticPastelCardClass } from '@/lib/seo/blog/agentic-pastel'

export function WhatIsAgenticAiArticle() {
  return (
    <AgenticSpokeShell config={WHAT_IS_AGENTIC_AI_CONFIG}>
      <h2 id="definition">Definition for engineers</h2>
      <p>
        In production teams, <strong>agentic AI</strong> describes workflows where a model plans work across multiple
        steps: reading files, proposing edits, running commands, and iterating until a task is done. The engineer sets
        direction, reviews output, writes tests, and owns what merges.
      </p>
      <p>
        That is different from asking ChatGPT a one-off question or accepting tab completions. Agentic systems behave more
        like a fast junior teammate — capable, eager, and sometimes wrong.
      </p>

      <h2 id="interview-context">Why interviews adopted the term</h2>
      <p>
        Hiring loops lagged behind daily work when they banned the same tools engineers use to ship. An{' '}
        <strong>agentic AI interview</strong> closes that gap: you solve a realistic task with permitted assistants while
        interviewers score{' '}
        <Link href="/blog/agentic-coding-round" className="ie-blog-inline-link">
          how you collaborate
        </Link>
        , not whether you outperform a model on typing speed.
      </p>
      <AgenticHubCallout variant="insight" title="The signal companies want">
        <p>
          Two candidates produce green tests. One cannot explain validation; the other added edge-case tests after catching
          a null-handling bug in AI output. That difference is agentic judgment.
        </p>
      </AgenticHubCallout>

      <h2 id="evolution">Where agentic fits in interview history</h2>
      <p>
        Technical interviews moved from whiteboards to OAs, pair programming, and early Copilot experiments. Agentic
        rounds are the current step — assessing collaboration before projected autonomous engineering assessments.
      </p>
      <AgenticInterviewTimeline />

      <h2 id="myths">Common myths</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {AGENTIC_MISCONCEPTIONS.map((item, i) => (
          <div key={item.myth} className={agenticPastelCardClass(i)}>
            <p className="ie-agentic-pastel-card__title">Myth: {item.myth}</p>
            <p className="ie-agentic-pastel-card__body">Reality: {item.reality}</p>
          </div>
        ))}
      </div>

      <h2 id="next-steps">What to read next</h2>
      <p>
        Understand the live format in our{' '}
        <Link href="/blog/agentic-coding-round" className="ie-blog-inline-link">
          agentic coding round guide
        </Link>
        , study{' '}
        <Link href="/blog/ai-prompt-engineering-interview" className="ie-blog-inline-link">
          prompt patterns that score well
        </Link>
        , and if Cursor is on your loop, read the{' '}
        <Link href="/blog/cursor-ai-interview-guide" className="ie-blog-inline-link">
          Cursor interview guide
        </Link>
        . For the full rubric, roadmaps, and 50 questions, use the{' '}
        <Link href="/blog/agentic-ai-interview-round-2026" className="ie-blog-inline-link">
          ultimate agentic AI interview guide
        </Link>
        .
      </p>
    </AgenticSpokeShell>
  )
}
