import Link from 'next/link'
import type { ReactNode } from 'react'
import {
  BlogCallout,
  BlogChecklist,
  BlogFigure,
  BlogPremiumHero,
  BlogPrevNext,
  BlogProductCta,
  BlogReadingShell,
  BlogRelatedArticles,
  BlogTimeline,
  type BlogNavLink,
  type BlogRelatedCard,
} from '@/components/blog/design-system'
import { LandingFaqCategorized } from '@/components/landing/faq/LandingFaqCategorized'
import '@/components/landing/faq/LandingFaq.css'
import {
  AMAZON_LP_OFFICIAL_URL,
  AMAZON_OA_OFFICIAL_URL,
  AMAZON_SDE_INTERN_CANONICAL_PATH,
  AMAZON_SDE_INTERN_FAQ_CATEGORIES,
  AMAZON_SDE_INTERN_HERO_ALT,
  AMAZON_SDE_INTERN_HERO_PATH,
  AMAZON_SDE_INTERN_IMAGES,
  AMAZON_SDE_INTERN_META_DESCRIPTION,
  AMAZON_SDE_INTERN_READING_TIME,
  AMAZON_SDE_INTERN_TOC,
} from '@/lib/seo/blog/amazon-sde-intern-2026'

function Evidence({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-[var(--accent-primary)]">{children}</span>
}

const RELATED_POSTS = [
  {
    href: '/blog/what-is-star-method-with-examples',
    title: 'What Is the STAR Method (With Examples)',
    teaser: 'Structure Ownership and Deliver Results stories the way Amazon interviewers probe them.',
  },
  {
    href: '/blog/top-dsa-interview-questions',
    title: 'Top DSA Interview Questions & Topic Map',
    teaser: 'Pattern frequency and a four-week coding roadmap for OA and live rounds.',
  },
  {
    href: '/blog/how-to-get-internship-opportunities',
    title: "Why Good Students Don't Get Internships",
    teaser: 'Signal → Volume → Conversion for internship applications beyond Amazon.',
  },
  {
    href: '/interview-questions/companies/amazon/software-engineer',
    title: 'Amazon Software Engineer Interview Hub',
    teaser: 'OA, Leadership Principles, Bar Raiser context, and SWE loop prep.',
  },
] as const

/**
 * Live rendering of content/blog/amazon-sde-intern-interview-experience-2026.md
 * (Community Synthesis + Editorial Guide). Markdown file is not modified.
 */
type AmazonSdeInternArticleProps = {
  related?: readonly BlogRelatedCard[]
  previous?: BlogNavLink | null
  next?: BlogNavLink | null
}

export function AmazonSdeInternArticle({
  related = [],
  previous = null,
  next = null,
}: AmazonSdeInternArticleProps = {}) {
  return (
    <BlogReadingShell
      sections={AMAZON_SDE_INTERN_TOC}
      shareUrl={AMAZON_SDE_INTERN_CANONICAL_PATH}
      shareTitle="Amazon SDE I Intern Interview Experience 2026"
      readTime={AMAZON_SDE_INTERN_READING_TIME}
    >
    <article className="ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-blog-prose--premium mx-auto w-full">
      <div className="ie-blog-ds-content">
      <BlogPremiumHero
        breadcrumbs={[
          { label: 'Home', href: '/' },
          { label: 'Blog', href: '/blog' },
          { label: 'Amazon SDE Intern 2026' },
        ]}
        category="Interview Experiences"
        title="Amazon SDE I Intern Interview Experience 2026 (University Hiring)"
        description={AMAZON_SDE_INTERN_META_DESCRIPTION}
        readTime={AMAZON_SDE_INTERN_READING_TIME}
        updatedLabel="Updated August 2026"
        author="InterviewEra Editorial"
        badges={[
          { label: 'Amazon', tone: 'accent' },
          { label: 'Medium-Hard', tone: 'warning' },
          { label: 'University Hiring', tone: 'info' },
        ]}
        tags={['SDE Intern', 'OA', 'Leadership Principles', 'DSA', 'Campus']}
        heroSrc={AMAZON_SDE_INTERN_HERO_PATH}
        heroAlt={AMAZON_SDE_INTERN_HERO_ALT}
        summary={
          <p>
            Community synthesis + editorial guide covering Amazon SDE Intern OA (~90 min official baseline),
            interview patterns, Leadership Principles, and a 30-day preparation roadmap.
          </p>
        }
      />

        <BlogCallout variant="editorial">
          <p>
            This article is an editorial synthesis based on official company documentation, publicly available
            candidate reports, and InterviewEra editorial analysis. It is not the personal interview experience of a
            single candidate. Hiring processes can vary by university, recruiter, region, role, and hiring cycle.
          </p>
        </BlogCallout>
<p>
          <Evidence>[Official]</Evidence> · <Evidence>[Community]</Evidence> ·{' '}
          <Evidence>[InterviewEra Insight]</Evidence> · <Evidence>[Observation]</Evidence> labels
          mark evidence sources throughout.
        </p>

        <p>
          If you are preparing for Amazon SDE Intern university hiring in 2026, you need more than
          &ldquo;do DSA and Leadership Principles.&rdquo;
        </p>
        <p>
          You need a clear map of the official OA baseline, what candidates commonly report next, and
          how to practice without wasting weeks.
        </p>
        <p>
          Trust your recruiter email and official posting over social media screenshots.
        </p>

        <h2 id="quick-background">Quick background</h2>
        <p>
          <strong>Role focus:</strong> Software Development Engineer Intern (often listed as SDE Intern
          / SDE I Intern).
        </p>
        <p>
          <strong>Audience:</strong> final-year students, pre-final students (if eligible), freshers
          targeting early-career pipelines.
        </p>
        <p>
          <strong>Core skills tested:</strong> coding under time pressure + behavioral alignment with
          Leadership Principles.
        </p>
        <p>
          <Evidence>[Observation]</Evidence> Amazon-style intern interviews usually fail candidates who
          prepare only coding or only behavioral answers. Both matter.
        </p>

        <h2 id="company-overview">Company overview</h2>
        <p>
          Amazon evaluates student and graduate SDE candidates for technical problem-solving and
          behavioral skills aligned with its mission to be Earth&apos;s most customer-centric company.
        </p>
        <p>
          <Evidence>[Official]</Evidence> Amazon publishes university SDE OA and interview preparation
          guidance on amazon.jobs, including a dedicated Online Assessment page for student/graduate
          SDE roles.
        </p>
        <p>
          You do not need Amazon product trivia to clear OA. You do need clear coding fundamentals and
          consistent workplace judgment.
        </p>
        <BlogCallout variant="interview" title="Interview Insight"><p>Interviewers care about how you recover when your first approach fails. Recovery behavior often signals Dive Deep, Learn and Be Curious, and Deliver Results more clearly than a memorized optimal solution.</p></BlogCallout>

        <h2 id="internship-details">Internship details</h2>
        <p>
          Exact stipend, duration, and location depend on the official posting for your cycle. Do not
          invent numbers from unofficial lists.
        </p>
        <div className="ie-blog-table-wrap overflow-x-auto">
          <table className="ie-role-ba-compare-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Detail</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Role title</td>
                <td>Confirm on posting (SDE Intern / SDE I Intern naming varies)</td>
              </tr>
              <tr>
                <td>Duration</td>
                <td>Posting-dependent</td>
              </tr>
              <tr>
                <td>Location / work mode</td>
                <td>Posting-dependent</td>
              </tr>
              <tr>
                <td>Tech stack</td>
                <td>Team-dependent</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <Evidence>[Community]</Evidence> Candidates in India university / early-career cycles
          commonly discuss internship windows in the multi-month range and major tech city locations.
          Treat those as reports, not guarantees.
        </p>
        <p>
          <Evidence>[InterviewEra Insight]</Evidence> Never copy last year&apos;s campus drive
          assumptions into this year&apos;s application. Read the current posting line by line.
        </p>

        <h2 id="why-this-guide">Why this guide matters</h2>
        <p>Most students prepare randomly:</p>
        <ul>
          <li>200 LeetCode problems with no pattern revision</li>
          <li>zero Leadership Principle stories</li>
          <li>one silent mock the night before OA</li>
        </ul>
        <p>
          <Evidence>[InterviewEra Insight]</Evidence> Amazon conversion usually comes from timed
          pattern practice + spoken explanation + STAR stories with metrics.
        </p>

        <h2 id="what-you-will-learn">What you will learn</h2>
        <ul>
          <li>Official internship OA structure baseline</li>
          <li>Community-reported interview round patterns</li>
          <li>How to prepare DSA, CS fundamentals, projects, and LPs</li>
          <li>Representative coding/behavioral examples (not claimed leaked questions)</li>
          <li>A 30-day roadmap and checklist</li>
          <li>Mistakes that quietly reduce offer chances</li>
        </ul>

        <h2 id="overview-table">Amazon SDE Internship 2026 overview</h2>
        <div className="ie-blog-table-wrap overflow-x-auto">
          <table className="ie-role-ba-compare-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Field</th>
                <th>Summary</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Company</td>
                <td>Amazon</td>
                <td>Official naming</td>
              </tr>
              <tr>
                <td>Role</td>
                <td>SDE Intern / SDE I Intern</td>
                <td>Confirm posting</td>
              </tr>
              <tr>
                <td>Hiring</td>
                <td>University / early-career</td>
                <td>Varies by program</td>
              </tr>
              <tr>
                <td>Duration</td>
                <td>Posting-dependent</td>
                <td>Do not invent</td>
              </tr>
              <tr>
                <td>OA</td>
                <td>Coding + Workstyles + Feedback (~90 min internship OA)</td>
                <td>[Official]</td>
              </tr>
              <tr>
                <td>Interview rounds</td>
                <td>Often 1–2 technical interviews after OA</td>
                <td>[Community]</td>
              </tr>
              <tr>
                <td>Difficulty</td>
                <td>Medium–Hard overall</td>
                <td>[Community] + [Observation]</td>
              </tr>
              <tr>
                <td>Result</td>
                <td>Offer / reject / hold; timelines vary</td>
                <td>[Community]</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 id="job-description">Amazon SDE Intern job description themes</h2>
        <p>
          Do not invent eligibility, salary, or required coursework. Use your official job description.
          Themes below are common for university SDE Intern postings and should be verified against
          your listing.
        </p>
        <h3>Responsibilities (typical themes)</h3>
        <ul>
          <li>Build and test software with mentor guidance</li>
          <li>Write maintainable code and participate in reviews</li>
          <li>Debug issues with increasing independence</li>
          <li>Collaborate with engineers and stakeholders</li>
          <li>Communicate progress clearly</li>
        </ul>
        <h3>Technologies & preferred skills</h3>
        <p>
          Stack is team-dependent. Candidates often work with Java / C++ / Python, Git, testing, APIs,
          and data stores. Preferred signals: DSA fundamentals, clear communication, project ownership,
          and fast learning under feedback.
        </p>
        <p>
          <strong>Eligibility / locations / expected knowledge:</strong> confirm on the posting. Do not
          rely on unofficial Telegram lists for CGPA cutoffs, branch rules, or location guarantees.
        </p>
        <BlogCallout variant="recruiter" title="Recruiter Note"><p>Recruiters rarely expect interns to know every cloud service. They do expect you to explain what you built, why you chose an approach, what broke, and what you fixed.</p></BlogCallout>

        <h2 id="hiring-timeline">Hiring timeline</h2>
        <BlogFigure src={AMAZON_SDE_INTERN_IMAGES.timeline.src} alt={AMAZON_SDE_INTERN_IMAGES.timeline.alt} caption={AMAZON_SDE_INTERN_IMAGES.timeline.caption} />
        <BlogTimeline
          ariaLabel="Amazon SDE Intern hiring timeline"
          steps={[
            { title: 'Application', description: 'Campus portal / Amazon university careers / recruiter shortlist' },
            { title: 'OA invitation', description: 'Deadline + setup instructions' },
            { title: 'Online Assessment', description: 'Coding + workstyles + feedback survey' },
            { title: 'Interview invite', description: 'If shortlisted for that window' },
            { title: 'Round 1', description: 'Coding + project/LP discussion (community pattern)' },
            { title: 'Round 2', description: 'Deeper coding and/or stronger LP probing (community pattern)' },
            { title: 'Recruiter communication', description: 'Update / additional loop / decision' },
            { title: 'Offer', description: 'If selected; details in offer documents' },
          ]}
        />
        <p>
          <Evidence>[Community]</Evidence> Some campuses compress rounds. Some candidates wait longer
          between OA and interviews. Plan for variance.
        </p>

        <h2 id="preparation-strategy">Preparation strategy</h2>
        <h3>DSA</h3>
        <div className="ie-blog-table-wrap overflow-x-auto">
          <table className="ie-role-ba-compare-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Why it matters</th>
                <th>Practice focus</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Arrays', 'Base for OA and live coding', 'Two pointers, prefix sums'],
                ['Strings', 'Frequent warm-up / OA pattern', 'Windows, parsing, hashing'],
                ['Trees', 'Common live interview topic', 'DFS/BFS, recursion control'],
                ['Graphs', 'Separates strong solvers', 'Modeling + traversal'],
                ['Binary Search', 'Clean reasoning signal', 'Search-space design'],
                ['Sliding Window', 'High OA frequency in community reports', 'Fixed + variable windows'],
                ['HashMap', 'Lookup / frequency problems', 'Complexity + edge cases'],
                ['DP', 'Appears in harder prompts', 'State definition first'],
                ['Greedy', 'Fast correctness checks', 'Counterexamples'],
                ['Heaps', 'Top-K / scheduling style', 'Trade-off clarity'],
              ].map(([topic, why, focus]) => (
                <tr key={topic}>
                  <td>{topic}</td>
                  <td>{why}</td>
                  <td>{focus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3>CS fundamentals</h3>
        <div className="ie-blog-table-wrap overflow-x-auto">
          <table className="ie-role-ba-compare-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Area</th>
                <th>Interview-ready depth</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>OOP</td>
                <td>Classes, composition vs inheritance, practical design</td>
              </tr>
              <tr>
                <td>OS</td>
                <td>Threads vs processes, deadlock basics, memory awareness</td>
              </tr>
              <tr>
                <td>DBMS</td>
                <td>Keys, joins, indexing, transactions</td>
              </tr>
              <tr>
                <td>CN</td>
                <td>HTTP, TCP vs UDP, DNS high-level</td>
              </tr>
            </tbody>
          </table>
        </div>
        <h3>Projects, resume, Leadership Principles</h3>
        <p>
          Prepare 1–2 projects you can defend for 10 minutes: problem, your contribution, architecture
          choice, biggest bug, metric/outcome, and what you would rebuild.
        </p>
        <p>
          Write ownership clearly on your resume (action + system + metric). Before applying, review
          formatting with InterviewEra&apos;s{' '}
          <Link href="/tools/ats-checker" className="ie-blog-inline-link">
            ATS Resume Checker
          </Link>
          .
        </p>
        <p>
          Prepare <strong>8–12 STAR stories</strong>. Rehearse follow-ups: What did <em>you</em> do?
          What metric changed? What would you do differently?
        </p>
        <BlogCallout variant="tip" title="Purple Tip"><p>A practical prep ratio for most students: 60% timed DSA · 25% LP stories · 15% project + CS fundamentals. Pure LeetCode grinding is incomplete Amazon prep.</p></BlogCallout>

        <h2 id="online-assessment">Online Assessment experience</h2>
        <BlogFigure src={AMAZON_SDE_INTERN_IMAGES.oa.src} alt={AMAZON_SDE_INTERN_IMAGES.oa.alt} caption={AMAZON_SDE_INTERN_IMAGES.oa.caption} />
        <p>
          This OA section combines <Evidence>[Official]</Evidence> structure with{' '}
          <Evidence>[Community]</Evidence> difficulty reports and{' '}
          <Evidence>[InterviewEra Insight]</Evidence> tactics. It is not a claim that every campus
          receives identical prompts.
        </p>
        <h3>Structure</h3>
        <p>
          <Evidence>[Official]</Evidence> For SDE internships, Amazon&apos;s university OA guidance
          states the OA takes about <strong>90 minutes</strong> and includes:
        </p>
        <ol>
          <li>Coding Assessment — average ~70 minutes</li>
          <li>Workstyles Assessment — average ~15 minutes</li>
          <li>Feedback Survey — average ~5 minutes</li>
        </ol>
        <p>
          Source:{' '}
          <a href={AMAZON_OA_OFFICIAL_URL} className="ie-blog-inline-link" rel="noopener noreferrer" target="_blank">
            amazon.jobs — Online assessment prep for SDE roles
          </a>
          . Amazon also notes OA details can differ by country/role. Follow your invitation email.
        </p>
        <h3>Coding & Workstyles</h3>
        <ul>
          <li>
            <Evidence>[Official]</Evidence> Practice using Amazon&apos;s Online Assessment Practice
            Test when available
          </li>
          <li>
            <Evidence>[Official]</Evidence> Publicly accessible online resources may be allowed during
            coding, with restrictions
          </li>
          <li>
            <Evidence>[Official]</Evidence> Avoid prohibited actions such as print-screen behavior that
            can terminate the session
          </li>
          <li>
            <Evidence>[Official]</Evidence> Complete the feedback survey — failure to complete it can
            delay results/next steps
          </li>
          <li>
            <Evidence>[Community]</Evidence> Candidates commonly report two DSA-style coding problems
          </li>
          <li>
            <Evidence>[InterviewEra Insight]</Evidence> Answer Workstyles as one consistent person
          </li>
        </ul>
        <h3>Representative coding themes</h3>
        <p>
          <strong>Theme 1:</strong> Sliding window / frequency constraints (practice theme — not a
          claimed leaked item). Restate constraints → confirm brute force → window + HashMap →
          validate edge cases. Typical complexity O(n) time, O(k) space.
        </p>
        <p>
          <strong>Theme 2:</strong> Trees / graphs / heap-based selection. Model the structure, explain
          BFS/DFS/heap choice, handle empty/disconnected inputs, ship correct slower solution then
          optimize.
        </p>
        <BlogCallout variant="success" title="Success Tip"><p>Take the official practice test when available, set up webcam and bandwidth early, solve the easier coding prompt first if both are visible, keep Workstyles consistent, and submit the feedback survey immediately.</p></BlogCallout>

        <h2 id="round-1">Interview Round 1 (representative walkthrough)</h2>
        <p>
          <Evidence>[Community]</Evidence> After OA, many university-hiring candidates report at least
          one technical interview mixing coding with project and Leadership Principle discussion. This
          is a representative walkthrough, not one person&apos;s private transcript.
        </p>
        <ul>
          <li>60–90 second intro: who you are, what you study, one project, why SDE internship</li>
          <li>Project probes: hardest bug, stack choice, success metric, what you would change</li>
          <li>Often one medium DSA problem with follow-ups ([Community])</li>
          <li>
            LP examples candidates commonly report: ownership beyond assigned work; handling
            disagreement
          </li>
        </ul>
        <p>
          Common mistakes: coding before clarifying constraints, silent coding, &ldquo;we did
          everything,&rdquo; ignoring behavioral questions in a &ldquo;technical&rdquo; round.
        </p>
        <BlogCallout variant="interview" title="Interview Insight"><p>If you get stuck, narrate your debug process. Many interviewers evaluate thinking quality under uncertainty, not only minute-one optimality.</p></BlogCallout>

        <h2 id="round-2">Interview Round 2 (representative walkthrough)</h2>
        <p>
          <Evidence>[Community]</Evidence> A second round, when scheduled, is often deeper on coding
          rigor and Leadership Principle follow-ups.
        </p>
        <ul>
          <li>Sharper project probes: bottlenecks, failure modes, rejected trade-offs</li>
          <li>
            Medium–hard themes commonly discussed: DP state design, constrained graph traversal,
            hashing + sorting
          </li>
          <li>
            Deeper LP prompts: tight deadline delivery, failure + learning, dive-deep root cause
          </li>
        </ul>
        <p>
          <Evidence>[InterviewEra Insight]</Evidence> Candidates who convert often need a hint — and
          use it well — then finish with working code plus a strong STAR story.
        </p>

        <h2 id="leadership-principles">Leadership Principles</h2>
        <BlogFigure src={AMAZON_SDE_INTERN_IMAGES.leadership.src} alt={AMAZON_SDE_INTERN_IMAGES.leadership.alt} caption={AMAZON_SDE_INTERN_IMAGES.leadership.caption} />
        <p>
          <Evidence>[Official]</Evidence> Amazon publicly documents its Leadership Principles and uses
          them in hiring conversations. Official reference:{' '}
          <a href={AMAZON_LP_OFFICIAL_URL} className="ie-blog-inline-link" rel="noopener noreferrer" target="_blank">
            Amazon Leadership Principles
          </a>
          .
        </p>
        <div className="ie-blog-table-wrap overflow-x-auto">
          <table className="ie-role-ba-compare-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Leadership Principle</th>
                <th>What strong answers show</th>
                <th>Student-friendly example angle</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Ownership', 'You fixed issues beyond a narrow task list', 'Unblocked a broken module without waiting to be assigned'],
                ['Customer Obsession', 'You optimized for end-user outcome', 'Changed a feature after tester/user feedback'],
                ['Learn & Be Curious', 'You taught yourself under pressure', 'Learned a library mid-project to ship'],
                ['Bias for Action', 'You decided with incomplete data, responsibly', 'Shipped MVP with rollback plan'],
                ['Deliver Results', 'You finished despite obstacles', 'Hit a demo after a mid-project failure'],
                ['Dive Deep', 'You inspected evidence, not guesses', 'Used logs/metrics to find root cause'],
                ['Invent & Simplify', 'You reduced complexity', 'Replaced a messy flow with a simpler design'],
              ].map(([lp, show, example]) => (
                <tr key={lp}>
                  <td>{lp}</td>
                  <td>{show}</td>
                  <td>{example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <BlogCallout variant="editorial" title="Quote"><p>Don't say you are customer-obsessed. Show one decision where the customer outcome beat your convenience.</p></BlogCallout>

        <h2 id="technical-questions">Technical questions</h2>
        <p>
          Practice DSA themes (sliding window, trees, graphs, binary search, heaps, DP), plus OOP,
          DBMS, OS, and CN probes at interview depth — not textbook memorization. Language fluency
          matters less than correct code under pressure and clear complexity reasoning.
        </p>

        <h2 id="behavioral-questions">Behavioral questions</h2>
        <p>
          Use STAR every time: Situation (2–3 lines), Task, Action (longest, personal), Result (metric
          + learning). High-frequency prompts candidates and coaches rehearse: conflict, failure, too
          many tasks, feedback that changed a plan, learning quickly, incomplete information.
        </p>
        <p>
          For deeper STAR practice, see{' '}
          <Link href="/blog/what-is-star-method-with-examples" className="ie-blog-inline-link">
            STAR method with examples
          </Link>
          .
        </p>

        <h2 id="coding-summary">Coding questions summary</h2>
        <div className="ie-blog-table-wrap overflow-x-auto">
          <table className="ie-role-ba-compare-table w-full text-left text-sm">
            <thead>
              <tr>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Pattern</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Substring/subarray constraint', 'Medium', 'Sliding window + HashMap'],
                ['Merge intervals', 'Medium', 'Sort + sweep'],
                ['Path sum / LCA-style', 'Medium', 'Tree DFS'],
                ['Dependency ordering', 'Medium', 'Graph + topo sort'],
                ['Top K frequent', 'Medium', 'Heap / HashMap'],
                ['Sequence DP', 'Medium–Hard', 'DP states'],
                ['Grid DFS/BFS', 'Medium', 'Flood fill / search'],
                ['Rotated search', 'Medium', 'Binary search'],
              ].map(([topic, diff, pattern]) => (
                <tr key={topic}>
                  <td>{topic}</td>
                  <td>{diff}</td>
                  <td>{pattern}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Practice under a timer, then explain out loud. Use InterviewEra&apos;s{' '}
          <Link href="/tools/question-generator" className="ie-blog-inline-link">
            Interview Question Generator
          </Link>{' '}
          and{' '}
          <Link href="/blog/top-interview-questions-for-software-engineers" className="ie-blog-inline-link">
            software engineer interview guide
          </Link>{' '}
          for drills.
        </p>

        <h2 id="thirty-day-roadmap">30-day preparation roadmap</h2>
        <BlogFigure src={AMAZON_SDE_INTERN_IMAGES.roadmap.src} alt={AMAZON_SDE_INTERN_IMAGES.roadmap.alt} caption={AMAZON_SDE_INTERN_IMAGES.roadmap.caption} />
        <ol>
          <li>
            <strong>Week 1 — Foundations:</strong> arrays, strings, hashing, two pointers; 2 timed
            sets; draft 6 STAR stories; clean resume
          </li>
          <li>
            <strong>Week 2 — OA simulation:</strong> sliding window, binary search, trees; 3 timed
            OA-style mocks; Workstyles consistency; project deep dives
          </li>
          <li>
            <strong>Week 3 — Depth + live skills:</strong> graphs, heaps, intro DP; speak-while-coding;
            LP follow-ups; 2 mock interviews
          </li>
          <li>
            <strong>Week 4 — Conversion polish:</strong> weak-pattern revision; 2 harder mocks;
            finalize 10–12 STAR stories; sleep + setup checklist
          </li>
        </ol>
        <BlogCallout variant="success" title="Weekly Non-Negotiables"><p>1 mock interview · 1 resume/project review · 1 LP story rewrite with metrics</p></BlogCallout>

        <h2 id="resources">Resources</h2>
        <ul>
          <li>
            <a href={AMAZON_OA_OFFICIAL_URL} className="ie-blog-inline-link" rel="noopener noreferrer" target="_blank">
              amazon.jobs SDE OA page
            </a>{' '}
            — official OA expectations
          </li>
          <li>
            <a href={AMAZON_LP_OFFICIAL_URL} className="ie-blog-inline-link" rel="noopener noreferrer" target="_blank">
              Amazon Leadership Principles
            </a>{' '}
            — exact LP language
          </li>
          <li>LeetCode, InterviewBit, TakeUForward / Striver Sheet, NeetCode — practice patterns</li>
          <li>
            <Link href="/signup" className="ie-blog-inline-link">
              InterviewEra AI Mock Interview
            </Link>{' '}
            — live coding + behavioral rehearsal
          </li>
          <li>
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="ie-blog-inline-link">
              Career / placement roadmaps
            </Link>
          </li>
        </ul>

        <h2 id="common-mistakes">Common mistakes</h2>
        <BlogCallout variant="warning" title="Warning"><p>Random 'leaked Amazon questions' PDFs are a weak strategy. Patterns transfer. PDFs expire. Process details can differ by university, region, hiring team, and recruiter.</p></BlogCallout>
        <ol>
          <li>DSA-only prep with zero LP stories</li>
          <li>Memorizing solutions without patterns</li>
          <li>Silent mocks, then freezing in real interviews</li>
          <li>Project stories with no metrics</li>
          <li>Inconsistent Workstyles answers</li>
          <li>Skipping OA edge cases</li>
          <li>Overusing &ldquo;we&rdquo; instead of personal ownership</li>
          <li>Panic-switching approaches every few minutes</li>
          <li>Missing recruiter deadlines</li>
          <li>Chasing Hard problems before Medium patterns are solid</li>
        </ol>

        <h2 id="pro-tips">Pro tips</h2>
        <BlogCallout variant="tip" title="Purple Tip"><p>After each practice problem, explain your solution out loud in 90 seconds. If you cannot explain it, you do not own it yet.</p></BlogCallout>
        <ul>
          <li>Clarify constraints before coding</li>
          <li>Correct first, optimize second</li>
          <li>Keep a failure story ready</li>
          <li>Quantify results</li>
          <li>Practice 45–60 minute interviews, not only 20-minute puzzles</li>
          <li>Rehearse your intro until it sounds natural</li>
          <li>Sleep before OA day</li>
          <li>After every mock, fix one weakness next session</li>
        </ul>

        <h2 id="conversion-patterns">What usually helps candidates convert</h2>
        <p>
          <Evidence>[Community]</Evidence> + <Evidence>[InterviewEra Insight]</Evidence>
        </p>
        <ul>
          <li>Timed OA mocks until two mediums feel routine</li>
          <li>STAR stories with metrics</li>
          <li>Narrated coding in every practice session</li>
          <li>One strong project explained end-to-end</li>
          <li>Consistent Workstyles answers</li>
          <li>Calm recovery after hints</li>
        </ul>
        <p>What most candidates would do differently: start LP prep in Week 1, record mocks, build an edge-case checklist earlier, stop chasing random Hard problems too early, keep a decision log for projects.</p>

        <h2 id="checklists">Preparation checklists</h2>
        <BlogFigure src={AMAZON_SDE_INTERN_IMAGES.checklist.src} alt={AMAZON_SDE_INTERN_IMAGES.checklist.alt} caption={AMAZON_SDE_INTERN_IMAGES.checklist.caption} />
        <BlogChecklist
          title="Resume Checklist"
          storageKey="ie-blog-checklist-resume-checklist"
          items={
            [
            { id: 'resume-checklist-0', label: "Ownership bullets with action + system + metric" },
            { id: 'resume-checklist-1', label: "No vague “worked on backend/frontend” lines" },
            { id: 'resume-checklist-2', label: "Skills match the official posting language (without stuffing)" },
            { id: 'resume-checklist-3', label: "Education + relevant coursework clean and scannable" },
            { id: 'resume-checklist-4', label: "Links (GitHub/portfolio) open and readable" },
            { id: 'resume-checklist-5', label: "Reviewed with ATS Resume Checker" }
          ]
          }
        />
        <BlogChecklist
          title="Projects Checklist"
          storageKey="ie-blog-checklist-projects-checklist"
          items={
            [
            { id: 'projects-checklist-0', label: "1–2 projects selected for deep dive" },
            { id: 'projects-checklist-1', label: "Problem statement explained in under 60 seconds" },
            { id: 'projects-checklist-2', label: "Your exact contribution is clear (not “we”)" },
            { id: 'projects-checklist-3', label: "Architecture + trade-offs prepared" },
            { id: 'projects-checklist-4', label: "Biggest bug + fix story ready" },
            { id: 'projects-checklist-5', label: "One measurable outcome prepared" }
          ]
          }
        />
        <BlogChecklist
          title="Leadership Principles Checklist"
          storageKey="ie-blog-checklist-leadership-principles-checklist"
          items={
            [
            { id: 'leadership-principles-checklist-0', label: "8–12 STAR stories drafted" },
            { id: 'leadership-principles-checklist-1', label: "Stories mapped to Ownership, Customer Obsession, Dive Deep, Bias for Action, Deliver Results, Learn & Be Curious, Invent & Simplify" },
            { id: 'leadership-principles-checklist-2', label: "Each story has a metric or concrete result" },
            { id: 'leadership-principles-checklist-3', label: "Follow-ups rehearsed: “What did you do?” / “What would you change?”" },
            { id: 'leadership-principles-checklist-4', label: "One failure story prepared without blame-shifting" },
            { id: 'leadership-principles-checklist-5', label: "Answers sound natural when spoken aloud" }
          ]
          }
        />
        <BlogChecklist
          title="Interview Day Checklist"
          storageKey="ie-blog-checklist-interview-day-checklist"
          items={
            [
            { id: 'interview-day-checklist-0', label: "Recruiter email / OA instructions re-read" },
            { id: 'interview-day-checklist-1', label: "Laptop, webcam, bandwidth, charger tested" },
            { id: 'interview-day-checklist-2', label: "Quiet space + backup network plan" },
            { id: 'interview-day-checklist-3', label: "Language environment warmed up with 1 easy problem" },
            { id: 'interview-day-checklist-4', label: "Intro rehearsed (60–90 seconds)" },
            { id: 'interview-day-checklist-5', label: "Water, ID (if required), and notepad ready" },
            { id: 'interview-day-checklist-6', label: "Sleep prioritized the night before" }
          ]
          }
        />

        <h2 id="who-should-apply">Who should apply?</h2>
        <p>
          Apply if you match the official eligibility window, can write code in at least one mainstream
          language, will prepare both DSA and behavioral storytelling, and can explain projects without
          reading a README aloud.
        </p>
        <p>
          <Evidence>[Observation]</Evidence> You do not need a mythical perfect profile. You need clear
          signal: problem-solving, ownership, and communication.
        </p>

        <h2 id="hiring-trends">Latest 2026 hiring trends</h2>
        <p>
          <Evidence>[Community]</Evidence> Recent candidates commonly report coding + Leadership
          Principle evaluation across the process.
        </p>
        <p>
          <Evidence>[Official]</Evidence> Internship OA baseline remains coding + workstyles + feedback
          survey (~90 minutes) per Amazon&apos;s university OA page.
        </p>
        <p>
          Exact OA and interview process may vary by university, region, hiring team, recruiter, and
          year / hiring window. When sources conflict, prioritize recruiter email + amazon.jobs over
          unofficial forwards.
        </p>

        <h2 id="key-takeaways">Key takeaways</h2>
        <ul>
          <li>
            This article is a <strong>Community Synthesis + Editorial Guide</strong>, not a fabricated
            offer diary.
          </li>
          <li>
            <Evidence>[Official]</Evidence> Internship OA ≈ 90 minutes: coding + workstyles + survey.
          </li>
          <li>
            <Evidence>[Community]</Evidence> Interviews often mix DSA with Leadership Principles; round
            count varies.
          </li>
          <li>Prepare patterns, not PDF dumps.</li>
          <li>Build 8–12 STAR stories with metrics.</li>
          <li>Communication under pressure is part of the evaluation.</li>
          <li>A 30-day plan with weekly mocks beats last-week panic grinding.</li>
        </ul>

        <div id="faq" className="ie-blog-amazon-faq mt-10 scroll-mt-24">
          <LandingFaqCategorized
            categories={AMAZON_SDE_INTERN_FAQ_CATEGORIES}
            defaultOpenAll
            heading={
              <h2 className="landing-faq-title font-[family-name:var(--font-bricolage)] text-[var(--text-primary)]">
                <span className="landing-faq-title__line">Frequently Asked</span>
                <span className="landing-faq-title__line">Questions</span>
              </h2>
            }
          />
        </div>

        <BlogProductCta
          title="Practice what Amazon actually tests"
          body="Coding under time pressure plus Leadership Principle stories. Educate first, then practice with feedback."
          section="blog_amazon_sde_intern_2026"
          secondaryHref="/tools/ats-checker"
          secondaryLabel="Check your resume"
        />

        <BlogRelatedArticles
          items={
            related.length
              ? related
              : RELATED_POSTS.map((post) => ({
                  href: post.href,
                  title: post.title,
                  description: post.teaser,
                }))
          }
        />
        <BlogPrevNext previous={previous} next={next} />
      </div>
    </article>
    </BlogReadingShell>
  )
}
