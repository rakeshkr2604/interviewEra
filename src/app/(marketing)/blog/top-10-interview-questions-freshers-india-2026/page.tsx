import type { Metadata } from 'next';
import Link from 'next/link';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { BlogSignupCta } from '@/components/blog/BlogSignupCta';
import {
  BRAND_ICON_192_PATH,
  brandArticleOgTitle,
  generateMetadata,
  schemaIds,
  siteConfig,
} from '@/lib/seo/metadata';

const TITLE = 'Top 10 Interview Questions for Freshers in India 2026 (With Sample Answers)';
const DESCRIPTION =
  'Preparing for campus placements? Top 10 fresher interview questions with honest sample answers, common mistakes, and scoring tips.';
const CANONICAL_PATH = '/blog/top-10-interview-questions-freshers-india-2026';
const PUBLISHED_ISO = '2026-05-13';
const AUTHOR_NAME = 'Rakesh Kumar, Founder — InterviewEra';

export const metadata: Metadata = generateMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: CANONICAL_PATH,
  socialTitle: brandArticleOgTitle(TITLE),
  keywords: ['interview questions for freshers', 'campus placement 2026', 'fresher interview India'],
  openGraphType: 'article',
});

const SUMMARY_ACCENTS = ['indigo', 'violet', 'emerald', 'amber', 'rose'] as const;

const summaryRows = [
  { question: 'Tell me about yourself', key: '3-part: academic + built + why here' },
  { question: 'Strengths', key: 'One specific strength + real example' },
  { question: 'Weaknesses', key: 'Real weakness + what you are doing about it' },
  { question: 'Why this company', key: 'Something specific, not generic praise' },
  { question: '5-year plan', key: 'Grounded ambition, not vague' },
  { question: 'Challenge you faced', key: 'STAR format — situation, task, action, result' },
  { question: 'Why hire you', key: 'Specific value + evidence' },
  { question: 'Handle pressure', key: 'Real story, not generic claim' },
  { question: 'Team player', key: 'Example with your specific contribution' },
  { question: 'Questions for them', key: 'Always ask — 2 to 3 thoughtful ones' },
] as const;

const faqItems = [
  {
    question: 'What are the most common interview questions for freshers in India?',
    answer:
      'The most common fresher interview questions include tell me about yourself, strengths, weaknesses, why this company, where do you see yourself in 5 years, describe a challenge, why should we hire you, handling pressure, teamwork, and questions for the interviewer.',
  },
  {
    question: 'How should freshers answer tell me about yourself?',
    answer:
      'Use a short 3-part structure: who you are academically, what you have built or achieved, and why you are applying for the role. Avoid narrating your full life story.',
  },
  {
    question: 'How can freshers practice interview answers before campus placements?',
    answer:
      'Freshers should answer out loud, record themselves, check for rambling and filler words, and take scored mock interviews to get feedback on clarity, structure, confidence, relevance, and technical depth.',
  },
] as const;

function articleSchema(canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: `${PUBLISHED_ISO}T00:00:00.000Z`,
    dateModified: `${PUBLISHED_ISO}T00:00:00.000Z`,
    wordCount: 1900,
    inLanguage: 'en-IN',
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      jobTitle: 'Founder',
      affiliation: {
        '@type': 'Organization',
        name: siteConfig.name,
        url: siteConfig.url,
      },
    },
    publisher: {
      '@type': 'Organization',
      '@id': schemaIds.organization,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}${BRAND_ICON_192_PATH}`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
  };
}

function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

function breadcrumbSchema(canonicalUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteConfig.url,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteConfig.url}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: TITLE,
        item: canonicalUrl,
      },
    ],
  };
}

function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': schemaIds.organization,
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}${BRAND_ICON_192_PATH}`,
  };
}

function SummaryComparisonAtlas() {
  return (
    <div className="ie-blog-summary-atlas max-w-none">
      <div className="ie-blog-summary-atlas__shell">
        <div className="ie-blog-summary-atlas__header">
          <p className="ie-blog-summary-atlas__eyebrow">At a glance</p>
          <p className="ie-blog-summary-atlas__title">Question → what interviewers reward</p>
          <p className="ie-blog-summary-atlas__sub">
            Same topics, different bar: the left column is what gets asked; the right column is what actually earns
            points when recruiters compare candidates.
          </p>
        </div>
        <ul className="ie-blog-summary-atlas__grid" role="list">
          {summaryRows.map((row, index) => {
            const accent = SUMMARY_ACCENTS[index % SUMMARY_ACCENTS.length];
            const n = index + 1;
            return (
              <li key={row.question} className="ie-blog-summary-row" data-accent={accent}>
                <span className="ie-blog-summary-row__badge" aria-hidden>
                  {n < 10 ? `0${n}` : `${n}`}
                </span>
                <div className="ie-blog-summary-row__content">
                  <div>
                    <p className="ie-blog-summary-row__q">{row.question}</p>
                  </div>
                  <div className="ie-blog-summary-row__answer">
                    <p className="ie-blog-summary-row__label">What wins</p>
                    <p className="ie-blog-summary-row__key">{row.key}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function QuestionBlock({
  number,
  question,
  why,
  mistake,
  target,
  sample,
  whyWorks,
}: {
  number: number;
  question: string;
  why: string;
  mistake: string;
  target: string;
  sample: string;
  whyWorks?: string;
}) {
  return (
    <section>
      <h2 id={`question-${number}`}>
        {number}. &quot;{question}&quot;
      </h2>
      <p>
        <strong>Why they ask this:</strong> {why}
      </p>
      <p>
        <strong>Most freshers make this mistake:</strong> {mistake}
      </p>
      <p>
        <strong>What they actually want:</strong> {target}
      </p>
      <div className="ie-blog-card my-5 p-5 sm:p-6">
        <p className="m-0 text-sm font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
          Sample answer
        </p>
        <p className="mb-0 mt-3 italic">&quot;{sample}&quot;</p>
      </div>
      {whyWorks ? (
        <p>
          <strong>Why this works:</strong> {whyWorks}
        </p>
      ) : null}
    </section>
  );
}

export default function Top10InterviewQuestionsFreshersIndia2026Page() {
  const canonicalUrl = `${siteConfig.url}${CANONICAL_PATH}`;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema(canonicalUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(canonicalUrl)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema()) }} />

      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <article className="ie-blog-prose mx-auto w-full max-w-3xl xl:max-w-[48rem] 2xl:max-w-[52rem]">
          <header className="mb-10 sm:mb-12">
            <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
              Fresher interviews · India · 2026
            </p>
            <h1 className="mt-3 text-[1.75rem] font-bold leading-[1.12] tracking-tight text-balance sm:text-4xl md:text-[2.35rem] md:leading-[1.08]">
              Top 10 Interview Questions for Freshers in India 2026 (With Sample Answers)
            </h1>
            <p className="mt-4 text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
              Preparing for campus placements in 2026? These are the questions freshers hear again and again — with
              direct sample answers, common mistakes, and the scoring logic behind good responses.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <span>10 min read</span>
              <span aria-hidden>·</span>
              <span>May 13, 2026</span>
              <span aria-hidden>·</span>
              <span>{AUTHOR_NAME}</span>
            </div>
          </header>

          <nav className="ie-blog-card mb-10 p-5 sm:mb-12 sm:p-6" aria-label="Jump to section">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
              Jump to section
            </p>
            <ul className="m-0 list-none space-y-2 p-0 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>
                <a href="#before-you-read" className="ie-blog-inline-link font-medium">
                  Before you read
                </a>
              </li>
              <li>
                <a href="#question-1" className="ie-blog-inline-link font-medium">
                  Top 10 fresher interview questions
                </a>
              </li>
              <li>
                <a href="#how-to-use" className="ie-blog-inline-link font-medium">
                  How to use this guide
                </a>
              </li>
              <li>
                <a href="#summary" className="ie-blog-inline-link font-medium">
                  Summary
                </a>
              </li>
              <li>
                <a href="#faq" className="ie-blog-inline-link font-medium">
                  FAQ
                </a>
              </li>
            </ul>
          </nav>

          <p>
            If you are a final-year student in India preparing for campus placements or off-campus drives in 2026, this
            guide is for you.
          </p>
          <p>
            Recruiters at companies like TCS, Infosys, Wipro, Accenture, and product startups ask the same core
            questions in almost every fresher interview. The problem is not that students do not know the answers. The
            problem is that they have never practised saying them out loud — clearly, confidently, and in a structured
            way.
          </p>
          <p>This guide covers the top 10 most common fresher interview questions in India with sample answers you can actually use.</p>

          <h2 id="before-you-read">Before You Read: One Thing That Changes Everything</h2>
          <p>Most freshers read lists like this and think they are prepared. They are not.</p>
          <p>
            Reading an answer is not the same as giving one under pressure. The only way to actually prepare is to
            practice answering out loud — ideally with feedback on how you sound.
          </p>
          <p>
            If you want to know exactly how your answers score before a real interview, try{' '}
            <Link href="/signup" className="ie-blog-inline-link">
              InterviewEra
            </Link>
            . It generates questions from your actual resume and scores your answers on 5 dimensions the same way campus
            panels do.
          </p>
          <p>Now, the questions.</p>

          <QuestionBlock
            number={1}
            question="Tell Me About Yourself"
            why="It is your opening pitch. They want to see if you can communicate clearly and confidently in 90 seconds."
            mistake='They recite their resume chronologically. "I was born in Ranchi, I did my schooling from XYZ school, then I joined ABC college..." Nobody asked for your life story.'
            target="A 3-part answer — who you are academically, what you have built or done, and why you are here."
            sample="I am a final-year MCA student from Sarala Birla University with a minor in Computer Science from IIT Mandi. Over the last two years, I have built three full-stack projects — including an AI-powered mock interview platform that currently serves real users. I am applying because I want to build production-grade systems in a team environment and this role gives me that opportunity."
            whyWorks="Under 60 seconds. Specific. No fluff. Ends with a reason that connects to the role."
          />

          <QuestionBlock
            number={2}
            question="What Are Your Strengths?"
            why="They want to see if you know yourself — and if your strengths are relevant to the job."
            mistake='"I am hardworking, honest, and a team player." This tells them nothing. Every candidate says this.'
            target="One specific strength, backed by a real example."
            sample="My strongest skill is breaking down complex problems into working code quickly. During a 24-hour hackathon at BIT Mesra, my team had to build a functional product from scratch. I led the backend, finished the core API in 6 hours, and we placed second out of 40 teams. I work well under pressure when there is a clear goal."
            whyWorks="It is specific. It has a result. It is relevant to a developer role."
          />

          <QuestionBlock
            number={3}
            question="What Are Your Weaknesses?"
            why='Mostly to see if you are self-aware and honest. Saying "I have no weaknesses" is an immediate red flag.'
            mistake='"I work too hard." "I am a perfectionist." Recruiters hear this 50 times a day and trust candidates less after.'
            target="A real weakness you are actively fixing."
            sample="I used to avoid asking for help when I was stuck, thinking I should figure everything out myself. This cost me time on a project where I spent three days on a bug that a senior could have resolved in 30 minutes. I have since started setting a personal rule — if I am stuck for more than two hours, I ask. It has made me more efficient."
          />

          <QuestionBlock
            number={4}
            question="Why Do You Want to Work at This Company?"
            why="To check if you have done basic research and if your interest is genuine or generic."
            mistake='"Your company is well-known and has a good work culture." This is copy-pasted from every application.'
            target="Something specific about the company that connects to your goals."
            sample="I read that your engineering team recently moved to a microservices architecture for your core product. I have been working with Next.js and REST APIs on my own projects and I want to understand how that scale works in production. I also looked at your GitHub — the code quality and documentation show a team that takes engineering seriously."
            whyWorks="Specific. Shows research. Shows genuine interest in the craft, not just the brand."
          />

          <QuestionBlock
            number={5}
            question="Where Do You See Yourself in 5 Years?"
            why="They want to know if you are serious about growing in this field and if you will stick around."
            mistake='Either being vague ("I want to grow professionally") or being unrealistic ("I want to be a team lead in 2 years").'
            target="An honest, grounded answer that shows ambition with awareness."
            sample="In 5 years, I want to be a strong backend engineer who can design systems independently. In the short term, I want to learn how production systems work at scale — something I can only do in a real team. By year three, I would like to take ownership of a feature end to end. That is the trajectory I am aiming for."
          />

          <div className="my-10 sm:my-12">
            <BlogSignupCta
              title="Halfway through? Now test one answer."
              body="Pick any question above, answer it out loud, and run a free scored mock interview on InterviewEra to see where your clarity, structure, confidence, relevance, and technical depth actually stand."
              href="/signup"
              ctaLabel="Start free scored interview"
            />
          </div>

          <QuestionBlock
            number={6}
            question="Tell Me About a Challenge You Faced and How You Solved It"
            why="This is a behavioural question. They want to see how you think and act under pressure."
            mistake="Describing a challenge with no clear resolution or learning. Or making it sound too easy."
            target="A real story in STAR format — Situation, Task, Action, Result."
            sample="In my final year project, our payment integration kept failing silently — transactions showed as successful on the frontend but money was not being captured. I dug into the Razorpay webhook logs and found that our server was returning a 200 response before writing to the database, so the webhook marked the payment as complete even on failure. I restructured the flow so the database write happened first, then the response. The issue was resolved and we had zero failed transactions in the next 50 test payments."
            whyWorks="Specific problem. Real technical detail. Clear result."
          />

          <QuestionBlock
            number={7}
            question="Why Should We Hire You?"
            why="This is your closing argument. They want to know what makes you different."
            mistake='"I am hardworking and a fast learner." This is the weakest possible answer because it applies to every candidate.'
            target="Your specific value, backed by evidence."
            sample="Most freshers have theoretical knowledge. I have shipped actual products. My mock interview platform has real users, handles payments, and runs on production infrastructure. I have dealt with real bugs, real costs, and real feedback. That experience means I will contribute faster than someone who has only done coursework."
          />

          <QuestionBlock
            number={8}
            question="How Do You Handle Pressure or Tight Deadlines?"
            why="Real work has deadlines. They want to know you will not collapse under pressure."
            mistake='"I prioritise my tasks and stay calm."'
            target="A real story showing you stayed functional under pressure."
            sample="In a company assessment, I had 24 hours to build a working product with a tech stack and guidelines given to me. I broke the task into 4-hour blocks, focused on the core working feature first, and left polish for the last stretch. I delivered a fully functional product before the deadline. Pressure actually helps me cut out distractions and focus."
          />

          <QuestionBlock
            number={9}
            question="Are You a Team Player? Give an Example."
            why="Most real work is collaborative. They want evidence, not self-declaration."
            mistake='"Yes, I am a good team player." Zero evidence. Zero value.'
            target="A specific example where your contribution helped the team."
            sample="In our hackathon team, one teammate was struggling with the frontend while I had finished my backend tasks. Instead of waiting, I jumped in and helped debug their React component. We finished 30 minutes ahead of schedule and that buffer gave us time to clean up the presentation. We placed second. I have learned that team output matters more than individual credit."
          />

          <section>
            <h2 id="question-10">10. &quot;Do You Have Any Questions for Us?&quot;</h2>
            <p>
              <strong>Why they ask this:</strong> It shows how serious you are. Candidates who say &quot;No, I am
              good&quot; almost always lose points here.
            </p>
            <p>
              <strong>Most freshers make this mistake:</strong> Asking nothing. Or asking about salary in the first round.
            </p>
            <p>
              <strong>What they actually want:</strong> Thoughtful questions that show genuine interest in the work.
            </p>
            <p>
              <strong>3 questions you can actually use:</strong>
            </p>
            <ul>
              <li>
                <em>&quot;What does the first 30 days look like for a fresher joining this team?&quot;</em>
              </li>
              <li>
                <em>&quot;What is the biggest technical challenge your team is working on right now?&quot;</em>
              </li>
              <li>
                <em>&quot;How do senior engineers mentor freshers here — is it structured or more informal?&quot;</em>
              </li>
            </ul>
          </section>

          <h2 id="how-to-use">How to Actually Use This Guide</h2>
          <p>Reading these answers will not prepare you. You need to say them out loud.</p>
          <p>Here is a simple practice method:</p>
          <ol>
            <li>Set a timer for 90 seconds.</li>
            <li>Answer each question out loud — record yourself on your phone.</li>
            <li>Play it back. Did you ramble? Did you say &quot;um&quot; too often? Did you give a specific example or stay vague?</li>
            <li>Repeat until you can answer clearly within the time.</li>
          </ol>
          <p>
            <strong>The faster way:</strong> Use{' '}
            <Link href="/signup" className="ie-blog-inline-link">
              InterviewEra
            </Link>{' '}
            to practice. Upload your resume, answer AI-generated questions specific to your projects, and get scored on
            communication, technical depth, structure, confidence, and relevance — the exact criteria campus panels use.
          </p>
          <p>It takes under 5 minutes to start and you will know exactly where you stand before the real interview.</p>

          <h2 id="summary">Summary</h2>
          <SummaryComparisonAtlas />

          <h2 id="faq">FAQ</h2>
          <div className="space-y-5">
            {faqItems.map((item) => (
              <section key={item.question} className="ie-blog-card p-5 sm:p-6">
                <h3 className="mt-0">{item.question}</h3>
                <p className="mb-0">{item.answer}</p>
              </section>
            ))}
          </div>

          <div className="mt-12 sm:mt-16">
            <BlogSignupCta
              title="Ready to practice before the real interview?"
              body="Start a free scored mock interview on InterviewEra. Get resume-based questions and feedback on clarity, structure, confidence, relevance, and technical depth."
              href="/signup"
              ctaLabel="Start free scored interview"
            />
          </div>

          <p className="mt-10 text-sm" style={{ color: 'var(--text-muted)' }}>
            Published by {AUTHOR_NAME}.
          </p>
        </article>
      </BlogMarketingShell>
    </>
  );
}
