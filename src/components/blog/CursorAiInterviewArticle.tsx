import Link from 'next/link'
import Image from 'next/image'
import { AgenticSpokeShell } from '@/components/blog/agentic/AgenticSpokeShell'
import { AgenticHubCallout } from '@/components/blog/agentic/AgenticHubVisualBreak'
import { AGENTIC_MINDSET_ALT, AGENTIC_MINDSET_PATH } from '@/lib/seo/blog/agentic-ai-hub'
import { CURSOR_AI_INTERVIEW_CONFIG } from '@/lib/seo/blog/agentic-spoke-cursor'

export function CursorAiInterviewArticle() {
  return (
    <AgenticSpokeShell config={CURSOR_AI_INTERVIEW_CONFIG}>
      <h2 id="before-round">Before the round</h2>
      <ul>
        <li>Confirm Cursor (or specific features) are allowed — policies vary by company.</li>
        <li>Match IDE version and keybindings to what you practiced.</li>
        <li>Prepare a 30-second opening: how you use AI as a junior teammate you review.</li>
        <li>Test microphone, screen share, and @-mention context on a sample repo.</li>
      </ul>

      <figure className="ie-blog-card my-8 overflow-hidden p-2 sm:my-10" style={{ marginLeft: 0, marginRight: 0 }}>
        <Image
          src={AGENTIC_MINDSET_PATH}
          alt={AGENTIC_MINDSET_ALT}
          width={1200}
          height={800}
          className="h-auto w-full rounded-lg"
        />
        <figcaption className="mt-2 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
          Senior mindset: you lead; Cursor assists. Interviewers score ownership, not token count.
        </figcaption>
      </figure>

      <h2 id="during-round">During the round</h2>
      <p>
        <strong>Clarify before Composer.</strong> Do not launch multi-file agents on a vague spec. Write assumptions in
        comments or chat so the interviewer sees your thinking.
      </p>
      <p>
        <strong>Use @ context deliberately.</strong> Reference files and folders that define patterns — routes, validation
        helpers, test setup — so generated code fits the repo.
      </p>
      <p>
        <strong>Review every diff.</strong> Check imports, types, auth, and error mapping. Reject scope creep (extra
        microservices, surprise dependencies).
      </p>
      <p>
        <strong>Run tests in terminal.</strong> Showing green tests after AI edits is one of the strongest hire signals in
        agentic loops.
      </p>

      <AgenticHubCallout variant="insight" title="What interviewers see on screen share">
        <p>
          Your prompt history and diff reviews are part of the interview. Write prompts you would be proud to paste into
          a team Slack thread.
        </p>
      </AgenticHubCallout>

      <h2 id="composer-vs-chat">Composer vs Chat</h2>
      <p>
        Use <strong>Chat</strong> for debugging stack traces, explaining a function, or single-file fixes. Use{' '}
        <strong>Composer</strong> when the task spans multiple files — then walk through the unified diff before accepting.
        Mixing them well shows tool fluency without over-delegating.
      </p>

      <h2 id="prompts">Prompt patterns that work in Cursor</h2>
      <p>
        The same poor / good / improved structures in our{' '}
        <Link href="/blog/ai-prompt-engineering-interview" className="ie-blog-inline-link">
          prompt engineering guide
        </Link>{' '}
        apply in Cursor — add @file paths for extra grounding. Practice on tasks from the{' '}
        <Link href="/tools/question-generator" className="ie-blog-inline-link">
          question generator
        </Link>
        .
      </p>

      <h2 id="related">Related guides</h2>
      <p>
        New to agentic hiring? Read{' '}
        <Link href="/blog/what-is-agentic-ai" className="ie-blog-inline-link">
          what is agentic AI
        </Link>{' '}
        and the{' '}
        <Link href="/blog/agentic-coding-round" className="ie-blog-inline-link">
          agentic coding round format
        </Link>
        . For rubrics, India trends, and 50 questions, see the{' '}
        <Link href="/blog/agentic-ai-interview-round-2026" className="ie-blog-inline-link">
          full pillar guide
        </Link>
        .
      </p>
    </AgenticSpokeShell>
  )
}
