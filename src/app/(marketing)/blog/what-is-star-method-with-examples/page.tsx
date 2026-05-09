import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { FreeToolCtaBlock } from '@/components/landing/FreeToolFormCard';

import { brandArticleOgTitle, generateMetadata } from '@/lib/seo/metadata';

const STAR_META_TITLE = 'What Is the STAR Method? With Examples for Indian Students';

export const metadata: Metadata = generateMetadata({
  title: STAR_META_TITLE,
  description:
    'Learn the STAR method for behavioral interviews. Includes 5 full STAR examples for common questions like "Tell me about a time you failed" and "Describe a conflict."',
  path: '/blog/what-is-star-method-with-examples',
  socialTitle: brandArticleOgTitle(STAR_META_TITLE),
  keywords:
    'STAR method examples, STAR interview answers, behavioral interview STAR method, situation task action result examples, STAR method India placement',
  openGraphType: 'article',
});

interface StarExample {
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  polished: string;
}

const EXAMPLES: StarExample[] = [
  {
    question: 'Tell me about a time you failed.',
    situation:
      `During my third year, I was leading the backend development for our college-level hackathon project — a real-time collaborative whiteboard. Two days before the demo, I realized our WebSocket implementation couldn't handle more than 20 concurrent users due to a blocking I/O issue I hadn't caught in testing.`,
    task:
      'I needed to fix the scalability issue within 36 hours while the rest of the team was finalizing the frontend.',
    action:
      'I rewrote the server using an async event-loop model (Node.js with event emitters instead of synchronous handlers), set up basic load testing with Artillery, and documented the bug root cause. I also communicated the delay risk to my team immediately so they could adjust the demo scope.',
    result:
      `We brought the concurrent user capacity from 20 to 200+ users. We didn't win the hackathon, but the judges specifically praised the architecture. More importantly, I now write load tests as a standard part of any real-time feature I build.`,
    polished:
      `In my third year, I led the backend for a hackathon project — a real-time collaborative whiteboard. Two days before the demo, I discovered our WebSocket server couldn't handle more than 20 concurrent users due to a blocking I/O pattern I'd missed in testing. I had 36 hours to fix it. I rewrote the server using an async event-loop model and set up load testing with Artillery to verify the fix. I immediately communicated the risk to my team so they could plan accordingly. We went from 20 to 200+ concurrent users before the demo. We didn't win, but the judges praised the architecture — and more importantly, I now build load testing into every real-time feature I write.`,
  },
  {
    question: 'Describe a time you had a conflict with a teammate.',
    situation:
      'In my final-year project, my teammate Priya and I had a disagreement about the database schema. She wanted to use a single denormalized table for performance, and I felt that a properly normalized schema with indexing would perform equally well and be far easier to maintain.',
    task:
      'We needed to reach a decision within two days since the schema underpins the entire project, and neither of us wanted to block progress or damage the team dynamic.',
    action:
      `Instead of continuing to argue about it, I proposed we spend 2 hours each building a small prototype — she'd implement the denormalized version, I'd implement the normalized one. We'd benchmark both with 10,000 sample rows and decide based on data. She agreed. My version had comparable performance with better code clarity. We also asked our project guide for input, who confirmed the normalized approach.`,
    result:
      `We went with the normalized schema. More importantly, Priya appreciated that I backed my position with evidence rather than opinion, and we built a stronger working relationship. She later adopted the "build a spike to decide" approach on another decision.`,
    polished:
      `My final-year teammate Priya and I disagreed on the database schema — she preferred a denormalized approach for performance, I felt normalization with proper indexing would work equally well and be far more maintainable. Rather than debating opinions, I proposed we each build a small prototype and benchmark both with 10,000 rows. The normalized version matched her performance numbers with cleaner code. We also consulted our project guide, who confirmed the approach. We adopted the normalized schema, delivered the project on time, and Priya later told me she appreciated that I came with data rather than just asserting my view. It became our team's default way to resolve technical disagreements.`,
  },
  {
    question: 'Tell me about a time you took initiative beyond your role.',
    situation:
      `During my internship at a mid-sized startup, I was working as a frontend intern. I noticed that the deployment process required a developer to manually SSH into the server and run a script — there was no CI/CD pipeline. This wasn't part of my job, but it was causing delays and occasional downtime from human error.`,
    task:
      'I decided to set up a basic CI/CD pipeline using GitHub Actions to automate deployment on every merge to main. I wanted to do this without disrupting the existing workflow or creating risk.',
    action:
      'I spent two evenings reading GitHub Actions documentation and setting up a test workflow in a fork. Once I had a working prototype, I showed it to the team lead and asked for permission to integrate it. I wrote clear documentation, ran it in shadow mode for a week (both manual and automated), and handed it over with a runbook.',
    result:
      'The pipeline cut deployment time from 15 minutes (manual) to under 3 minutes and eliminated two classes of human error. My intern manager mentioned it in my performance review as the most impactful contribution of my internship. The pipeline is still running.',
    polished:
      `During my internship, I noticed deployments required manual SSH access — slow and error-prone. It wasn't my job as a frontend intern, but I spent two evenings setting up a GitHub Actions CI/CD pipeline in a fork. After showing the prototype to my team lead and getting approval, I ran it in parallel for a week to verify safety, then handed it over with documentation and a runbook. Deployment time dropped from 15 minutes to under 3 minutes, and two recurring classes of deployment errors disappeared. My manager highlighted it in my review as my most impactful contribution — and the pipeline is still running today.`,
  },
  {
    question: 'Describe a time you had to deliver under a very tight deadline.',
    situation:
      'Two weeks before our college tech fest, the original team handling the event registration portal dropped out due to personal issues. The fest committee asked if I could build a working registration system in 10 days. There were 1,200 expected registrations across 18 events.',
    task:
      'I needed to scope, build, and deploy a registration portal with admin controls, payment integration, and email confirmations — alone, in 10 days, while attending classes.',
    action:
      'I immediately eliminated anything non-essential — no custom design, no complex analytics, no mobile app. I used a pre-built template, focused on the core flow (registration form → Razorpay payment → confirmation email), and set up Supabase as the backend. I worked 4 hours each day after college. On day 7, I showed a working demo to the committee and got approval. Days 8–10 were for testing and load testing with Locust.',
    result:
      'The portal went live on day 10. Over 1,100 students registered without a single critical issue. The payment success rate was 97%. The committee later used the same system for the next fest.',
    polished:
      `Ten days before our college tech fest, the original portal team dropped out. I was asked to build a registration system for 1,200 expected participants and 18 events — alone, in 10 days. My first move was brutal scope reduction: no custom design, no analytics, just the core flow: form, payment, confirmation email. I used Supabase, a pre-built UI template, and Razorpay's SDK. I showed a demo on day 7, load-tested on days 8–10 with Locust, and launched on day 10. Over 1,100 students registered without a critical failure, and the payment success rate was 97%. The committee reused the same system the following year.`,
  },
  {
    question: 'Tell me about a project you are most proud of.',
    situation:
      'I built a resume parsing and job-matching tool as my final-year project. The core problem: most job boards in India show irrelevant listings because they rely on keyword matching, not on understanding actual skill levels.',
    task:
      'My goal was to build a system that could extract structured skill information from resumes and match them against job descriptions with semantic similarity, not just keyword overlap.',
    action:
      'I used GPT-4 to extract structured JSON from resume PDFs, stored embeddings for skills and job descriptions using pgvector, and built a similarity ranking algorithm. I tested with 500 real resumes (anonymized from Kaggle) and compared match quality against a simple keyword baseline. I also built a React dashboard to visualize skill gaps against target job descriptions.',
    result:
      'The semantic approach outperformed keyword matching by 34% on a relevance rating task I ran with 5 domain experts. The project won the department best project award and was cited by our industry jury as "production-ready in architecture." I learned more about NLP, embeddings, and production systems in those 6 months than in any course.',
    polished:
      `My final-year project was a semantic resume-job matching tool. Most Indian job boards match on keywords — I wanted to match on skill depth. I used GPT-4 to extract structured skill profiles from resume PDFs, stored embeddings using pgvector, and built a similarity ranking layer. I tested against a keyword baseline using 500 anonymized resumes and a relevance rating task with 5 domain experts — my approach outperformed keyword matching by 34%. The project won the department award and was called production-ready in architecture by the industry jury. It's the project I'm most proud of because it combined NLP, database engineering, and real evaluation methodology — and it solved a problem I genuinely cared about.`,
  },
];

const STAR_STRIP_STYLES = [
  { border: 'hsla(199, 89%, 48%, 0.45)', fill: 'color-mix(in srgb, hsl(199 89% 48%) 14%, transparent)', accent: 'hsl(199 89% 52%)' },
  { border: 'hsla(271, 81%, 56%, 0.45)', fill: 'color-mix(in srgb, hsl(271 81% 56%) 14%, transparent)', accent: 'hsl(271 81% 62%)' },
  { border: 'hsla(24, 95%, 53%, 0.45)', fill: 'color-mix(in srgb, hsl(24 95% 53%) 14%, transparent)', accent: 'hsl(24 95% 58%)' },
  { border: 'hsla(152, 69%, 40%, 0.45)', fill: 'color-mix(in srgb, hsl(152 69% 40%) 14%, transparent)', accent: 'hsl(152 69% 46%)' },
] as const;

export default function WhatIsStarMethodWithExamples() {
  return (
    <BlogMarketingShell backHref="/blog" backLabel="All guides">
      <article className="ie-blog-prose mx-auto w-full max-w-3xl xl:max-w-[48rem] 2xl:max-w-[52rem]">
        <header className="mb-10 sm:mb-12">
          <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
            Interview Strategy
          </p>
          <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
            What Is the STAR Method? With 5 Full Examples
          </h1>
          <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
            The STAR method is the standard framework for answering behavioral interview
            questions. Here's how it works — and 5 complete examples for the questions you
            will almost certainly face.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>10 min read</span>
            <span aria-hidden>·</span>
            <span>Updated April 2026</span>
          </div>
        </header>

        <h2>What Is the STAR Method?</h2>
        <p>
          STAR stands for <strong>Situation</strong>, <strong>Task</strong>,{' '}
          <strong>Action</strong>, and <strong>Result</strong>. It's a structured way to answer
          behavioral interview questions — the kind that start with "Tell me about a time when…"
          or "Describe a situation where…"
        </p>
        <p>
          Behavioral questions are used by virtually every company because they're based on a
          simple insight: past behavior is the best predictor of future behavior. Instead of
          asking "Are you a good problem solver?", an interviewer asks "Tell me about a time you
          solved a difficult problem." Your specific, structured answer reveals far more than any
          self-assessment would.
        </p>
        <h3>Breaking down each component</h3>
        <ul>
          <li>
            <strong>Situation:</strong> Set the scene concisely. What was the context? What
            project, team, or challenge are you talking about? Keep this to 2–3 sentences.
          </li>
          <li>
            <strong>Task:</strong> What was your specific responsibility in this situation? What
            were you expected to do, or what problem did you need to solve? This differentiates
            your individual contribution from the team context.
          </li>
          <li>
            <strong>Action:</strong> This is the most important part. What did <em>you</em>{' '}
            specifically do? What decisions did you make? What alternatives did you consider?
            Use "I" language, not "we." Be specific. Most candidates make this section too short.
          </li>
          <li>
            <strong>Result:</strong> What happened because of your actions? Quantify wherever
            possible — time saved, error rate reduced, users impacted. If the outcome was mixed,
            say so and include the lesson. Interviewers appreciate honesty.
          </li>
        </ul>

        <h2>Common Mistakes When Using STAR</h2>
        <ol>
          <li>
            <strong>Too much Situation, not enough Action.</strong> Most candidates spend
            3 minutes setting up the situation and 30 seconds on what they actually did.
            Flip this ratio.
          </li>
          <li>
            <strong>Saying "we" throughout the Action section.</strong> Interviewers want to
            assess your individual contribution. "We decided to…" tells them nothing. "I
            proposed we use X because Y, and the team agreed" tells them everything.
          </li>
          <li>
            <strong>No measurable result.</strong> "The project went well" is a dead end.
            "We reduced latency by 40%" or "100 students used the feature in the first week"
            is a result.
          </li>
          <li>
            <strong>Using a fake failure.</strong> When asked about failures, some candidates
            say "I work too hard" or "I'm a perfectionist." Interviewers see this constantly
            and it damages your credibility immediately. Use a real failure.
          </li>
          <li>
            <strong>One story for all questions.</strong> Prepare 5–6 distinct STAR stories
            covering different situations: a failure, a conflict, a time under pressure, a
            project win, a time you took initiative, and a time you led others.
          </li>
        </ol>

        <h2>5 Full STAR Examples for Common Questions</h2>
        <p>
          Below are complete STAR answers for 5 questions you're very likely to face. Each
          example includes the raw STAR breakdown and a polished answer you'd actually give
          in an interview.
        </p>

        {EXAMPLES.map((ex, i) => (
          <div
            key={i}
            className="my-8 overflow-hidden rounded-[22px] border-2 lg:my-10 lg:rounded-3xl"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
              boxShadow: 'var(--card-shadow)',
            }}
          >
            <div
              className="border-b px-5 py-4 sm:px-6 sm:py-5"
              style={{
                borderColor: 'var(--card-border)',
                background:
                  'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
              }}
            >
              <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                Question {i + 1}
              </p>
              <p className="mt-1 text-base font-bold sm:text-lg">&ldquo;{ex.question}&rdquo;</p>
            </div>
            <div className="space-y-4 p-5 text-sm sm:p-6 sm:text-[0.9375rem]">
              {(
                [
                  { label: 'S', title: 'Situation', content: ex.situation },
                  { label: 'T', title: 'Task', content: ex.task },
                  { label: 'A', title: 'Action', content: ex.action },
                  { label: 'R', title: 'Result', content: ex.result },
                ] as const
              ).map(({ label, title, content }, idx) => {
                const strip = STAR_STRIP_STYLES[idx];
                return (
                  <div
                    key={label}
                    className="rounded-xl border-2 p-3 sm:p-4"
                    style={{ borderColor: strip.border, background: strip.fill }}
                  >
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
                      <span
                        className="text-base font-extrabold tabular-nums"
                        style={{ color: strip.accent, fontFamily: 'var(--font-bricolage), sans-serif' }}
                      >
                        {label}
                      </span>
                      {title.slice(1)}
                    </p>
                    <p className="m-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {content}
                    </p>
                  </div>
                );
              })}
              <div
                className="rounded-xl border-2 p-4 sm:p-5"
                style={{
                  borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
                  background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                }}
              >
                <p className="mb-2 text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--accent-primary)' }}>
                  Polished answer (as you&apos;d say it)
                </p>
                <p className="m-0 leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
                  &ldquo;{ex.polished}&rdquo;
                </p>
              </div>
            </div>
          </div>
        ))}

        <h2>Building Your Own STAR Answer Bank</h2>
        <p>
          Before interviews, prepare a bank of 5–6 STAR stories that you can adapt to different
          questions. Cover these scenarios:
        </p>
        <ul>
          <li>A significant failure and what you learned</li>
          <li>A conflict with a teammate or stakeholder</li>
          <li>A project you delivered under pressure</li>
          <li>A time you took initiative beyond your role</li>
          <li>Your most technically complex project</li>
          <li>A time you received hard feedback and acted on it</li>
        </ul>
        <p>
          Once you have your stories, practice delivering them out loud. Use our free{' '}
          <Link href="/tools/star-builder" className="ie-blog-inline-link">
            STAR answer builder
          </Link>{' '}
          to enter your bullet points and get a polished, structured answer with quality scores
          and improvement suggestions — no signup required.
        </p>
        <p>
          For full mock interviews that include behavioral rounds evaluated by AI, create a free
          account on{' '}
          <Link href="/signup" className="ie-blog-inline-link">
            InterviewEra
          </Link>
          .
        </p>

        <div className="mt-12 sm:mt-16">
          <FreeToolCtaBlock
            title="Polish your STAR answers for free"
            body="Enter your bullet points, get a polished answer plus quality scores in seconds — same flow as our STAR builder tool."
            href="/tools/star-builder"
            ctaLabel="Open STAR builder"
          />
        </div>
      </article>
    </BlogMarketingShell>
  );
}
