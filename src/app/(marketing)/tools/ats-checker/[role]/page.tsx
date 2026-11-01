import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import {
  breadcrumbListJsonLd,
  faqPageJsonLd,
  howToJsonLd,
  webApplicationJsonLd,
} from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { schemaIds } from '@/lib/seo/metadata'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import {
  getRoleBySlug,
  allAtsRoleParams,
  roleQuestionsPath,
  skillQuestionsPath,
  getSkillBySlug,
} from '@/lib/seo/programmatic'
import {
  toolAtsRoleMetadata,
  toolAtsRoleBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import { LANDING_PAGE_CONTAINER, LANDING_SECTION } from '@/lib/landing/container'
import { buildToolAtsRoleLinks } from '@/lib/seo/internal-linking'

export function generateStaticParams() {
  return allAtsRoleParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) return {}
  return toolAtsRoleMetadata(role)
}

const ORIGIN = getCanonicalSiteOrigin()

const WEBAPP_LD = webApplicationJsonLd({
  name: 'Free ATS Resume Checker',
  description:
    'See how a typical parser reads your resume — Parseability, Field Extraction, Structure Quality, and optional JD Match with explainable fixes. Free with a registered InterviewEra account. Not a single universal ATS score.',
  url: canonicalUrl('/tools/ats-checker'),
  providerId: schemaIds.organization,
})

const FAQ_PAIRS = [
  {
    question: 'What is an ATS resume check?',
    answer:
      'An Applicant Tracking System (ATS) is software that companies use to automatically screen resumes before a human reads them. InterviewEra’s check reports four explainable dimensions — Parseability, Field Extraction, Structure Quality, and JD Match when you add a job description — and flags issues that could hurt visibility in automated screening.',
  },
  {
    question: 'Why do I need an ATS-optimised resume?',
    answer:
      'Many employers, especially large companies running campus and volume hiring, screen applications through an ATS. A resume that parsers struggle to read may be filtered before any recruiter sees it — even if you are well-qualified for the role. Improving parseability, structure, and keyword alignment increases your chances of reaching the interview stage.',
  },
  {
    question: 'What makes a resume ATS-friendly?',
    answer:
      'Resumes that parse reliably use standard section headings (Experience, Education, Skills), avoid tables and text boxes, include role-specific keywords from the job description, and are saved as a standard .docx or .pdf file. Avoid headers/footers for critical information.',
  },
  {
    question: 'Is the ATS checker free?',
    answer:
      'Yes — the InterviewEra ATS checker is free to use with a registered InterviewEra account. Upload your resume, review Parseability, Field Extraction, Structure Quality (and JD Match if you add a job description), and see actionable fixes. Sign in to analyse your resume.',
  },
]

export default async function AtsRolePage({ params }: Props) {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) notFound()

  const BREADCRUMB_LD = breadcrumbListJsonLd(toolAtsRoleBreadcrumbs(role), ORIGIN)
  const FAQ_LD = faqPageJsonLd(FAQ_PAIRS)
  const HOWTO_LD = howToJsonLd(
    `How to check how parsers read your ${role.label} resume`,
    `Upload your ${role.label} resume to review Parseability, Field Extraction, Structure Quality, and optional JD Match with specific fixes.`,
    [
      {
        name: 'Upload your resume',
        text: 'Upload your resume as a .pdf, .docx, or .txt file. Field and structure checks run for all formats; full layout checks (columns, header/footer bands) apply to PDF — Word uploads disclose that layout checks are limited.',
      },
      {
        name: 'Review the four dimensions',
        text: `You will see separate scores for Parseability, Field Extraction, and Structure Quality — plus JD Match if you paste or upload a job description. For ${role.label} roles, strengthen weak dimensions and close keyword gaps before you apply.`,
      },
      {
        name: 'Fix flagged issues',
        text: `The checker flags specific problems: missing keywords for ${role.label} roles, formatting issues like tables or text boxes, and structural problems like non-standard section headings.`,
      },
      {
        name: 'Re-check and apply',
        text: `Make the suggested fixes and re-upload your resume. When Parseability and Structure look solid and JD Match covers the role’s required skills, your ${role.label} resume is ready to submit.`,
      },
    ],
  )

  const keywordLinks = role.primarySkills
    .flatMap((skillSlug) => {
      const skill = getSkillBySlug(skillSlug)
      if (!skill) return []
      return [{ href: skillQuestionsPath(skill.slug), label: skill.shortLabel }]
    })
    .slice(0, 10)

  const linkSections = buildToolAtsRoleLinks(role)
  const atsChecklist = buildAtsChecklist(role.category, role.primarySkills.slice(0, 4))

  return (
    <>
      <JsonLdScript id="ats-role-breadcrumb-ld" data={BREADCRUMB_LD} />
      <JsonLdScript id="ats-role-webapp-ld" data={WEBAPP_LD} />
      <JsonLdScript id="ats-role-howto-ld" data={HOWTO_LD} />
      <JsonLdScript id="ats-role-faq-ld" data={FAQ_LD} />

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-b`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
            <Link href="/tools/ats-checker" className="hover:underline" style={{ color: 'var(--text-muted)' }}>
              ATS Checker
            </Link>
            <span aria-hidden className="mx-1.5">›</span>
            <span>{role.label}</span>
          </nav>

          <p
            className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
            style={{ color: 'var(--accent-primary)' }}
          >
            Free tool · explainable checks · free account
          </p>
          <h1
            className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Free ATS Resume Checker for {role.label}s
          </h1>
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            See how a typical parser reads your {role.label} resume — Parseability, Field Extraction,
            Structure Quality, and JD Match when you add a job description — with specific fixes. Free with a registered InterviewEra account.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/tools/ats-checker"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Check my {role.shortLabel} resume free
            </Link>
            <Link
              href={roleQuestionsPath(role.slug)}
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Browse {role.label} interview questions
            </Link>
          </div>
        </div>
      </section>

      {/* ── ATS checklist ────────────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            ATS checklist for {role.label} resumes
          </h2>
          <p className="mt-2 max-w-2xl text-sm" style={{ color: 'var(--text-secondary)' }}>
            Common reasons {role.label} resumes are filtered out by ATS — and how to fix each one.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {atsChecklist.map((item) => (
              <li
                key={item.issue}
                className="rounded-lg border p-4"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {item.issue}
                </p>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.fix}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Key ATS keywords ─────────────────────────────────────────────── */}
      {keywordLinks.length > 0 ? (
        <section className={LANDING_SECTION}>
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <h2
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Key ATS keywords for {role.label} resumes
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              ATS systems scan for these skills in {role.label} job descriptions. Include them naturally in your experience section.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {keywordLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-(--accent-primary)"
                  style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className={LANDING_SECTION}>
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            ATS resume checker — frequently asked questions
          </h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {FAQ_PAIRS.map((faq) => (
              <div
                key={faq.question}
                className="rounded-lg border p-4"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <dt className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {faq.question}
                </dt>
                <dd className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={`${LANDING_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2
            className="max-w-xl text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            A resume that passes ATS is just the start
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Once your {role.label} resume clears the ATS, you still need to ace the interview.
            Upload your resume and practice a scored mock {role.label} interview — free to start.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              style={{ background: 'var(--accent-primary)', color: '#fff' }}
            >
              Start free mock interview
            </Link>
            <Link
              href="/tools/ats-checker"
              className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
            >
              Check resume parseability
            </Link>
          </div>
        </div>
      </section>

      {linkSections.map((section) => (
        <SeoCrossLinksSection
          key={section.heading}
          heading={section.heading}
          links={section.links}
        />
      ))}
    </>
  )
}

// ─── ATS checklist builder ────────────────────────────────────────────────────

function buildAtsChecklist(
  category: string,
  primarySkills: readonly string[],
): Array<{ issue: string; fix: string }> {
  const skillList = primarySkills.slice(0, 3).join(', ')

  const universal: Array<{ issue: string; fix: string }> = [
    {
      issue: 'Missing role-specific keywords',
      fix: `Include exact keywords from the job description — especially technical skills like ${skillList || 'the required tools and frameworks'}. ATS systems match exact strings.`,
    },
    {
      issue: 'Non-standard section headings',
      fix: 'Use standard headings: "Work Experience" (not "Career History"), "Education" (not "Academics"), "Skills" (not "Technical Proficiencies"). ATS parsers look for these exact labels.',
    },
    {
      issue: 'Tables, text boxes, or columns',
      fix: 'ATS systems read resumes top-to-bottom and cannot parse multi-column layouts, text boxes, or tables. Use a single-column format with standard text.',
    },
    {
      issue: 'Contact details in a header/footer',
      fix: 'Many ATS systems skip headers and footers entirely. Place your name, email, phone, and LinkedIn URL in the main body of the document.',
    },
    {
      issue: 'No quantified achievements',
      fix: 'ATS systems score resumes higher when they include numbers. Add metrics: "improved API response time by 40%", "managed a team of 5", "processed 10,000 records daily".',
    },
    {
      issue: 'File format issues',
      fix: 'Submit a .pdf or standard .docx file. Avoid Google Docs exports with unusual encoding, .pages files, or scanned PDFs — these often break ATS parsing.',
    },
  ]

  if (category === 'Engineering') {
    universal.push({
      issue: 'GitHub / portfolio not linked',
      fix: 'Engineering ATS filters often look for GitHub profile URLs. Add a plain-text GitHub link in your contact section — do not embed it in a hyperlink or button.',
    })
  }

  if (category === 'Data') {
    universal.push({
      issue: 'Missing tool versions or platforms',
      fix: 'Data roles are filtered by specific tools (Python 3.x, SQL, Tableau, Power BI). Mention each tool by its full name at least once. Abbreviations alone (e.g. "PBI") may not match.',
    })
  }

  return universal.slice(0, 6)
}
