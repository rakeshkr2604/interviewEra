import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
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

const META_TITLE = 'How to Get Internships in India';
const META_DESCRIPTION =
  'Good students miss internships from weak signal and low applications — not missing skills. A guide to applications and interview preparation.';
const ARTICLE_DESCRIPTION =
  'Good students miss internships because of weak signal, low application volume, and poor interview conversion — not missing skills. A practical college internship guide for engineering students.';
const CANONICAL_PATH = '/blog/how-to-get-internship-opportunities';
const PUBLISHED_DATE = '2026-05-31';
const HERO_PATH = '/blog/internship-opportunities-hero-v2.webp';
const ORIGIN = getCanonicalSiteOrigin();

export const metadata: Metadata = generateMetadata({
  title: META_TITLE,
  description: META_DESCRIPTION,
  path: CANONICAL_PATH,
  ogImage: `${ORIGIN}${HERO_PATH}`,
  socialTitle: brandArticleOgTitle(META_TITLE),
  keywords:
    'how to get internships, internship opportunities, internship applications, internship interview preparation, software engineering internship, internship tips for students, college internship guide',
  openGraphType: 'article',
});

const ARTICLE_LD = articleJsonLd({
  headline: META_TITLE,
  description: META_DESCRIPTION,
  canonicalUrl: canonicalUrl(CANONICAL_PATH),
  datePublished: PUBLISHED_DATE,
  authorName: 'InterviewEra Team',
  publisherId: schemaIds.organization,
  imageUrl: `${ORIGIN}${HERO_PATH}`,
});

const BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: 'Internship Guide', path: CANONICAL_PATH },
  ],
  ORIGIN,
);

const TOC_SECTIONS = [
  { id: 'student-example', label: 'A realistic student example' },
  { id: 'why-internships', label: 'Why internships are worth the effort' },
  { id: 'hiring-reality', label: 'What recruiters actually see' },
  { id: 'signal-layer', label: 'Layer 1 — The signal' },
  { id: 'volume-layer', label: 'Layer 2 — The volume' },
  { id: 'conversion-layer', label: 'Layer 3 — The conversion' },
  { id: 'internship-mistakes', label: 'Mistakes during internship hunting' },
  { id: 'signs-working', label: 'Signs your strategy is working' },
  { id: 'fourteen-day-plan', label: '14-day internship momentum plan' },
  { id: 'rejections', label: 'Rejections aren\'t the verdict' },
  { id: 'faq', label: 'FAQ' },
] as const;

const RELATED_POSTS = [
  {
    href: '/blog/overcome-interview-anxiety-mock-interviews',
    title: 'Why You Freeze in Interviews — And How Mock Practice Fixes It',
    teaser:
      'Interview anxiety blocks strong answers — not knowledge. Learn why you freeze and how mock practice retrains your brain.',
  },
  {
    href: '/blog/english-confidence-interviews',
    title: "Your English Isn't Costing You the Interview. Your Delivery Is.",
    teaser:
      'Delivery — clarity, structure, and confidence — matters more than perfect English in internship and placement interviews.',
  },
] as const;

const FAQ_ITEMS = [
  {
    question: 'How many internship applications should I send?',
    answer:
      'Most students need 40–80 targeted applications before consistent interview calls appear — sometimes more in competitive seasons. Ten strong applications a week for six to eight weeks beats sixty panic applications in one weekend. Track every application and follow up where possible.',
  },
  {
    question: 'Do I need internships before getting my first internship?',
    answer:
      'No — everyone starts at zero. What you need is proof of initiative: one or two finished projects, a clear resume, and the ability to explain your work in an interview. Your first internship is about showing you can learn and deliver, not that you have already interned elsewhere.',
  },
  {
    question: 'Is LinkedIn important for internships?',
    answer:
      'Yes, especially for off-campus and software engineering internship roles. Recruiters search LinkedIn by skills, college, and keywords. A complete profile with a specific headline, project links, and an open-to-work signal often generates inbound messages you would never get from a resume alone.',
  },
  {
    question: 'Can small projects help me get internships?',
    answer:
      'Absolutely. Recruiters look for evidence you finish things — a deployed portfolio site, a CRUD app with auth, a small tool you built and documented. A small project you can explain clearly beats a complex project you cannot walk through in an interview.',
  },
  {
    question: 'What if I keep getting rejected?',
    answer:
      'Treat silence and rejections as data. Review your resume scan-ability, application volume, and interview delivery separately. Most students who eventually land offers sent many more applications than they expected and practiced explaining projects out loud — not just building them silently.',
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

export default function HowToGetInternshipOpportunitiesPage() {
  return (
    <>
      <JsonLdScript id="internship-article-ld" data={ARTICLE_LD} />
      <JsonLdScript id="internship-breadcrumb-ld" data={BREADCRUMB_LD} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema()) }} />
      <BlogMarketingShell backHref="/blog" backLabel="All guides">
        <article className="ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series mx-auto w-full">
          <BlogEditorialHeader
            category="Career"
            titleLine="Why Good Students Don't Get Internships"
            titleAccent="(And What Actually Works)"
            description={ARTICLE_DESCRIPTION}
            readTime="14 min read"
            updatedLabel="Updated May 2026"
            heroSrc={HERO_PATH}
            heroAlt="Student improving internship applications through signal, volume, and interview conversion"
          />

          <div className="ie-blog-interview-anxiety-content">
            <BlogEditorialToc sections={TOC_SECTIONS} />

            <p>
              Most students who can&apos;t land an internship assume the problem is their skills. They tell themselves
              they need to learn one more framework, finish one more course, grind a few hundred more problems —{' '}
              <em>then</em> they&apos;ll be ready to apply.
            </p>
            <p>
              That&apos;s usually the wrong diagnosis. The students struggling to get interviews aren&apos;t unskilled.
              They&apos;re invisible and inconsistent. They send a handful of internship applications with an average
              resume and a blank LinkedIn, hear nothing back, get discouraged, and stop. The skill was rarely the issue.
              The <strong>signal</strong> and the <strong>consistency</strong> were.
            </p>
            <p>
              An internship hunt is two games stacked on top of each other: a <em>signal</em> game (do recruiters notice
              you and trust you enough to interview you?) and a <em>conversion</em> game (once they interview you, can
              you carry the conversation?). Skill matters — but it&apos;s necessary, not sufficient. The framework that
              actually works is <strong>Signal → Volume → Conversion</strong>. Let&apos;s fix all three layers.
            </p>

            <EditorialCallout
              label="Key Insight"
              quote="Most students do not lose internships because they lack skills. They lose them because recruiters never notice those skills."
            />

            <h2 id="student-example">A realistic student example</h2>
            <p>
              Rohan is a third-year CSE student at a tier-2 college in Jaipur. He finished a DSA sheet, built two MERN
              projects, and listed every course he&apos;d taken on his resume. By his own estimate, he was &ldquo;ready.&rdquo;
              Over two months he applied to nine companies — mostly big names he saw on LinkedIn — and heard back from
              zero.
            </p>
            <p>
              He assumed his skills weren&apos;t good enough. He started another course instead of diagnosing the pipeline.
              A senior reviewed his materials and found the real blockers: a dense two-page resume with no clear headline,
              a LinkedIn profile with no project links, no GitHub README on either project, and no tracking of where
              he&apos;d applied or when to follow up.
            </p>
            <p>
              Over the next five weeks he rewrote the resume to one page, rebuilt his LinkedIn headline, documented both
              projects on GitHub, and started sending eight to ten targeted applications per week through portals,
              company career pages, and a handful of referral asks. He also ran{' '}
              <Link href="/signup" className="ie-blog-inline-link">
                mock interviews
              </Link>{' '}
              before each call — project walkthroughs, not just coding. Interview invitations picked up by week four. By
              week six he had an offer from a mid-size product company. Same skills as before. Different signal, volume,
              and conversion.
            </p>

            <h2 id="why-internships">Why internships are worth the effort</h2>
            <p>Before the how, a quick reminder of why this is worth grinding for. A good internship gets you:</p>
            <ul>
              <li>Real, hands-on experience instead of tutorial knowledge</li>
              <li>Sharper technical and communication skills</li>
              <li>A resume that stands out from classmates who have none</li>
              <li>A genuine read on whether you even like the industry</li>
              <li>A serious edge in full-time hiring later</li>
            </ul>
            <p>
              Plenty of employers now treat &ldquo;no internship experience&rdquo; as a quiet filter. An internship is
              proof you&apos;ve already done the work once. For broader placement prep beyond internships, see our{' '}
              <Link href="/blog/how-to-prepare-for-placement-interviews" className="ie-blog-inline-link">
                complete placement interview guide
              </Link>
              .
            </p>

            <h2 id="hiring-reality">What recruiters actually see</h2>
            <p>
              Here&apos;s the hiring reality most students never hear: recruiters and hiring managers cannot deeply
              evaluate every application. For a popular software engineering internship posting, hundreds of resumes may
              arrive in days. Each reviewer has minutes — sometimes seconds — per application in the first pass.
            </p>
            <p>
              That means your materials are scanned, not read. Recruiters look for quick trust signals: a clear role
              match in the headline, recognizable project types, readable formatting, links that work, and keywords
              that match the job description. Automated systems add another filter — if your resume never matches the
              posting language, a human may never see it at all.
            </p>
            <p>
              First impression is the whole game at the signal layer. You are not failing because you lack ability. You
              are often failing because your ability is buried in a format that nobody has time to excavate. Once you
              understand that, the fix stops being &ldquo;learn more&rdquo; and starts being &ldquo;communicate better
              and show up more often.&rdquo;
            </p>

            <h2 id="signal-layer">Layer 1: The signal — get noticed and trusted</h2>
            <p>
              This is where most students silently fail, because they think recruiters are evaluating their skill when
              recruiters are first just <em>scanning for reasons to click.</em>
            </p>
            <p>
              <strong>A resume that survives a 7-second scan.</strong> One page. Clear structure. Goal-oriented. No fake
              certifications or padded skills — those get exposed in the interview and end the conversation instantly.
              The resume&apos;s only job is to earn the interview, not to list everything you&apos;ve ever touched.
            </p>
            <p>
              Weak signal: a two-page list of every technology you&apos;ve touched, no metrics, no link to projects,
              &ldquo;seeking opportunities in software development&rdquo; as the only headline. Strong signal: one
              line — &ldquo;B.Tech CSE · MERN projects · Open to SDE internships&rdquo; — plus three bullets on
              projects with outcomes (&ldquo;built hostel booking app, 200+ users in pilot&rdquo;) and a GitHub link
              that loads in one click.
            </p>
            <p>
              <strong>A LinkedIn that recruiters can actually find.</strong> Most students treat LinkedIn as a
              formality. Recruiters treat it as a search engine. Give them what they search for: a real headshot, a
              specific headline with keywords, your actual skills, links to projects, and a clear line on what kind of
              internship you want.
            </p>
            <p>
              Weak signal: default headline (&ldquo;Student at XYZ University&rdquo;), empty About section, no featured
              links. Strong signal: &ldquo;Aspiring Backend Intern · Java &amp; Node · Built payment integration
              project&rdquo; with Featured section linking to GitHub and a live demo.
            </p>
            <p>
              <strong>GitHub and portfolio links that prove the work is real.</strong> Recruiters click through. A
              repo with no README, no setup instructions, and one commit reads as unfinished — even if the code is
              fine. A clean README with problem statement, tech stack, screenshots, and how to run locally reads as
              professional.
            </p>
            <p>
              <strong>Small projects that prove initiative.</strong> You don&apos;t need anything complex — a portfolio
              site, a to-do app, a weather app, a small AI tool. Recruiters aren&apos;t looking for complexity.
              They&apos;re looking for evidence you start things and finish them. A small project explained well beats a
              big project you can&apos;t talk about.
            </p>

            <EditorialCallout
              label="Remember"
              quote="Applying consistently beats applying perfectly."
            />

            <h2 id="volume-layer">Layer 2: The volume — apply like it&apos;s a numbers game</h2>
            <p>
              The single most common mistake is applying occasionally and expecting results. Internship hunting{' '}
              <em>is</em> a numbers game — not because quality doesn&apos;t matter, but because even strong candidates
              face silence on most applications. You might apply to 20 companies, or 50, or 100+ before something
              lands. Rejections and silence are the cost of entry, not a verdict on you.
            </p>
            <p>
              <strong>Realistic benchmarks.</strong> If you are sending fewer than five applications a week, you are
              almost certainly under-shooting. Students who land internships in competitive seasons often track 40–80
              total applications over six to eight weeks — with weekly consistency, not one burst and stop. Expect a
              response rate well below 20% at the top; many strong profiles see single-digit callback rates on cold
              applications alone.
            </p>
            <p>
              <strong>Application tracking.</strong> Use a simple spreadsheet: company name, role, date applied, portal
              used, referral (yes/no), status, follow-up date. Without tracking, you repeat applications, miss
              follow-ups, and cannot tell whether the problem is signal or volume.
            </p>
            <p>
              <strong>Where to apply.</strong> Spread internship applications across channels instead of relying on one:
            </p>
            <ul>
              <li>
                <strong>Internship portals</strong> — Internshala, Unstop, company-specific campus drives, your
                college TPO list.
              </li>
              <li>
                <strong>Company career pages</strong> — Many product companies post internships only on their own sites;
                those roles get fewer applicants than LinkedIn reposts.
              </li>
              <li>
                <strong>LinkedIn outreach</strong> — Short, specific messages to alumni or engineers at target companies
                (not copy-paste spam). Mention one real project and ask about internship hiring — not &ldquo;please refer
                me&rdquo; in the first line.
              </li>
              <li>
                <strong>Referrals</strong> — One warm referral often beats twenty cold applications. Ask seniors who
                interned where their team hires and what the bar looks like.
              </li>
            </ul>
            <p>
              Consistency beats intensity here. Ten applications a week for six weeks will always beat sixty applications
              in one panic-filled weekend and then nothing. Treat internship applications like a habit, not an event.
            </p>

            <h2 id="conversion-layer">Layer 3: The conversion — don&apos;t fumble the interview</h2>
            <p>
              Here&apos;s the layer almost nobody practices, and it&apos;s the one that wastes all the work from layers
              1 and 2. You can have a perfect resume and 80 applications, get the interview, and then freeze — because
              knowing your projects in your head is completely different from explaining them out loud under pressure.
            </p>
            <p>
              This is exactly what mock interviews train. Practicing real interview questions — especially with AI,
              where you can repeat them privately as many times as you need — builds the muscle that converts an
              interview into an offer:
            </p>
            <ul>
              <li>Speaking about your projects clearly instead of mumbling through them</li>
              <li>Handling behavioral and technical questions without going blank</li>
              <li>Getting instant feedback on what&apos;s weak</li>
            </ul>
            <p>
              On{' '}
              <Link href="/" className="ie-blog-inline-link">
                InterviewEra
              </Link>
              , every answer is scored on five dimensions — communication, technical depth, structure, confidence, and
              relevance — so you can see precisely where you&apos;re losing the recruiter and fix it before a real
              interview ever happens. A student who practices a handful of sessions before applying walks into
              interviews already familiar with the format, which is most of the battle.
            </p>
            <p>
              If nerves hijack your delivery, read how{' '}
              <Link href="/blog/overcome-interview-anxiety-mock-interviews" className="ie-blog-inline-link">
                mock practice reduces interview anxiety
              </Link>
              . If you worry your English is the bottleneck, it usually isn&apos;t —{' '}
              <Link href="/blog/english-confidence-interviews" className="ie-blog-inline-link">
                delivery matters more than vocabulary
              </Link>
              . You can{' '}
              <Link href="/signup" className="ie-blog-inline-link">
                start with three free mock sessions
              </Link>{' '}
              or check{' '}
              <Link href="/pricing" className="ie-blog-inline-link">
                pricing
              </Link>{' '}
              when you need more volume.
            </p>

            <h2 id="internship-mistakes">Mistakes students make during internship hunting</h2>
            <ul>
              <li>
                <strong>Applying to only a few companies.</strong> Nine applications and silence is a volume problem,
                not a verdict on your ability. Most students quit before the numbers work in their favor.
              </li>
              <li>
                <strong>Waiting until they feel ready.</strong> Readiness is a moving target. You learn interview skills
                by interviewing — and you learn what your resume is missing by sending it and tracking results.
              </li>
              <li>
                <strong>Generic resumes.</strong> One PDF sent everywhere, with no keywords from the job description,
                gets filtered out before a human reads it.
              </li>
              <li>
                <strong>No LinkedIn presence.</strong> You disappear from recruiter searches entirely — especially for
                off-campus software engineering internship roles.
              </li>
              <li>
                <strong>Poor follow-up.</strong> A polite follow-up one week after applying, or after a referral, is
                not annoying — it signals interest. Most students never do it.
              </li>
              <li>
                <strong>Giving up after rejection.</strong> One silence confirms nothing except that this pass didn&apos;t
                land. The students who get offers are usually the ones still applying and still practicing after the
                tenth no.
              </li>
            </ul>

            <h2 id="signs-working">Signs your internship strategy is working</h2>
            <p>You are moving in the right direction when you notice these — often before the first offer:</p>
            <ul>
              <li>
                <strong>More LinkedIn profile views</strong> and appearance in recruiter searches after headline and
                project updates.
              </li>
              <li>
                <strong>Recruiter or alumni messages</strong> — even short ones — asking about your availability or
                stack.
              </li>
              <li>
                <strong>Resume shortlists</strong> and OA invitations where you previously got silence.
              </li>
              <li>
                <strong>Interview invitations</strong> increasing week over week as application volume holds steady.
              </li>
              <li>
                <strong>Better interview performance</strong> — clearer project explanations, fewer long pauses, less
                rambling — especially after mock practice.
              </li>
              <li>
                <strong>Increasing confidence</strong> walking into calls because you have explained your work out loud
                ten times already.
              </li>
            </ul>
            <p>
              These signs tend to arrive together — and that cluster usually shows up right before offers do.
            </p>

            <h2 id="fourteen-day-plan">14-day internship momentum plan</h2>
            <p>
              A realistic two-week sprint to improve signal, volume, and conversion at once. Adjust pace if you are also
              in active exam season.
            </p>
            <ul>
              <li>
                <strong>Day 1 — Resume audit.</strong> Cut to one page. One clear headline, three project bullets with
                outcomes, working links. Remove filler skills.
              </li>
              <li>
                <strong>Day 2 — LinkedIn pass.</strong> Update headline, About (3–4 lines), Featured links to GitHub and
                best project. Turn on open-to-work for internships.
              </li>
              <li>
                <strong>Day 3 — GitHub cleanup.</strong> Add READMEs to top two repos: problem, stack, setup, demo
                screenshot.
              </li>
              <li>
                <strong>Day 4 — Project story.</strong> Write a 90-second spoken script for each project. Record
                yourself once.
              </li>
              <li>
                <strong>Day 5 — Application tracker.</strong> Set up spreadsheet columns. List 30 target companies
                across portals, career pages, and referrals.
              </li>
              <li>
                <strong>Day 6 — First application batch.</strong> Send 5 tailored applications. Mirror keywords from each
                posting in your resume bullet order.
              </li>
              <li>
                <strong>Day 7 — Networking.</strong> Message 3 alumni or seniors with one specific question about their
                team&apos;s internship process — not a generic refer-me blast.
              </li>
              <li>
                <strong>Day 8 — Mock interview #1.</strong> Run a project walkthrough mock. Fix the weakest explanation.
              </li>
              <li>
                <strong>Day 9 — Application batch #2.</strong> Five more applications. Follow up on Day 6 submissions
                where contact exists.
              </li>
              <li>
                <strong>Day 10 — Behavioral prep.</strong> Practice &ldquo;tell me about yourself,&rdquo; strengths, why
                this company — out loud, timed.
              </li>
              <li>
                <strong>Day 11 — Application batch #3.</strong> Five applications plus two LinkedIn outreach messages.
              </li>
              <li>
                <strong>Day 12 — Mock interview #2.</strong> Full internship-style session: intro, project, one
                technical follow-up.
              </li>
              <li>
                <strong>Day 13 — Review metrics.</strong> Count applications sent, responses, profile views. Adjust
                resume headline if zero traction.
              </li>
              <li>
                <strong>Day 14 — Lock the habit.</strong> Calendar-block one hour daily: 3 applications + 10 minutes
                speaking practice. Repeat weekly until offers land.
              </li>
            </ul>

            <h2 id="rejections">Rejections aren&apos;t the verdict</h2>
            <p>
              Treat every rejection as data, not failure. Each one teaches you something about your resume, your
              answers, or your fit — and each one makes the next interview a little less frightening. The students who
              get internships aren&apos;t the ones who never get rejected. They&apos;re the ones who kept applying and
              kept practicing after they did.
            </p>
            <p>
              You don&apos;t need to be perfect to get an internship. You need to be visible, consistent, and able to
              hold a conversation about your own work. Fix those three layers and the offers stop feeling like luck.
            </p>

            <h2 id="faq">FAQ</h2>
            <BlogEditorialFaq items={FAQ_ITEMS} />

            <aside className="ie-blog-anxiety-cta ie-blog-anxiety-cta--spaced" aria-labelledby="internship-cta-heading">
              <p id="internship-cta-heading" className="ie-blog-anxiety-cta__title">
                Turn More Interview Calls Into Internship Offers
              </p>
              <p className="ie-blog-anxiety-cta__body">
                Practice explaining projects, answering behavioral questions, and communicating with confidence before
                your next internship interview.
              </p>
              <Link
                href="/signup"
                className="landing-cta-lift mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-6 text-sm font-semibold text-white sm:h-12 sm:px-8 sm:text-base"
                style={{
                  background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
                  boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
                }}
              >
                Start Free Mock Interview
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <p className="ie-blog-anxiety-cta__note">Three free sessions. No card required.</p>
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
              Stop fumbling the interviews you worked hard to get.{' '}
              <Link href="/signup" className="ie-blog-inline-link font-medium not-italic">
                Practice for free on InterviewEra
              </Link>{' '}
              — three mock interviews, real feedback, no card required.
            </p>
          </div>
        </article>
      </BlogMarketingShell>
    </>
  );
}
