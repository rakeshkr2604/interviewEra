import Link from 'next/link'
import {
  BlogEditorialFaq,
  BlogEditorialToc,
} from '@/components/blog/BlogEditorialHeader'
import { GoogleApprenticeshipHeroVisual } from '@/components/content/GoogleApprenticeshipHeroVisual'
import { GoogleApprenticeshipTimelineVisual } from '@/components/content/GoogleApprenticeshipTimelineVisual'
import { TcsResponsiveDataTable } from '@/components/programmatic/TcsResponsiveDataTable'
import {
  GOOGLE_APPRENTICESHIP_APPLICATION_STAGES,
  GOOGLE_APPRENTICESHIP_CONTEXTUAL_LINKS,
  GOOGLE_APPRENTICESHIP_DEADLINE,
  GOOGLE_APPRENTICESHIP_ELIGIBILITY,
  GOOGLE_APPRENTICESHIP_FAQ_ITEMS,
  GOOGLE_APPRENTICESHIP_LAST_VERIFIED,
  GOOGLE_APPRENTICESHIP_LATEST_UPDATES,
  GOOGLE_APPRENTICESHIP_LOCATIONS,
  GOOGLE_APPRENTICESHIP_OUTSIDE_INDIA_COLUMNS,
  GOOGLE_APPRENTICESHIP_OUTSIDE_INDIA_ROWS,
  GOOGLE_APPRENTICESHIP_RESUME_TIPS,
  GOOGLE_APPRENTICESHIP_SOURCES,
  GOOGLE_APPRENTICESHIP_TOC,
  GOOGLE_APPRENTICESHIP_TRACKS_COLUMNS,
  GOOGLE_APPRENTICESHIP_TRACKS_ROWS,
} from '@/lib/seo/content/google-apprenticeship-hub'

const cardStyle = {
  borderColor: 'var(--card-border)',
  background: 'var(--card-bg)',
  boxShadow: 'var(--card-shadow)',
} as const

function DeadlineCallout() {
  return (
    <aside
      className="ie-ga-deadline-callout rounded-xl border p-4 sm:p-5"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-warning) 40%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-warning) 10%, var(--card-bg))',
      }}
      aria-label="Application deadline"
    >
      <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--accent-warning)' }}>
        Act now
      </p>
      <p className="mt-2 m-0 text-base font-semibold leading-snug sm:text-lg" style={{ color: 'var(--text-primary)' }}>
        Applications for the India cohort close on <strong>{GOOGLE_APPRENTICESHIP_DEADLINE}</strong>.
      </p>
      <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        If you have been searching &ldquo;Google apprenticeship last date,&rdquo; apply first through{' '}
        <a
          href="https://careers.google.com"
          className="font-medium underline-offset-4 hover:underline"
          style={{ color: 'var(--accent-primary)' }}
          rel="noopener noreferrer"
          target="_blank"
        >
          careers.google.com
        </a>
        , then use this guide for eligibility and prep details.
      </p>
    </aside>
  )
}

export function GoogleApprenticeshipArticle() {
  return (
    <article className="ie-blog-prose ie-blog-prose--editorial-series mx-auto w-full max-w-3xl">
      <header className="ie-blog-editorial-header">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            Career · India · 2026 Applications
          </p>
          <h1 className="ie-blog-article-h1 ie-blog-article-h1--single">
            Google Apprenticeship 2026: Eligibility, Salary, Last Date, Application Process &amp; India Guide
          </h1>
          <p className="ie-blog-article-deck">
            Google&apos;s listings call this the &ldquo;2027 cohort&rdquo; because the program starts in March 2027
            — but applications, the deadline, and eligibility below are all live right now in 2026.
          </p>
          <div
            className="ie-blog-article-meta mt-4 flex flex-wrap gap-2 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>18 min read</span>
            <span aria-hidden>·</span>
            <span>Last verified {GOOGLE_APPRENTICESHIP_LAST_VERIFIED}</span>
          </div>
        </div>
      </header>

      <div className="mt-8 space-y-8">
        <GoogleApprenticeshipHeroVisual />

        <DeadlineCallout />

        <p>
          If you&apos;ve been searching &ldquo;Google apprenticeship&rdquo; or &ldquo;Google apprenticeship last
          date,&rdquo; here&apos;s the one thing to act on first:{' '}
          <strong>applications for the India cohort close on {GOOGLE_APPRENTICESHIP_DEADLINE}.</strong> Bookmark this,
          apply, then come back for the details below.
        </p>

        <BlogEditorialToc sections={GOOGLE_APPRENTICESHIP_TOC} twoColumnList />

        <section aria-labelledby="what-is-google-apprenticeship">
          <h2 id="what-is-google-apprenticeship">What Is the Google Apprenticeship Program?</h2>
          <p>
            Google&apos;s Apprenticeship Program is a paid, work-and-study opportunity for people who want to break
            into tech, marketing, analytics, or project management careers — without necessarily having a traditional
            corporate resume. Unlike an internship, apprentices work full-time (around 40 hours a week) alongside
            Google teams, while also going through structured, external training. It is aimed at recent graduates and
            career switchers alike; prior industry experience is not a requirement for most tracks.
          </p>
          <p>
            It is <strong>not</strong> a permanent, full-time job. Programs run 12 to 24 months depending on the
            track, and apprentices can apply for full-time roles at Google only in the final three months of their
            program.
          </p>
        </section>

        <section aria-labelledby="latest-updates">
          <h2 id="latest-updates">Latest Updates</h2>
          <ul>
            {GOOGLE_APPRENTICESHIP_LATEST_UPDATES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="google-apprenticeship-tracks">
          <h2 id="google-apprenticeship-tracks">Google Apprenticeship India — Tracks</h2>
          <TcsResponsiveDataTable
            caption="Google Apprenticeship India tracks — duration, eligibility, and best fit"
            columns={GOOGLE_APPRENTICESHIP_TRACKS_COLUMNS}
            rows={GOOGLE_APPRENTICESHIP_TRACKS_ROWS}
          />
          <p>
            <strong>Data Analytics</strong> is worth calling out separately: it is the track drawing the most search
            interest of the four, and it is the most accessible — Google&apos;s listing accepts a bachelor&apos;s degree
            in <em>any</em> field. If you are a non-CS graduate wondering whether you qualify, start there.
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Dedicated full-depth guides for Data Analytics, Digital Marketing, and Project Management are coming soon —
            this section stays a summary on purpose so it does not compete with those articles for the same searches.
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-locations">
          <h2 id="google-apprenticeship-locations">Google Apprenticeship Locations</h2>
          <p>All four India tracks are in-office, full-time roles at one of four cities:</p>
          <ul>
            {GOOGLE_APPRENTICESHIP_LOCATIONS.map((city) => (
              <li key={city}>{city}</li>
            ))}
          </ul>
          <p>
            There is no remote option, and location transfers are not permitted once you are onboarded — factor
            relocation into your decision before applying.
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-eligibility">
          <h2 id="google-apprenticeship-eligibility">Google Apprenticeship Eligibility</h2>
          <ul>
            {GOOGLE_APPRENTICESHIP_ELIGIBILITY.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>
            <strong>Who can apply?</strong> Any graduate (not a current student) with under a year of relevant
            experience, legally able to work in India. Career switchers are explicitly welcome, especially for Data
            Analytics.
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-application">
          <h2 id="google-apprenticeship-application">Google Apprenticeship Application Process</h2>
          <div className="space-y-4">
            {GOOGLE_APPRENTICESHIP_APPLICATION_STAGES.map((stage) => (
              <section key={stage.stage} className="rounded-xl border p-4" style={cardStyle}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {stage.stage}
                </h3>
                <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {stage.body}
                </p>
              </section>
            ))}
          </div>
          <p>
            Google also runs a separate, smaller apprenticeship track through the{' '}
            <strong>Google Operations Center (GOC)</strong> in India — a distinct organization from Google itself,
            focused on customer support and operations roles. Worth checking if the four main tracks do not fit your
            profile.
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-timeline">
          <h2 id="google-apprenticeship-timeline">Google Apprenticeship Timeline</h2>
          <GoogleApprenticeshipTimelineVisual />
        </section>

        <section aria-labelledby="google-apprenticeship-last-date">
          <h2 id="google-apprenticeship-last-date">Google Apprenticeship Last Date</h2>
          <DeadlineCallout />
          <p>
            The application deadline for the current India cohort is <strong>{GOOGLE_APPRENTICESHIP_DEADLINE}</strong>.
            The program itself starts in March 2027 (some tracks mention March or June 2027), which is why you will see
            it referred to as both &ldquo;2026 applications&rdquo; and the &ldquo;2027 cohort&rdquo; depending on the
            source.
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-salary">
          <h2 id="google-apprenticeship-salary">Google Apprenticeship Salary</h2>
          <p>
            Google does not publish an official stipend figure on its listings — exact numbers are typically shared
            during the offer stage, not in the public job post, partly because pay can vary by track, location, and
            candidate.
          </p>
          <p>
            Based on multiple recruiter and past-candidate reports circulating online, monthly pay has been estimated in
            the range of roughly ₹41,600–₹66,600, sometimes with a relocation allowance — but treat this as indicative
            only, not confirmed.
          </p>
          <p>
            Beyond the stipend itself, apprentices get structured external training (Google pays for this), a nationally
            recognized completion credential, and mentorship from Google teams.
          </p>
          <p>
            <strong>Is Google Apprenticeship paid?</strong> Yes — it is a paid work-and-study program, not an unpaid
            internship.
          </p>
        </section>

        <section aria-labelledby="resume-tips">
          <h2 id="resume-tips">Resume Tips</h2>
          <p>
            Google&apos;s own listings are unusually specific about one resume requirement:{' '}
            <strong>clearly state your graduation year.</strong> Before you apply, run your resume through our{' '}
            <Link href="/tools/ats-checker" className="ie-blog-inline-link">
              ATS Resume Checker
            </Link>
            .
          </p>
          <ul>
            {GOOGLE_APPRENTICESHIP_RESUME_TIPS.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="google-apprenticeship-interview">
          <h2 id="google-apprenticeship-interview">Google Apprenticeship Interview</h2>
          <p>
            Google&apos;s process for apprenticeships generally includes resume screening, a track-relevant assessment
            (for example, an aptitude or basic technical round for Software/Data Analytics), and one or more interviews
            focused on problem-solving, communication, and role-specific basics — not deep specialist knowledge, since
            the program is explicitly designed to accept people without prior industry experience.
          </p>
          <p>
            Practice with{' '}
            <Link href="/signup" className="ie-blog-inline-link">
              AI mock interviews
            </Link>{' '}
            and the{' '}
            <Link href="/tools/question-generator" className="ie-blog-inline-link">
              AI Question Generator
            </Link>{' '}
            before your assessment and interview rounds.
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-vs-internship">
          <h2 id="google-apprenticeship-vs-internship">Google Apprenticeship vs Internship</h2>
          <p>
            Apprenticeships run longer (12–24 months vs a typical 8–12 week internship), pay a stipend/salary rather than
            a fixed internship stipend, and are explicitly designed for people who have already finished their degree —
            not for students still enrolled. Internships, by contrast, usually require current enrollment. For broader
            internship strategy, see our{' '}
            <Link href="/blog/how-to-get-internship-opportunities" className="ie-blog-inline-link">
              internship guide
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="google-apprenticeship-outside-india">
          <h2 id="google-apprenticeship-outside-india">Google Apprenticeship Outside India</h2>
          <TcsResponsiveDataTable
            caption="Google Apprenticeship programs outside India — authorization requirements"
            columns={GOOGLE_APPRENTICESHIP_OUTSIDE_INDIA_COLUMNS}
            rows={GOOGLE_APPRENTICESHIP_OUTSIDE_INDIA_ROWS}
          />
          <p>
            Unlike India&apos;s open-to-most-graduates approach, the US and European programs largely require you to
            already have local work authorization or be enrolled in that country&apos;s own apprenticeship/education
            system.
          </p>
        </section>

        <section aria-labelledby="faqs">
          <h2 id="faqs">FAQs</h2>
          <BlogEditorialFaq items={GOOGLE_APPRENTICESHIP_FAQ_ITEMS} />
        </section>

        <section aria-labelledby="related-guides" className="rounded-xl border p-5" style={cardStyle}>
          <h2 id="related-guides" className="mt-0 text-lg font-semibold">
            Continue your preparation
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {GOOGLE_APPRENTICESHIP_CONTEXTUAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="ie-blog-inline-link text-sm font-medium">
                  {link.label} →
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <footer className="border-t pt-6 text-sm leading-relaxed" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
          <p>
            <strong style={{ color: 'var(--text-secondary)' }}>Last Verified:</strong> {GOOGLE_APPRENTICESHIP_LAST_VERIFIED}
          </p>
          <p className="mt-2">
            <strong style={{ color: 'var(--text-secondary)' }}>Sources:</strong>
          </p>
          <ul className="mt-1 list-disc pl-5">
            {GOOGLE_APPRENTICESHIP_SOURCES.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
          <p className="mt-4">
            <em>
              Disclaimer: Program details, deadlines, and figures are based on publicly available job listings as of
              late July 2026 and may change. Always verify current details on Google&apos;s official careers portal
              before applying.
            </em>
          </p>
        </footer>
      </div>
    </article>
  )
}
