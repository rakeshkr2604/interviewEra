import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BlogStartFreeCta } from '@/components/analytics/BlogStartFreeCta';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import {
  BlogEditorialFaq,
  BlogEditorialHeader,
  BlogEditorialToc,
} from '@/components/blog/BlogEditorialHeader';

import { brandArticleOgTitle, generateMetadata, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { articleJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';

const META_TITLE = 'Beat Interview Anxiety with Mock Practice';
const ARTICLE_DESCRIPTION =
  'Interview anxiety blocks strong answers — not knowledge. Learn why you freeze, how mock interviews retrain your brain, common mistakes to avoid, and a 7-day confidence plan.';
const CANONICAL_PATH = '/blog/overcome-interview-anxiety-mock-interviews';
const PUBLISHED_DATE = '2026-05-31';
const HERO_PATH = '/blog/interview-anxiety-hero.webp';
const ORIGIN = getCanonicalSiteOrigin();

export const metadata: Metadata = generateMetadata({
  title: META_TITLE,
  description: ARTICLE_DESCRIPTION,
  path: CANONICAL_PATH,
  ogImage: `${ORIGIN}${HERO_PATH}`,
  socialTitle: brandArticleOgTitle(META_TITLE),
  keywords:
    'interview anxiety, mock interview practice, freeze in interviews, interview confidence, AI mock interview India, placement interview nerves',
  openGraphType: 'article',
});

const ARTICLE_LD = articleJsonLd({
  headline: META_TITLE,
  description: ARTICLE_DESCRIPTION,
  canonicalUrl: canonicalUrl(CANONICAL_PATH),
  datePublished: PUBLISHED_DATE,
  authorName: 'InterviewEra Team',
  publisherId: schemaIds.organization,
});

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Interview Anxiety & Mock Practice', path: CANONICAL_PATH },
  ],
  ORIGIN,
);

const TOC_SECTIONS = [
  { id: 'student-example', label: 'A realistic student example' },
  { id: 'what-anxiety-does', label: 'What anxiety does to your answers' },
  { id: 'why-mock-interviews', label: 'Why mock interviews beat re-reading notes' },
  { id: 'ai-mock-edge', label: 'Where AI mock practice has an edge' },
  { id: 'how-to-practice', label: 'How to practice so it actually works' },
  { id: 'common-mistakes', label: 'Mistakes students make' },
  { id: 'seven-day-plan', label: '7-day interview confidence plan' },
  { id: 'signs-its-working', label: 'The signs it\'s working' },
  { id: 'faq', label: 'FAQ' },
] as const;

const RELATED_POSTS = [
  {
    href: '/blog/english-confidence-interviews',
    title: "Your English Isn't Costing You the Interview. Your Delivery Is.",
    teaser:
      'In most interviews, English is not the thing being tested. Delivery is — and weak delivery hides good thinking.',
  },
  {
    href: '/blog/how-to-get-internship-opportunities',
    title: "Why Good Students Don't Get Internships (And What Actually Works)",
    teaser:
      'Strong students often miss internships because of weak signal and inconsistency — not because they lack skills.',
  },
] as const;

function EditorialCallout({ label, quote }: { label: string; quote: string }) {
  return (
    <aside className="ie-blog-insight-callout" aria-label={label}>
      <p className="ie-blog-insight-callout__label">{label}</p>
      <p className="ie-blog-insight-callout__quote">&ldquo;{quote}&rdquo;</p>
    </aside>
  );
}

const FAQ_ITEMS = [
  {
    question: 'Why do I forget answers in interviews?',
    answer:
      'Interview anxiety consumes working memory — the mental space you need to retrieve facts and form sentences. You often still know the material; stress blocks access to it under evaluative pressure. Repeated mock interview practice reduces that interference so retrieval gets easier when it counts.',
  },
  {
    question: 'How many mock interviews should I take?',
    answer:
      'Most students notice a real shift after 8–12 full spoken sessions, not one or two. Spread them across two to three weeks before placement interviews. Quality matters more than volume: speak out loud, review each session, and fix one weak spot at a time.',
  },
  {
    question: 'Can interview anxiety go away completely?',
    answer:
      'Some nerves before high-stakes placement interviews are normal and can even sharpen focus. The goal is not zero anxiety — it is functional confidence. With enough mock interview practice, the room stops feeling novel, your answers flow more naturally, and nervousness stops hijacking your delivery.',
  },
  {
    question: 'Do interviewers reject nervous candidates?',
    answer:
      'Interviewers expect some interview nervousness, especially from freshers. What hurts you is when nerves show up as rambling, silence, or low confidence — not a shaky voice alone. Strong structure and clear communication often outweigh visible nerves if the substance is there.',
  },
  {
    question: 'How can I speak confidently during placements?',
    answer:
      'Speak out loud daily, simulate real interview conditions, record yourself, and take scored mock interviews so you get feedback on clarity and structure. Confidence during placements comes from reps — not from memorizing scripts or reading notes silently.',
  },
] as const;

function faqSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };
}

export default function OvercomeInterviewAnxietyPage() {
  return (
    <>
      <JsonLdScript id="interview-anxiety-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="interview-anxiety-breadcrumb-ld" data={BREADCRUMB_LD} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema()) }} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <article className="ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series mx-auto w-full">
          <BlogEditorialHeader
            category="Interview Prep"
            titleLine="Why You Freeze in Interviews"
            titleAccent="And How Mock Practice Fixes It"
            description={ARTICLE_DESCRIPTION}
            readTime="10 min read"
            updatedLabel="Updated May 2026"
            heroSrc={HERO_PATH}
            heroAlt="Student building interview confidence through mock interview practice"
          />

          <div className="ie-blog-interview-anxiety-content">
            <BlogEditorialToc sections={TOC_SECTIONS} />

          <p>
            Here&apos;s a pattern almost every placement season repeats: a student who has solved hundreds of DSA
            problems, finished the aptitude prep, and <em>knows</em> the answers — walks into the interview and blanks.
          </p>
          <p>
            The problem is rarely knowledge. It&apos;s exposure. You&apos;ve practiced the <em>content</em> of an
            interview a thousand times. You&apos;ve practiced the <em>experience</em> of one maybe zero times. Your
            brain treats the room as a threat because it&apos;s unfamiliar, and a threatened brain doesn&apos;t retrieve
            information well.
          </p>
          <p>
            This is the same wiring behind stage fright. The first time you present, your heart races and your mind
            goes blank. By the tenth time, it&apos;s manageable. By the fiftieth, it&apos;s routine. Nothing about{' '}
            <em>you</em> changed — the situation just stopped being novel. Interviews work identically. The fix
            isn&apos;t more confidence as a personality trait. It&apos;s more reps.
          </p>

          <EditorialCallout label="Key Insight" quote="The problem is rarely knowledge. It's exposure." />

          <h2 id="student-example">A realistic student example</h2>
          <p>
            Arjun is a third-year CSE student at a tier-2 college in Pune. He cleared 180+ LeetCode problems, finished
            his OS and DBMS notes twice, and could explain B-trees on a whiteboard without hesitation. His mock OA scores
            were consistently in the top bracket for his batch.
          </p>
          <p>
            His first on-campus technical round was a different story. The interviewer asked him to walk through a
            project he&apos;d built — something he&apos;d explained to friends dozens of times. He started strong, then
            lost the thread halfway through. When the follow-up came, his mind went blank on a detail he knew cold. He
            left the room convinced he was &ldquo;bad at interviews.&rdquo;
          </p>
          <p>
            Over the next two weeks, he ran eleven mock interview sessions — mostly HR and project questions at first,
            then harder technical follow-ups. Same knowledge, same person. By session eight, the long pauses were shorter.
            By session eleven, he could recover mid-answer when he stumbled instead of spiraling. His next real interview
            wasn&apos;t perfect, but he didn&apos;t freeze. That was the difference.
          </p>

          <h2 id="what-anxiety-does">What anxiety actually does to your answers</h2>
          <p>
            When you&apos;re nervous, the damage shows up in specific, measurable ways — not in &ldquo;being bad at
            interviews&rdquo; generally:
          </p>
          <ul>
            <li>
              <strong>Communication drops.</strong> You hedge, you trail off, sentences don&apos;t finish.
            </li>
            <li>
              <strong>Structure collapses.</strong> You jump to the result before setting up the situation, or you
              ramble without landing anywhere.
            </li>
            <li>
              <strong>Confidence reads as low</strong> even when your actual answer is correct, because your delivery
              shakes.
            </li>
          </ul>
          <p>
            Notice that none of these are knowledge problems. Three of the five dimensions{' '}
            <Link href="/" className="ie-blog-inline-link">
              InterviewEra
            </Link>{' '}
            scores answers on — Communication, STAR Structure, and Confidence — are the exact things anxiety attacks
            first. You can know the perfect answer and still score poorly on all three because nerves never let the
            answer out cleanly.
          </p>
          <p>
            There&apos;s a reason this happens, and it&apos;s not a character flaw. When interview nervousness spikes,
            your brain shifts into threat mode. Working memory — the short-term mental workspace where you hold a
            question, retrieve facts, and assemble a coherent sentence — gets crowded out by worry. Verbal fluency
            suffers because forming speech under pressure requires the same cognitive bandwidth that anxiety is consuming.
          </p>
          <p>
            Research on performance anxiety backs this up. Eysenck and colleagues, in their work on attentional control
            and anxiety, found that anxious test-takers often <em>have</em> the knowledge but struggle to access it
            under evaluative pressure — worry competes directly with the mental resources needed for recall and clear
            communication. That&apos;s why you can explain an algorithm perfectly to a friend at midnight and draw a
            blank when an interviewer asks the same thing at 10 AM.
          </p>

          <EditorialCallout
            label="Remember"
            quote="Interview confidence is built through repetition, not motivation."
          />

          <h2 id="why-mock-interviews">Why mock interviews work better than re-reading notes</h2>
          <p>
            Silent preparation trains the wrong muscle. Interviews don&apos;t test whether you <em>know</em> something
            — they test whether you can <em>explain it out loud, under mild pressure, in real time.</em> That&apos;s a
            separate skill, and it only improves by doing it.
          </p>
          <p>A mock interview does five things a notebook can&apos;t:</p>
          <ol>
            <li>
              <strong>Makes the format familiar.</strong> After you&apos;ve handled follow-up questions and sat through
              an awkward silence a few times, the real thing stops feeling dangerous.
            </li>
            <li>
              <strong>Forces you to speak, not recite.</strong> You discover the gap between &ldquo;I understand
              this&rdquo; and &ldquo;I can explain this.&rdquo;
            </li>
            <li>
              <strong>Surfaces weak spots early</strong> — long pauses, a shaky introduction, a project you can&apos;t
              actually describe — while it&apos;s still cheap to fix.
            </li>
            <li>
              <strong>Builds pressure tolerance</strong> gradually, so you stay calmer even when you don&apos;t know an
              answer.
            </li>
            <li>
              <strong>Lowers the cost of mistakes</strong>, which retrains your brain to stop panicking after one slip.
            </li>
          </ol>
          <p>
            Underneath those five points are a few mechanisms worth understanding — because they explain{' '}
            <em>why</em> mock interview practice works when more note-reading doesn&apos;t.
          </p>
          <p>
            <strong>The familiarity effect.</strong> Your brain treats novel situations as higher-risk. The first time
            you sit across from someone asking follow-up questions, everything feels unpredictable. Each mock session
            makes the format less novel — the chair, the pause before answering, the &ldquo;can you elaborate on
            that?&rdquo; — so less mental energy goes to processing the <em>situation</em> and more goes to your actual
            answer.
          </p>
          <p>
            <strong>Exposure, not avoidance.</strong> Clinical psychology has used gradual exposure for decades to
            reduce fear responses — you don&apos;t eliminate anxiety by thinking about the thing less, you reduce it by
            approaching it in controlled, repeated doses. Mock interviews apply the same logic: low-stakes reps before
            high-stakes placement interviews, so your nervous system learns the room isn&apos;t actually dangerous.
          </p>
          <p>
            <strong>Reducing uncertainty.</strong> Much of interview anxiety is not knowing what will happen — which
            questions, how long the silence will last, whether a follow-up is coming. Mock practice replaces some of
            that uncertainty with pattern recognition. You start recognizing question types, pacing yourself through
            pauses, and knowing you can recover from a stumble. That predictability alone calms interview nervousness
            significantly.
          </p>
          <p>
            <strong>Pressure adaptation.</strong> Speaking under mild evaluative pressure is a skill that adapts with
            repetition — like lifting heavier weights gradually. One mock interview won&apos;t rewire you. Ten sessions
            over two weeks will. Each rep raises your tolerance slightly, so real placement interviews feel closer to
            something you&apos;ve already done than something you&apos;re encountering for the first time.
          </p>

          <h2 id="ai-mock-edge">Where AI mock practice has an edge</h2>
          <p>
            The honest reason most students don&apos;t practice speaking is embarrassment — you don&apos;t want to
            fumble in front of a mentor or friend, so you avoid it, so you never improve. AI mock interviews remove the
            audience. You can practice at 2 AM, repeat the same question ten times, and fail privately as many times as
            you need to.
          </p>
          <p>
            On InterviewEra specifically, every answer comes back scored on five dimensions — communication, technical
            depth, STAR structure, confidence, and relevance — so you&apos;re not guessing whether you improved. You can
            watch your confidence score climb across sessions instead of relying on a vague feeling. A student who starts
            at, say, a 5 on confidence and practices consistently will usually see that number move into the 7s within a
            couple of weeks — not because they got smarter, but because the room stopped being scary.
          </p>
          <p>
            The platform also unlocks harder modes in tiers as you go — Fundamentals first, then advanced questions,
            then company-style patterns, then a full mock panel — so the difficulty rises with you instead of
            overwhelming you on day one. You can{' '}
            <Link href="/signup" className="ie-blog-inline-link">
              start with two free mock sessions
            </Link>{' '}
            and scale up through{' '}
            <Link href="/pricing" className="ie-blog-inline-link">
              paid plans
            </Link>{' '}
            once you&apos;re ready for more volume.
          </p>

          <h2 id="how-to-practice">How to practice so it actually works</h2>
          <ul>
            <li>
              <strong>Start small.</strong> Self-introduction, basic HR questions, simple &ldquo;explain your
              project&rdquo; prompts. Don&apos;t open with system design.
            </li>
            <li>
              <strong>Speak out loud, always.</strong> Reading answers in your head builds zero interview muscle.
            </li>
            <li>
              <strong>Simulate the real thing.</strong> Sit up, use the camera, time yourself, don&apos;t read from
              notes.
            </li>
            <li>
              <strong>Review yourself.</strong> Watch your pace, filler words, and eye contact. Most students improve
              sharply just from seeing themselves once.
            </li>
            <li>
              <strong>Aim for &ldquo;better,&rdquo; not &ldquo;perfect.&rdquo;</strong> The goal of each session is to
              be a little less rattled than the last one.
            </li>
          </ul>
          <p>
            For behavioral answers, structure matters as much as delivery — the{' '}
            <Link href="/blog/what-is-star-method-with-examples" className="ie-blog-inline-link">
              STAR method
            </Link>{' '}
            gives you a scaffold so anxiety has less room to scatter your response. For broader placement prep context,
            see our{' '}
            <Link href="/blog/how-to-prepare-for-placement-interviews" className="ie-blog-inline-link">
              complete placement interview guide
            </Link>
            .
          </p>

          <h2 id="common-mistakes">Mistakes students make when trying to build interview confidence</h2>
          <p>
            Most students who struggle with interview anxiety aren&apos;t lazy — they&apos;re preparing in ways that
            feel productive but don&apos;t train the actual skill. These are the patterns that keep people freezing
            despite solid technical prep.
          </p>
          <ul>
            <li>
              <strong>Reading notes instead of speaking.</strong> Silent review builds recognition, not retrieval.
              Interviews require you to produce answers out loud, in real time. If you haven&apos;t spoken the words,
              your mouth won&apos;t find them under pressure.
            </li>
            <li>
              <strong>Memorizing scripted answers.</strong> Scripts collapse the moment an interviewer asks a follow-up
              you didn&apos;t anticipate. You end up sounding robotic — or worse, you lose your place and freeze
              completely. Understand your stories; don&apos;t memorize them word for word.
            </li>
            <li>
              <strong>Avoiding difficult questions.</strong> Skipping the prompts that make you uncomfortable — system
              design basics, gaps in your resume, &ldquo;why should we hire you?&rdquo; — means those are exactly the
              questions that will derail you on the day. Practice the uncomfortable ones first.
            </li>
            <li>
              <strong>Never recording themselves.</strong> You don&apos;t know how you come across until you watch it
              back. Filler words, rushed pacing, and downward glances are invisible in the moment but obvious on a
              recording. One self-review session often fixes more than a week of silent prep.
            </li>
            <li>
              <strong>Only preparing technical topics.</strong> Plenty of strong coders fail HR and managerial rounds
              because they never practiced explaining themselves. Interview confidence for placement season requires
              both — technical depth <em>and</em> clear verbal communication. Don&apos;t neglect the half that anxiety
              hits hardest.
            </li>
          </ul>

          <h2 id="seven-day-plan">7-day interview confidence plan</h2>
          <p>
            You don&apos;t need a month to start building interview confidence — you need seven focused days of speaking
            out loud. This is a practical starting point, not a guarantee. Adjust based on where your placement timeline
            sits.
          </p>
          <ul>
            <li>
              <strong>Day 1 — Baseline.</strong> Record a 2-minute self-introduction and a 3-minute project walkthrough.
              Watch both back. Note where you pause, ramble, or lose structure. No fixing yet — just observe.
            </li>
            <li>
              <strong>Day 2 — HR fundamentals.</strong> Answer five common HR questions out loud: strengths, weaknesses,
              why this role, tell me about a challenge, why should we hire you. Time yourself — aim for 90 seconds per
              answer.
            </li>
            <li>
              <strong>Day 3 — First mock session.</strong> Run one full mock interview (AI or with a peer). Focus on
              finishing every answer, even if it&apos;s messy. Review what broke down.
            </li>
            <li>
              <strong>Day 4 — Fix one weak spot.</strong> Pick the single worst moment from Day 3 — a long pause, a
              vague project explanation, a collapsed STAR answer — and redo just that question five times out loud.
            </li>
            <li>
              <strong>Day 5 — Technical speaking.</strong> Explain two DSA concepts and one project architecture
              decision as if teaching a junior. No code on screen — verbal only. This trains how to stop freezing on
              technical follow-ups.
            </li>
            <li>
              <strong>Day 6 — Second mock session.</strong> Run another full mock with harder questions. Compare your
              delivery to Day 3. You should notice shorter pauses and cleaner structure even if content is similar.
            </li>
            <li>
              <strong>Day 7 — Simulate the real thing.</strong> Dress appropriately, sit upright, use your camera, no
              notes. Run a 30-minute mock covering HR + technical + one unexpected question. This is your dress
              rehearsal before placement interviews.
            </li>
          </ul>

          <h2 id="signs-its-working">The signs it&apos;s working</h2>
          <p>
            You&apos;ll feel the shift before you can name it: less shaking, smoother flow, quicker thinking, more eye
            contact, and a strange new calm when an unexpected question lands. That&apos;s the point where interview
            performance starts improving fast.
          </p>
          <p>
            Interview confidence is almost never built from theory. It&apos;s built from repetition. Every student feels
            the anxiety before placements — the only thing that separates outcomes is how many reps you got in before
            it counted. If you want to understand how mock interview practice fits into a broader prep strategy, read
            why{' '}
            <Link href="/blog/ai-mock-interviews-smartest-prep-2026" className="ie-blog-inline-link">
              AI mock interviews are the smartest way to prepare in 2026
            </Link>
            .
          </p>

          <h2 id="faq">FAQ</h2>
          <BlogEditorialFaq items={FAQ_ITEMS} />

          <aside className="ie-blog-anxiety-cta ie-blog-anxiety-cta--spaced" aria-labelledby="interview-anxiety-cta-heading">
            <p id="interview-anxiety-cta-heading" className="ie-blog-anxiety-cta__title">
              Still nervous about interviews?
            </p>
            <p className="ie-blog-anxiety-cta__body">
              Practice with AI mock interviews and get instant feedback on communication, confidence, structure, and
              relevance before your real placement interviews.
            </p>
            <BlogStartFreeCta
              href="/signup"
              section="blog_interview_anxiety_cta"
              ctaText="Start Free Mock Interview"
              className="landing-cta-lift mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-6 text-sm font-semibold text-white sm:h-12 sm:px-8 sm:text-base"
              style={{
                background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
                boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
              }}
            >
              Start Free Mock Interview
              <ArrowRight className="size-4" aria-hidden />
            </BlogStartFreeCta>
            <p className="ie-blog-anxiety-cta__note">Two free sessions. No card required.</p>
          </aside>

          <section className="ie-blog-anxiety-related ie-blog-anxiety-related--spaced" aria-labelledby="continue-reading-heading">
            <p id="continue-reading-heading" className="ie-blog-anxiety-related__heading">
              Continue Reading
            </p>
            <div className="ie-blog-anxiety-related__grid">
              {RELATED_POSTS.map((post) => (
                <Link key={post.href} href={post.href} className="ie-blog-anxiety-related__card">
                  <span className="ie-blog-anxiety-related__card-title">{post.title}</span>
                  <span className="ie-blog-anxiety-related__card-teaser">{post.teaser}</span>
                </Link>
              ))}
            </div>
          </section>

          <p className="mt-10 text-base italic" style={{ color: 'var(--text-secondary)' }}>
            Interview confidence comes from reps, not theory.{' '}
            <Link href="/signup" className="ie-blog-inline-link font-medium not-italic">
              Start with two free mock sessions on InterviewEra
            </Link>{' '}
            — no card needed. See{' '}
            <Link href="/pricing" className="ie-blog-inline-link font-medium not-italic">
              pricing
            </Link>{' '}
            when you&apos;re ready for more volume.
          </p>
          </div>
        </article>
      </BlogMarketingShell>
    </>
  );
}
