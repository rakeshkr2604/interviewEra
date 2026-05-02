import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';

import { DsaPrepTimelineChart, DsaTopicFrequencyChart } from '@/components/blog/visualizations/BlogDynamicCharts';

export const metadata: Metadata = {
  title: 'Top DSA Interview Questions & Topic Map (2026) | InterviewEra',
  description:
    'Which DSA topics show up most in OAs and technical rounds — with charts, must-solve problem patterns, and a realistic prep timeline.',
  keywords:
    'DSA interview questions, coding interview topics, placement DSA preparation, LeetCode patterns, OA preparation India',
  openGraph: {
    title: 'Top DSA Interview Questions & Topic Map',
    description: 'Topic frequency visualization, classic problems, and prep timeline for coding interviews.',
    type: 'article',
  },
};

const SECTION_IDS = [
  ['#topic-landscape', 'Topic landscape (chart)'],
  ['#arrays-hashing', 'Arrays, strings & hashing'],
  ['#two-pointers', 'Two pointers & sliding window'],
  ['#linked-lists', 'Linked lists'],
  ['#trees', 'Trees & BST'],
  ['#graphs', 'Graphs'],
  ['#dynamic-programming', 'Dynamic programming'],
  ['#binary-search-heaps', 'Binary search & heaps'],
  ['#prep-timeline', 'Prep timeline (chart)'],
  ['#mistakes', 'Mistakes that cost offers'],
] as const;

export default function TopDsaInterviewQuestionsPage() {
  return (
    <BlogMarketingShell backHref="/blog" backLabel="All guides">
      <article className="ie-blog-prose mx-auto w-full max-w-3xl xl:max-w-[48rem] 2xl:max-w-[52rem]">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            Data structures & algorithms
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
            Top DSA interview questions & topic map
          </h1>
          <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            A practical map of what actually gets asked — not every LeetCode tag, but the patterns that repeat across
            campus OAs, phone screens, and onsite loops. Includes interactive-style charts you can use to prioritize your
            next 8–10 weeks.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>14 min read</span>
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

        <p>
          Most candidates study DSA randomly: random problems, random tags, random YouTube videos. Interview loops are not
          random — they sample from a <strong>skewed distribution</strong> of topics. The first chart below is an{' '}
          <strong>illustrative composite</strong> (typical product-company and strong campus OAs): it shows{' '}
          <em>relative</em> how often each theme appears, not a guarantee for one company on one day.
        </p>

        <figure
          className="ie-blog-card my-8 overflow-hidden p-4 sm:my-10 sm:p-6"
          style={{ marginLeft: 0, marginRight: 0 }}
        >
          <figcaption className="mb-1 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            Illustrative topic frequency (technical rounds + OAs)
          </figcaption>
          <p className="mb-4 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Higher bars = more interview surface area across a typical prep cohort. Use it to order your revision, not to
            skip entire topics.
          </p>
          <div className="h-[min(26rem,70vh)] w-full sm:h-[22rem] lg:h-[24rem]">
            <DsaTopicFrequencyChart />
          </div>
        </figure>

        <h2 id="topic-landscape">How to read the topic landscape</h2>
        <p>
          <strong>Arrays & hashing</strong> sit on top because they are the default substrate for OAs and many round-1
          problems. <strong>Trees</strong> and <strong>graphs</strong> spike at product companies and strong intern
          pipelines. <strong>DP</strong> is asked less often by volume but is a high-variance filter: when it shows up,
          unprepared candidates collapse quickly.
        </p>

        <h2 id="arrays-hashing">Arrays, strings & hashing</h2>
        <p>Canonical patterns: frequency maps, prefix sums, sorting as preprocessing, index mapping.</p>
        <ul>
          <li>Two sum / k-sum family (hash map or sort + two pointers).</li>
          <li>Longest substring without repeat / at most k distinct (sliding window).</li>
          <li>Subarray sum equals k (prefix sum + hash map).</li>
          <li>Merge intervals and meeting-room style scheduling.</li>
        </ul>

        <h2 id="two-pointers">Two pointers & sliding window</h2>
        <p>
          Often combined with arrays or strings. Interviewers use these to test whether you can maintain invariants while
          moving indices — not whether you memorized a template.
        </p>
        <ul>
          <li>Container with most water, trapping rain water (two pointers from ends).</li>
          <li>Minimum window substring / smallest subarray with sum ≥ target.</li>
          <li>Fast/slow pointer for cycle detection (also linked lists).</li>
        </ul>

        <h2 id="linked-lists">Linked lists</h2>
        <ul>
          <li>Reverse linked list (iterative + recursive).</li>
          <li>Merge two sorted lists, add two numbers represented as lists.</li>
          <li>Detect cycle (Floyd), find intersection of two lists.</li>
        </ul>

        <h2 id="trees">Trees & BST</h2>
        <ul>
          <li>Traversals, height/depth, balanced tree check, diameter of binary tree.</li>
          <li>LCA in BST vs LCA in binary tree.</li>
          <li>Path sum variants, serialize/deserialize tree.</li>
        </ul>

        <h2 id="graphs">Graphs</h2>
        <ul>
          <li>Number of islands, rotten oranges, word ladder (BFS layering).</li>
          <li>Course schedule / topological sort.</li>
          <li>Connected components, DFS on grid vs adjacency list.</li>
        </ul>

        <h2 id="dynamic-programming">Dynamic programming</h2>
        <p>
          Start with 1D DP (climbing stairs, house robber, coin change) before 2D (LCS, edit distance). Interviewers often
          accept O(n²) with clear state definition over a rushed “optimized” solution you cannot explain.
        </p>

        <h2 id="binary-search-heaps">Binary search & heaps</h2>
        <ul>
          <li>Binary search on answer space (Koko eating bananas, split array largest sum).</li>
          <li>Median from data stream, merge k sorted lists, top k frequent elements.</li>
        </ul>

        <h2 id="prep-timeline">Prep timeline: three tracks in parallel</h2>
        <p>
          The line chart below is <strong>illustrative</strong>: it shows how readiness might grow if you keep{' '}
          <strong>core DS</strong>, <strong>pattern depth</strong>, and <strong>mock interviews</strong> moving together.
          Mocks that start too late produce a flat green curve in real life — don’t wait until week 8 to speak out loud.
        </p>

        <figure
          className="ie-blog-card my-8 overflow-hidden p-4 sm:my-10 sm:p-6"
          style={{ marginLeft: 0, marginRight: 0 }}
        >
          <figcaption className="mb-1 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
            Illustrative readiness over 10 weeks
          </figcaption>
          <p className="mb-4 text-xs leading-relaxed sm:text-sm" style={{ color: 'var(--text-muted)' }}>
            Y-axis: self-rated readiness 1–10. Your curve will differ — use the shape as a planning reminder, not a
            prediction.
          </p>
          <div className="h-[min(20rem,55vh)] w-full sm:h-[18rem] lg:h-[20rem]">
            <DsaPrepTimelineChart />
          </div>
        </figure>

        <h2 id="mistakes">Mistakes that cost offers</h2>
        <ol>
          <li>
            <strong>Only coding in silence.</strong> Interviews grade communication. Narrate assumptions, complexity, and
            trade-offs.
          </li>
          <li>
            <strong>Skipping complexity.</strong> Always state time and space; invite follow-ups on optimization.
          </li>
          <li>
            <strong>One-shot practice.</strong> Re-solve the same problem after 5–7 days (spaced repetition).
          </li>
          <li>
            <strong>Ignoring OAs.</strong> Many Indian campus pipelines filter hard on timed OAs — practice under timer and
            partial scoring mindset.
          </li>
        </ol>

        <p>
          Generate role-shaped question sets with our free{' '}
          <Link href="/tools/question-generator" className="ie-blog-inline-link">
            interview question generator
          </Link>
          , tighten behavioral stories with the{' '}
          <Link href="/tools/star-builder" className="ie-blog-inline-link">
            STAR answer builder
          </Link>
          , and line up full sessions with{' '}
          <Link href="/signup" className="ie-blog-inline-link">
            InterviewEra mock interviews
          </Link>
          .
        </p>

        <div className="mt-12 sm:mt-16">
          <FreeToolCtaBlock
            title="Turn topics into spoken practice"
            body="Upload your resume, run AI mock interviews, and get rubric-style feedback — not just more random problems."
            href="/signup"
            ctaLabel="Start free practice"
          />
        </div>
      </article>
    </BlogMarketingShell>
  );
}
