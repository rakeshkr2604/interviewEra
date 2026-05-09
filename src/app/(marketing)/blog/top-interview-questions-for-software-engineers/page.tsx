import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';

import { brandArticleOgTitle, generateMetadata } from '@/lib/seo/metadata';

const SWE_META_TITLE = 'Top Interview Questions for Software Engineers (2026)';

export const metadata: Metadata = generateMetadata({
  title: SWE_META_TITLE,
  description:
    'The most commonly asked software engineer interview questions — DSA, system design, and behavioral — with tips on what interviewers are really looking for.',
  path: '/blog/top-interview-questions-for-software-engineers',
  socialTitle: brandArticleOgTitle(SWE_META_TITLE),
  keywords:
    'software engineer interview questions, SWE interview questions, coding interview questions, technical interview questions India, SDE interview preparation',
  openGraphType: 'article',
});

interface QSection {
  id: string;
  title: string;
  questions: Array<{ q: string; tip: string }>;
}

const DSA_QUESTIONS: Array<{ q: string; tip: string }> = [
  {
    q: 'Given an array of integers, find two numbers that add up to a target sum.',
    tip: 'This is the canonical hash-map question. Interviewers expect you to start with the O(n²) brute force, then optimize to O(n) using a hash set. Edge cases: duplicates, negative numbers, no valid pair.',
  },
  {
    q: 'Reverse a linked list. Can you do it iteratively and recursively?',
    tip: 'Both approaches are expected. Common follow-up: reverse a portion of the list (positions m to n). Use the iterative approach in production code — the recursive version risks stack overflow on large lists.',
  },
  {
    q: 'Given a binary tree, find the maximum path sum between any two nodes.',
    tip: 'Classic tree DP. You need to track two values at each node: the max path including the node going upward, and the max path through the node (which can include both children). Many candidates confuse these two.',
  },
  {
    q: 'Implement an LRU (Least Recently Used) cache with O(1) get and put.',
    tip: 'The answer is a doubly linked list + hash map. Most candidates know this abstractly but struggle with the implementation. Practice writing the actual code with sentinel head/tail nodes — it eliminates edge cases.',
  },
  {
    q: 'Find the longest substring without repeating characters.',
    tip: `Sliding window with a hash set. The key insight is that when you find a repeat, you don't restart from scratch — you move the left pointer to just past the previous occurrence of the repeated character.`,
  },
  {
    q: 'Given a matrix of 0s and 1s, find the number of islands.',
    tip: 'BFS or DFS from each unvisited "1". Mark cells as visited in-place (turn "1" to "0") to avoid extra space. Time: O(m×n). Common follow-up: perimeter of islands, or counting with a union-find structure.',
  },
];

const SYSTEM_DESIGN_QUESTIONS: Array<{ q: string; tip: string }> = [
  {
    q: 'Design a URL shortener like bit.ly.',
    tip: 'Cover: requirements clarification (read-heavy vs write-heavy ratio), data model (original URL, short code, creation date), hashing strategy (base62 encoding), collision handling, scaling the read path with caching and CDN, and analytics tracking.',
  },
  {
    q: `How would you design a social media feed (like Twitter's home timeline)?`,
    tip: 'The central challenge is the fan-out problem: when a user with 10M followers posts, do you push to all followers (fan-out-on-write) or compute their feed at read time (fan-out-on-read)? The best systems use a hybrid approach based on follower count.',
  },
  {
    q: 'Design a distributed rate limiter for an API gateway.',
    tip: 'Single-node rate limiting is trivial. The interviewer wants the distributed version. Discuss token bucket vs sliding window log algorithms, how to use Redis with atomic Lua scripts, and the trade-offs between accuracy and performance under network partitions.',
  },
  {
    q: 'Design a real-time notification system.',
    tip: `Key components: event producers, a message queue (Kafka or SQS), notification worker service, delivery channels (push via APNs/FCM, email via SES), user preference service, and deduplication. Don't forget delivery guarantees and retry logic.`,
  },
  {
    q: 'How would you design a search autocomplete feature?',
    tip: 'Offline: precompute top-k search terms per prefix using historical logs, store in a trie or Redis sorted sets. Online: serve from cache with sub-50ms latency. Client-side: debounce at 200ms. Most candidates forget the client-side piece.',
  },
];

const BEHAVIORAL_QUESTIONS: Array<{ q: string; tip: string }> = [
  {
    q: 'Tell me about a time you disagreed with your team lead or manager. What did you do?',
    tip: 'Interviewers want to see that you can push back constructively without being difficult. The best answers show: you raised the concern with data/reasoning, listened to their perspective, reached alignment, and committed once a decision was made.',
  },
  {
    q: 'Describe a project you delivered under a tight deadline. How did you prioritize?',
    tip: `Use STAR. Be specific about what got cut (scope), what got communicated (status updates to stakeholders), and what was delivered. Don't say "I just worked harder" — talk about the trade-off decisions you made.`,
  },
  {
    q: 'Tell me about a significant technical failure or bug you caused. What happened?',
    tip: `Interviewers are testing self-awareness and ownership. Don't minimize the failure or deflect blame. Do show: what the root cause was, what the immediate fix was, and what systemic change you made to prevent recurrence.`,
  },
  {
    q: `How do you handle working on a codebase you didn't write and don't fully understand?`,
    tip: 'Good answers mention: reading tests to understand expected behavior, using git blame/log to understand intent, asking the right questions to the right people, making small targeted changes rather than large refactors.',
  },
  {
    q: 'Where do you see yourself in 5 years? Why software engineering?',
    tip: `Don't be vague. Have a real answer: "I want to build expertise in [area] and move toward [technical lead / staff eng / product]. This role gives me exposure to [specific thing] which is directly on that path." Connect it to the company.`,
  },
];

const SECTIONS: QSection[] = [
  { id: 'dsa', title: 'Data Structures & Algorithms', questions: DSA_QUESTIONS },
  { id: 'system-design', title: 'System Design', questions: SYSTEM_DESIGN_QUESTIONS },
  { id: 'behavioral', title: 'Behavioral & HR', questions: BEHAVIORAL_QUESTIONS },
];

export default function TopInterviewQuestionsForSoftwareEngineers() {
  return (
    <BlogMarketingShell backHref="/blog" backLabel="All guides">
      <article className="ie-blog-prose mx-auto w-full max-w-3xl xl:max-w-[48rem] 2xl:max-w-[52rem]">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            Interview Questions
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
            Top Interview Questions for Software Engineers (2026)
          </h1>
          <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            These are the questions that keep appearing across technical interviews at Indian and
            global product companies. For each, we break down not just the question but what
            interviewers are actually testing.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>12 min read</span>
            <span aria-hidden>·</span>
            <span>Updated April 2026</span>
          </div>
        </header>

        <nav className="ie-blog-card mb-10 p-5 sm:mb-12 sm:p-6" aria-label="Jump to section">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            Jump to section
          </p>
          <ul className="m-0 list-none space-y-2 p-0 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {SECTIONS.map((sec) => (
              <li key={sec.id}>
                <a href={`#${sec.id}`} className="ie-blog-inline-link font-medium">
                  {sec.title}
                </a>
              </li>
            ))}
            <li>
              <a href="#how-to-practice" className="ie-blog-inline-link font-medium">
                How to practice effectively
              </a>
            </li>
          </ul>
        </nav>

        <p>
          There is no such thing as an exhaustive list of interview questions — but there are
          patterns. After analyzing thousands of interview experiences shared on Glassdoor,
          LeetCode Discuss, and our own platform, these are the questions and problem types that
          appear most frequently for software engineer roles at top companies in India and
          globally.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.id}>
            <h2 id={section.id}>{section.title} Questions</h2>
            <div className="space-y-4 sm:space-y-5">
              {section.questions.map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl border-2 p-4 sm:rounded-2xl sm:p-5"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
                    boxShadow: 'var(--card-shadow)',
                  }}
                >
                  <p className="m-0 font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
                    {item.q}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                      What to know:{' '}
                    </span>
                    {item.tip}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <h2 id="how-to-practice">How to Practice These Questions Effectively</h2>
        <p>
          Reading questions and their solutions is the least effective preparation method.
          Research on skill acquisition consistently shows that retrieval practice — attempting
          to solve or answer a question without looking at the answer first — produces far
          stronger retention than passive review.
        </p>
        <p>Here's what actually works:</p>
        <ol>
          <li>
            <strong>Attempt before reading the solution.</strong> Set a 20–25 minute timer.
            Even if you don't arrive at the optimal answer, the struggle primes your brain to
            retain the solution far more effectively than reading directly.
          </li>
          <li>
            <strong>Practice explaining out loud.</strong> Coding alone is not interview
            preparation. Interviews require you to narrate your thinking. Use a mirror, record
            yourself, or use an AI mock interview tool — but practice speaking while solving.
          </li>
          <li>
            <strong>Space your practice.</strong> Don't solve 10 problems in a day and declare
            yourself ready. Re-attempt problems you've already solved 5–7 days later. This spaced
            repetition approach builds durable recall.
          </li>
          <li>
            <strong>Simulate interview conditions.</strong> At least once a week, do a full
            45-minute mock interview. Use our{' '}
            <Link href="/signup" className="ie-blog-inline-link">
              AI mock interview platform
            </Link>{' '}
            to get personalized questions and instant feedback on your answers.
          </li>
        </ol>
        <p>
          You can also use our free{' '}
          <Link href="/tools/question-generator" className="ie-blog-inline-link">
            interview question generator
          </Link>{' '}
          to generate role-specific questions tailored to any position, or practice the{' '}
          <Link href="/tools/star-builder" className="ie-blog-inline-link">
            STAR method
          </Link>{' '}
          for behavioral questions.
        </p>

        <div className="mt-12 sm:mt-16">
          <FreeToolCtaBlock
            title="Practice these questions in a real mock interview"
            body="Get AI-generated questions tailored to your resume. Instant scoring and feedback."
            href="/signup"
            ctaLabel="Start free practice"
          />
        </div>
      </article>
    </BlogMarketingShell>
  );
}
