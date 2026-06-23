import Link from 'next/link'
import { AgenticSpokeShell } from '@/components/blog/agentic/AgenticSpokeShell'
import { AgenticHubPromptBlock } from '@/components/blog/agentic/AgenticHubPromptBlock'
import { AgenticHubCallout } from '@/components/blog/agentic/AgenticHubVisualBreak'
import {
  AGENTIC_PROMPT_CLARIFICATION,
  AGENTIC_PROMPT_DEBUG,
  AGENTIC_PROMPT_REVIEW,
} from '@/lib/seo/blog/agentic-ai-hub-prompts'
import { AI_PROMPT_ENGINEERING_CONFIG } from '@/lib/seo/blog/agentic-spoke-prompt-engineering'

export function AiPromptEngineeringArticle() {
  return (
    <AgenticSpokeShell config={AI_PROMPT_ENGINEERING_CONFIG} showQuestionGeneratorCta>
      <h2 id="why-prompts-matter">Why prompts are scored</h2>
      <p>
        In agentic rounds, prompts are visible work product. Interviewers infer seniority from how precisely you
        constrain the model — stack, files, validation, forbidden dependencies, and tests — before you accept a diff.
      </p>

      <h2 id="clarification-prompts">New feature prompts</h2>
      <p>
        When implementing an endpoint or component, ground the model in your repo. Compare poor, good, and improved
        versions — copy any example with the button on each card.
      </p>
      <AgenticHubPromptBlock examples={AGENTIC_PROMPT_CLARIFICATION} />

      <h2 id="debug-prompts">Debugging prompts</h2>
      <p>
        Bug-fix prompts should pin the failing input, expected vs actual behavior, file location, and constraints on the
        fix (e.g., add regression test, do not refactor unrelated modules).
      </p>
      <AgenticHubPromptBlock examples={AGENTIC_PROMPT_DEBUG} />

      <h2 id="review-prompts">Code review prompts</h2>
      <p>
        Security and quality reviews need a threat model or checklist — otherwise models produce noisy drive-by refactors.
      </p>
      <AgenticHubPromptBlock examples={AGENTIC_PROMPT_REVIEW} />

      <AgenticHubCallout variant="tip" title="Iteration beats one-shot">
        <p>
          Four focused prompts in ten minutes usually beat one mega-prompt that hallucinates dependencies. Interviewers
          watch your iteration strategy.
        </p>
      </AgenticHubCallout>

      <h2 id="practice-loop">Practice loop</h2>
      <ol>
        <li>Pick an ambiguous task from the question generator.</li>
        <li>Write three prompt variants (poor, good, improved) before running AI.</li>
        <li>Review diffs aloud as if screen sharing.</li>
        <li>Self-score against the pillar rubric.</li>
        <li>Run a mock on InterviewEra for external feedback.</li>
      </ol>
      <p>
        Pair this guide with the{' '}
        <Link href="/blog/agentic-coding-round" className="ie-blog-inline-link">
          agentic coding round format guide
        </Link>{' '}
        and{' '}
        <Link href="/blog/cursor-ai-interview-guide" className="ie-blog-inline-link">
          Cursor-specific tactics
        </Link>
        . Definitions live in{' '}
        <Link href="/blog/what-is-agentic-ai" className="ie-blog-inline-link">
          what is agentic AI
        </Link>
        .
      </p>
    </AgenticSpokeShell>
  )
}
