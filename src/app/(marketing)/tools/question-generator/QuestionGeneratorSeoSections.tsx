import Link from 'next/link';
import { Plus } from 'lucide-react';
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { LANDING_PAGE_CONTAINER, LANDING_SECTION } from '@/lib/landing/container';
import type { SeoTextLink } from '@/lib/seo/internal-links';
import { toolVariantRolePath } from '@/lib/seo/programmatic';

const HOWTO_STEPS = [
  {
    name: 'Pick your role',
    text: 'Enter a job title or choose from popular roles like Software Engineer, Android Developer, or Frontend Developer.',
  },
  {
    name: 'Set experience & domain',
    text: 'Add fresher or experienced level and a domain like backend, mobile, or data — optional, but sharpens the output.',
  },
  {
    name: 'Generate 10 questions',
    text: 'Click generate to get a fresh mix of technical, behavioral, and situational interview questions in under 10 seconds.',
  },
  {
    name: 'Practise aloud',
    text: 'Answer each question out loud. Use STAR for behavioral prompts and think through trade-offs for technical ones.',
  },
] as const;

export const QGEN_FAQ_ITEMS = [
  {
    question: 'What is a free interview question generator?',
    answer:
      'An interview question generator creates practice questions tailored to a job role, experience level, and domain. InterviewEra’s free tool produces 10 questions per run — technical, behavioral, and situational — free with a registered InterviewEra account.',
  },
  {
    question: 'Can I generate random interview questions?',
    answer:
      'Yes. Each run produces a fresh set of questions. Pick a role and experience level for targeted output, or use the generator whenever you want a random batch of realistic interview prompts to practise.',
  },
  {
    question: 'Is this interview questions generator free?',
    answer:
      'Yes — free with a registered InterviewEra account. No credit card and no usage cap on the question generator. Generate as many sets as you need before campus placements or experienced-hire interviews.',
  },
  {
    question: 'How many questions does the generator create?',
    answer:
      'Ten questions per generation — a mix of technical, HR/behavioral, and situational prompts calibrated to your role and seniority. Run it again anytime for a new set.',
  },
  {
    question: 'What roles does the interview question generator support?',
    answer:
      'Software Engineer, Frontend Developer, Android Developer, Full Stack Developer, Java Developer, Data Analyst, Product Manager, and dozens more — including company-specific variants for TCS, Infosys, Google, and Amazon.',
  },
] as const;

const POPULAR_ROLE_LINKS: readonly SeoTextLink[] = [
  { href: toolVariantRolePath('software-engineer'), label: 'Software Engineer generator' },
  { href: toolVariantRolePath('android-developer'), label: 'Android Developer generator' },
  { href: toolVariantRolePath('frontend-developer'), label: 'Frontend Developer generator' },
  { href: toolVariantRolePath('full-stack-developer'), label: 'Full Stack Developer generator' },
  { href: toolVariantRolePath('java-developer'), label: 'Java Developer generator' },
  { href: '/interview-questions/android-developer', label: 'Android interview questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer questions' },
  { href: '/tools/ats-checker', label: 'ATS resume checker' },
  { href: '/tools/star-builder', label: 'STAR answer builder' },
] as const;

export function QuestionGeneratorSeoSections() {
  return (
    <>
      <section
        className={`${LANDING_SECTION} border-t`}
        style={{ borderColor: 'var(--card-border)' }}
      >
        <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            How the interview question generator works
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Use this free interview questions generator before campus drives, product-company OAs, or experienced-hire
            loops — get role-specific prompts in seconds, then practise your answers aloud.
          </p>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOWTO_STEPS.map((step, i) => (
              <li
                key={step.name}
                className="flex flex-col gap-2 rounded-xl border p-5"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: 'var(--accent-primary)', color: '#fff' }}
                >
                  {i + 1}
                </span>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {step.name}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <SeoCrossLinksSection
        heading="Popular roles & related tools"
        links={POPULAR_ROLE_LINKS}
        footer={
          <>
            Need company-specific sets? Try{' '}
            <Link href="/tools/question-generator/companies/tcs" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
              TCS
            </Link>
            ,{' '}
            <Link href="/tools/question-generator/companies/infosys" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Infosys
            </Link>
            , or{' '}
            <Link href="/tools/question-generator/companies/amazon" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
              Amazon
            </Link>{' '}
            interview question generators.
          </>
        }
      />

      <section className={`${LANDING_SECTION} border-t`} style={{ borderColor: 'var(--card-border)' }}>
        <div className={`${LANDING_PAGE_CONTAINER} mx-auto max-w-3xl px-4 sm:px-5`}>
          <div className="text-center">
            <span
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: 'var(--accent-hover)' }}
            >
              FAQ
            </span>
            <h2
              className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Interview question generator FAQ
            </h2>
          </div>

          <div className="mt-8 space-y-3">
            {QGEN_FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border-2 px-5 py-4"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 75%, transparent)',
                }}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                  {item.question}
                  <Plus
                    className="size-4 shrink-0 transition-transform group-open:rotate-45"
                    style={{ color: 'var(--accent-primary)' }}
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
