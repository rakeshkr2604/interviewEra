import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';

import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { articleJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';

const PLACEMENT_META_TITLE = 'How to Prepare for Placement Interviews';
const PLACEMENT_CANONICAL_PATH = '/blog/how-to-prepare-for-placement-interviews';
const PLACEMENT_DATE = '2026-05-01';
const ORIGIN = getCanonicalSiteOrigin();

export const metadata: Metadata = generateMetadata({
  title: PLACEMENT_META_TITLE,
  description:
    'A complete guide to cracking placement interviews — from resume prep to final-round system design. Covers DSA, HR rounds, and mock interviews.',
  path: PLACEMENT_CANONICAL_PATH,
  socialTitle: brandArticleOgTitle(PLACEMENT_META_TITLE),
  keywords:
    'placement interview preparation, how to crack placement interviews, campus placement tips, placement preparation guide, interview preparation India',
  openGraphType: 'article',
});

const PLACEMENT_ARTICLE_LD = articleJsonLd({
  headline: PLACEMENT_META_TITLE,
  description: 'A complete guide to cracking placement interviews — from resume prep to final-round system design. Covers DSA, HR rounds, and mock interviews.',
  canonicalUrl: canonicalUrl(PLACEMENT_CANONICAL_PATH),
  datePublished: PLACEMENT_DATE,
  authorName: 'InterviewEra Team',
  publisherId: schemaIds.organization,
});

const PLACEMENT_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Placement Interview Guide', path: PLACEMENT_CANONICAL_PATH },
  ],
  ORIGIN,
);

export default function HowToPrepareForPlacementInterviews() {
  return (
    <>
      <JsonLdScript id="placement-article-ld" data={PLACEMENT_ARTICLE_LD} />
      <JsonLdScript id="placement-breadcrumb-ld" data={PLACEMENT_BREADCRUMB_LD} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
      <article className="ie-blog-prose mx-auto w-full max-w-3xl xl:max-w-[48rem] 2xl:max-w-[52rem]">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            Placement Guide
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
            How to Prepare for Placement Interviews: A Complete Guide for Indian Students
          </h1>
          <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            Whether you're a final-year B.Tech student or preparing for off-campus drives, this
            guide covers every stage of placement preparation — from your first DSA revision to
            acing the HR round.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>15 min read</span>
            <span aria-hidden>·</span>
            <span>Updated April 2026</span>
          </div>
        </header>

        <nav className="ie-blog-card mb-10 p-5 sm:mb-12 sm:p-6" aria-label="In this article">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
            In this article
          </p>
          <ol className="m-0 list-decimal space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {[
              ['#understand-the-process', 'Understanding the placement process'],
              ['#timeline', 'Building a 90-day preparation timeline'],
              ['#dsa', 'Mastering DSA for technical rounds'],
              ['#projects', 'Strengthening your projects and resume'],
              ['#hr-round', 'Acing the HR and behavioral round'],
              ['#mock-interviews', 'Why mock interviews matter'],
              ['#day-of', 'What to do on interview day'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="ie-blog-inline-link font-medium">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <h2 id="understand-the-process">Understanding the Placement Process</h2>
        <p>
          Campus placement interviews in India typically follow a structured pipeline. Companies
          visiting your campus will assess you across multiple rounds, each designed to filter
          candidates at a different level. Understanding this pipeline is the first step to
          preparing efficiently.
        </p>
        <p>Most companies follow a process that looks like this:</p>
        <ol>
          <li>
            <strong>Online Assessment (OA):</strong> A timed test covering aptitude, coding
            problems (usually 2–3), and sometimes verbal reasoning. This is your first hurdle.
          </li>
          <li>
            <strong>Technical Interview Round 1:</strong> DSA problems, core CS concepts
            (OS, DBMS, networking), and project-related questions. Usually 45–60 minutes.
          </li>
          <li>
            <strong>Technical Interview Round 2:</strong> Deeper technical discussion — system
            design basics, code quality, problem-solving approach. Common at product companies.
          </li>
          <li>
            <strong>HR / Managerial Round:</strong> Behavioral questions, cultural fit, salary
            discussion, career goals. Often underestimated, rarely unprepared for correctly.
          </li>
        </ol>
        <p>
          Service companies (TCS, Infosys, Wipro) lean heavily on the OA and a single HR round.
          Product companies (Google, Microsoft, Flipkart, Razorpay) will put you through
          multiple technical rounds and sometimes a system design discussion. Know which type of
          company you're targeting and prepare accordingly.
        </p>

        <h2 id="timeline">Building a 90-Day Preparation Timeline</h2>
        <p>
          Ninety days is enough time to go from "I haven't touched DSA since second year" to
          confidently walking into interviews — if you're systematic about it. Here's a framework
          that works:
        </p>
        <h3>Days 1–30: Foundations</h3>
        <p>
          Spend this month on fundamentals. Revise arrays, strings, linked lists, stacks, queues,
          trees, and basic sorting algorithms. Aim for 2–3 LeetCode Easy problems per day,
          focusing on understanding patterns rather than memorizing solutions. Simultaneously,
          revise your core CS subjects: OS concepts (process, threads, scheduling), basic DBMS
          (normalization, SQL joins), and networking (TCP/IP, HTTP, DNS).
        </p>
        <h3>Days 31–60: Intermediate DSA + Projects</h3>
        <p>
          Move to Medium-difficulty problems. Focus on: binary search, two pointers, sliding
          window, recursion + backtracking, dynamic programming basics, and graphs (BFS/DFS).
          Simultaneously, revisit your resume projects. For each project, be ready to explain
          the problem it solved, the tech stack you used, a technical challenge you faced, and
          the impact or outcome. Practice explaining your projects in 2 minutes out loud.
        </p>
        <h3>Days 61–90: Mock Interviews + Company-Specific Prep</h3>
        <p>
          This is the stage most students skip — and it's the most important. Doing problems on
          your own is not the same as solving them under pressure in front of an interviewer.
          Schedule mock interviews weekly. Use AI mock interview tools like{' '}
          <Link href="/signup" className="ie-blog-inline-link">
            InterviewEra
          </Link>{' '}
          to simulate real rounds and get instant feedback on your answers. Research the
          companies visiting your campus, study their interview patterns (available on Glassdoor
          and LeetCode Discuss), and focus your final weeks on relevant problem types.
        </p>

        <h2 id="dsa">Mastering DSA for Technical Rounds</h2>
        <p>
          DSA is the backbone of most technical interviews at product companies. The goal is not
          to solve every problem on LeetCode — it's to deeply understand a set of patterns that
          appear repeatedly.
        </p>
        <h3>High-priority topics (cover these first)</h3>
        <ul>
          <li>Arrays and strings — two pointers, sliding window, prefix sums</li>
          <li>Linked lists — reversal, cycle detection, merge operations</li>
          <li>Trees and binary search trees — traversals, path problems, BST operations</li>
          <li>Dynamic programming — 0/1 knapsack, LCS, coin change, DP on strings</li>
          <li>Graphs — BFS, DFS, topological sort, shortest paths (Dijkstra)</li>
          <li>Hash maps — frequency counting, two-sum pattern, grouping</li>
          <li>Binary search — on sorted arrays and on answer spaces</li>
        </ul>
        <h3>How to practice effectively</h3>
        <p>
          Don't just solve a problem and move on. After solving, spend 5 minutes asking: What
          pattern did this use? What would change the approach? Could I solve this in a different
          way? This meta-thinking is what separates candidates who can solve new problems from
          those who can only recognize ones they've seen before.
        </p>
        <p>
          Set a 20-minute timer per problem. If you haven't made meaningful progress, look at
          the hints — not the full solution. Understand the approach, close the tab, and write
          the solution yourself. Re-attempt the same problem 3 days later without looking.
        </p>
        <p>
          You can also use our free{' '}
          <Link href="/tools/question-generator" className="ie-blog-inline-link">
            interview question generator
          </Link>{' '}
          to get targeted questions for your specific role.
        </p>

        <h2 id="projects">Strengthening Your Projects and Resume</h2>
        <p>
          Your resume is what gets you to the interview. Your projects are what keep you in the
          conversation once you're there.
        </p>
        <h3>Resume tips for placement season</h3>
        <ul>
          <li>
            <strong>One page, no exceptions</strong> for students with under 2 years of experience.
          </li>
          <li>
            <strong>Quantify impact:</strong> "Reduced API latency by 40%" beats "Optimized API
            performance" every time.
          </li>
          <li>
            <strong>ATS compatibility:</strong> Most companies use Applicant Tracking Systems
            that parse your resume before a human sees it. Use our free{' '}
            <Link href="/tools/ats-checker" className="ie-blog-inline-link">
              ATS resume checker
            </Link>{' '}
            to scan your resume for common issues.
          </li>
          <li>
            <strong>Tailor for roles:</strong> If you're applying to both SWE and Data roles,
            maintain two versions of your resume.
          </li>
        </ul>
        <h3>Making your projects interview-ready</h3>
        <p>
          For each project, prepare answers to: What was the problem? What did you build? What
          was hard? What would you do differently? What was the impact? If you can answer these
          fluently, you can fill 15 minutes of technical interview time with one project alone.
        </p>

        <h2 id="hr-round">Acing the HR and Behavioral Round</h2>
        <p>
          The HR round is not a formality. Companies use it to assess communication skills,
          cultural fit, and self-awareness. Many technically strong candidates fail here because
          they treat it as a checkbox.
        </p>
        <h3>Questions you will almost certainly face</h3>
        <ul>
          <li>"Tell me about yourself." — Have a 90-second structured answer ready.</li>
          <li>"What is your greatest strength/weakness?"</li>
          <li>"Tell me about a time you failed."</li>
          <li>"Where do you see yourself in 5 years?"</li>
          <li>"Why do you want to work here specifically?"</li>
        </ul>
        <h3>Using the STAR method</h3>
        <p>
          For any behavioral question ("Tell me about a time when…"), use the STAR method:
          Situation, Task, Action, Result. This gives your answers structure and keeps them
          concise. Practice using our free{' '}
          <Link href="/tools/star-builder" className="ie-blog-inline-link">
            STAR method answer builder
          </Link>
          .
        </p>
        <p>
          The most important rule for HR rounds: be specific. "I am a team player" says nothing.
          "In my final-year project, when our deadline moved up by 3 weeks, I reorganized our
          sprints and we delivered on time" says everything.
        </p>

        <h2 id="mock-interviews">Why Mock Interviews Matter More Than Problem Solving</h2>
        <p>
          Here's a truth that most preparation guides don't tell you: solving 300 LeetCode
          problems but never doing a mock interview is a terrible preparation strategy.
        </p>
        <p>
          Real interviews test you on problem-solving <em>under pressure</em> — with someone
          watching, with a time constraint, while you're expected to think out loud. These are
          skills that only improve with deliberate practice in interview conditions, not with
          solo coding sessions at midnight.
        </p>
        <p>
          Mock interviews help you: catch habits that hurt your performance (like going silent for
          5 minutes), practice thinking out loud, get used to the psychological pressure, and
          identify gaps in your explanation skills (you might know the answer but struggle to
          communicate it clearly).
        </p>
        <p>
          AI-powered tools like{' '}
          <Link href="/signup" className="ie-blog-inline-link">
            InterviewEra
          </Link>{' '}
          let you run unlimited mock interviews tailored to your resume and target role, with
          instant AI feedback on each answer. Use them. Frequently.
        </p>

        <h2 id="day-of">What to Do on Interview Day</h2>
        <p>
          By interview day, your preparation window is closed. What matters now is execution.
        </p>
        <ul>
          <li>
            <strong>Think out loud from the start.</strong> Interviewers want to follow your
            reasoning. Silence is the enemy.
          </li>
          <li>
            <strong>Clarify before solving.</strong> Ask about edge cases, constraints, and
            expected input/output before writing a single line of code.
          </li>
          <li>
            <strong>Start with the brute force.</strong> State the naive solution first, its
            complexity, then optimize. Never jump straight to the optimal if you haven't
            explained the path.
          </li>
          <li>
            <strong>Test your own code.</strong> Walk through a small example. Find the bug
            before they do.
          </li>
          <li>
            <strong>Have questions ready.</strong> At the end, ask something genuine about the
            team, the tech stack, or the problem space. It signals interest.
          </li>
        </ul>
        <p>
          Placements are a marathon, not a sprint. Build your foundation early, practice with
          real interview conditions, and trust the process. Good luck.
        </p>

        <div className="mt-12 sm:mt-16">
          <FreeToolCtaBlock
            title="Ready to practice with real AI interviews?"
            body="Upload your resume and get a custom mock interview with instant AI feedback."
            href="/signup"
            ctaLabel="Start free"
          />
        </div>
      </article>
    </BlogMarketingShell>
    </>
  );
}
