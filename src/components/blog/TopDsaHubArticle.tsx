import Link from 'next/link';
import Image from 'next/image';
import {
  BlogEditorialFaq,
  BlogEditorialHeader,
  BlogEditorialToc,
} from '@/components/blog/BlogEditorialHeader';
import { DsaPrepTimelineChart, DsaTopicFrequencyChart } from '@/components/blog/visualizations/BlogDynamicCharts';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';
import {
  TOP_DSA_COMMUNICATION_TOPICS,
  TOP_DSA_COMPANY_ROWS,
  TOP_DSA_CONTEXTUAL_LINKS,
  TOP_DSA_EDITORIAL_NOTE,
  TOP_DSA_FAQ_ITEMS,
  TOP_DSA_HERO_ALT,
  TOP_DSA_HERO_PATH,
  TOP_DSA_LAST_UPDATED,
  TOP_DSA_MUST_KNOW_PROBLEMS,
  TOP_DSA_PATTERNS,
  TOP_DSA_READING_TIME,
  TOP_DSA_REVIEWED_DATE,
  TOP_DSA_AUTHOR_NAME,
  TOP_DSA_REVIEWER_NAME,
  TOP_DSA_LEARNING_ROADMAP_ALT,
  TOP_DSA_LEARNING_ROADMAP_HEIGHT,
  TOP_DSA_LEARNING_ROADMAP_PATH,
  TOP_DSA_LEARNING_ROADMAP_STEPS,
  TOP_DSA_LEARNING_ROADMAP_WIDTH,
  TOP_DSA_PATTERN_TOPIC_ROWS,
  TOP_DSA_TOC_SECTIONS,
  TOP_DSA_UPDATED_LABEL,
} from '@/lib/seo/blog/top-dsa-hub';

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
} as const;

export function TopDsaHubArticle() {
  return (
    <article className="ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series mx-auto w-full">
      <BlogEditorialHeader
        category="Data structures & algorithms"
        singleTitle="Top DSA Interview Questions & Topic Map"
        readTime={TOP_DSA_READING_TIME}
        updatedLabel={TOP_DSA_UPDATED_LABEL}
        heroSrc={TOP_DSA_HERO_PATH}
        heroAlt={TOP_DSA_HERO_ALT}
      />

      <div className="ie-blog-interview-anxiety-content">
        <div className="ie-blog-dsa-intro-grid mt-6 grid gap-4 md:grid-cols-2 md:items-stretch">
          <BlogEditorialToc sections={TOP_DSA_TOC_SECTIONS} twoColumnList />

          <aside className="ie-blog-card p-4" style={cardStyle} aria-label="Article metadata">
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            About this guide
          </p>
          <dl className="mt-2 space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Author:</dt>
              <dd className="m-0">{TOP_DSA_AUTHOR_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed by:</dt>
              <dd className="m-0">{TOP_DSA_REVIEWER_NAME}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Last updated:</dt>
              <dd className="m-0">{TOP_DSA_LAST_UPDATED}</dd>
            </div>
            <div className="flex flex-wrap gap-x-1">
              <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>Reviewed:</dt>
              <dd className="m-0">{TOP_DSA_REVIEWED_DATE}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Editorial review note: </strong>
            {TOP_DSA_EDITORIAL_NOTE}
          </p>
          </aside>
        </div>

        <p>
          Most candidates study DSA randomly: random problems, random tags, random YouTube videos. Interview loops are not
          random — they sample from a <strong>skewed distribution</strong> of topics. The chart below is an{' '}
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

        <h2 id="dsa-learning-roadmap">DSA Learning Roadmap</h2>
        <p>
          Step-by-step path from fundamentals to interview readiness. Each stage unlocks the next — do not jump to
          dynamic programming before you can implement BFS on a graph without hints.
        </p>
        <figure className="mt-4">
          <div
            className="mx-auto w-full overflow-hidden rounded-[20px] border"
            style={{
              borderColor: 'var(--card-border)',
              maxWidth: '900px',
              boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
            }}
          >
            <Image
              src={TOP_DSA_LEARNING_ROADMAP_PATH}
              alt={TOP_DSA_LEARNING_ROADMAP_ALT}
              width={TOP_DSA_LEARNING_ROADMAP_WIDTH}
              height={TOP_DSA_LEARNING_ROADMAP_HEIGHT}
              quality={95}
              loading="lazy"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
              style={{ width: '100%', height: 'auto' }}
            />
          </div>
          <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            DSA learning roadmap — Beginner through Arrays, Hashing, Linked Lists, Trees, Graphs, Dynamic Programming,
            Mock Interviews, and Interview Ready.
          </figcaption>
        </figure>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {TOP_DSA_LEARNING_ROADMAP_STEPS.map((item) => (
            <section key={item.step} className="ie-blog-card p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.step}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
            </section>
          ))}
        </div>

        <h2 id="company-expectations">Company-wise DSA Expectations</h2>
        <p>
          Calibrate difficulty and depth to your target company — studying Google-level DP for a TCS NQT OA wastes time;
          skipping graphs for Amazon SDE guarantees a filter.
        </p>
        <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
          <table className="ie-role-ba-compare-table">
            <caption className="sr-only">DSA difficulty and focus areas by company for India interviews 2026</caption>
            <thead>
              <tr>
                <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Company</th>
                <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">Difficulty</th>
                <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">Focus Areas</th>
                <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--pm">Expected Level</th>
              </tr>
            </thead>
            <tbody>
              {TOP_DSA_COMPANY_ROWS.map((row) => (
                <tr key={row[0]}>
                  <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                  <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[1]}</td>
                  <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[2]}</td>
                  <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="dsa-patterns">DSA Patterns</h2>
        <p>
          Interview problems repeat as patterns, not isolated puzzles. Learn to recognize the pattern first, then map it to
          a template — interviewers grade pattern recognition as much as implementation.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TOP_DSA_PATTERNS.map((item) => (
            <section key={item.pattern} className="ie-blog-card p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.pattern}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--text-primary)' }}>When to use: </strong>
                {item.whenToUse}
              </p>
              <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Common problems:</p>
              <ul className="mt-1 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {item.commonProblems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <h2 id="pattern-topic-map">Interview Patterns vs Topics</h2>
        <p>
          Patterns are reusable templates; topics are the data structures they apply to. Use this map to plan revision —
          when you drill sliding window, prioritize array and string problems first.
        </p>
        <div className="ie-role-ba-table-wrap ie-role-ba-table-wrap--fluid mt-4">
          <table className="ie-role-ba-compare-table">
            <caption className="sr-only">Mapping of DSA interview patterns to relevant topics</caption>
            <thead>
              <tr>
                <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">Pattern</th>
                <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">Relevant Topics</th>
              </tr>
            </thead>
            <tbody>
              {TOP_DSA_PATTERN_TOPIC_ROWS.map((row) => (
                <tr key={row[0]}>
                  <th scope="row" className="ie-role-ba-compare-table__dim">{row[0]}</th>
                  <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 id="top-50-problems">Top 50 Must-Know DSA Problems</h2>
        <p>
          These 50 problems cover the highest-frequency patterns across campus OAs and product company loops. Solve each
          once, then re-solve after 5–7 days without looking at solutions. Focus on pattern recognition, not memorizing code.
        </p>
        <div className="mt-4 space-y-4">
          {TOP_DSA_MUST_KNOW_PROBLEMS.map((group) => (
            <section key={group.topic} className="ie-blog-card p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {group.topic} ({group.problems.length} problems)
              </h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {group.problems.map((problem) => (
                  <li key={problem}>{problem}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

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

        <h2 id="interview-communication">Interview Communication</h2>
        <p>
          Strong DSA knowledge without spoken communication loses offers. Product company panels explicitly grade how you
          think aloud — practice narration as seriously as problem-solving.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {TOP_DSA_COMMUNICATION_TOPICS.map((item) => (
            <section key={item.title} className="ie-blog-card p-4" style={cardStyle}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{item.body}</p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <strong style={{ color: 'var(--accent-success)' }}>Tip: </strong>
                {item.tip}
              </p>
            </section>
          ))}
        </div>

        <h2 id="prep-timeline">Prep timeline: three tracks in parallel</h2>
        <p>
          The line chart below is <strong>illustrative</strong>: it shows how readiness might grow if you keep{' '}
          <strong>core DS</strong>, <strong>pattern depth</strong>, and <strong>mock interviews</strong> moving together.
          Mocks that start too late produce a flat green curve in real life — don&apos;t wait until week 8 to speak out loud.
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

        <h2 id="contextual-links">Related Preparation Guides</h2>
        <p>
          Cross-train with role and company-specific question banks. DSA overlaps heavily with software engineer loops —
          pair this guide with company hubs for your target employers.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TOP_DSA_CONTEXTUAL_LINKS.map((link) => (
            <Link
              key={link.href + link.label}
              href={link.href}
              className="ie-blog-card block p-4 text-sm font-medium leading-snug transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--accent-primary)', background: 'color-mix(in srgb, var(--v3-accdim) 40%, var(--card-bg))' }}
            >
              {link.label} →
            </Link>
          ))}
        </div>

        <h2 id="faq">Frequently Asked Questions</h2>
        <BlogEditorialFaq items={TOP_DSA_FAQ_ITEMS} />

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
      </div>
    </article>
  );
}
