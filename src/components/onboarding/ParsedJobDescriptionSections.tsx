'use client'

import type { ParsedJobDescription } from '@/types/app.types'
import type { ReactNode } from 'react'

function Section({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-(--text-secondary)">{title}</h3>
      {children}
    </section>
  )
}

export function ParsedJobDescriptionSections({ parsed }: { parsed: ParsedJobDescription }) {
  return (
    <div className="space-y-5 text-sm">
      {(parsed.role_title || parsed.company_employer || parsed.location || parsed.employment_type) && (
        <Section title="Role overview">
          <ul className="space-y-1.5 text-(--text-primary)">
            {parsed.role_title ? (
              <li>
                <span className="font-semibold">Title:</span> {parsed.role_title}
              </li>
            ) : null}
            {parsed.company_employer ? (
              <li>
                <span className="font-semibold">Company:</span> {parsed.company_employer}
              </li>
            ) : null}
            {parsed.location ? (
              <li>
                <span className="font-semibold">Location:</span> {parsed.location}
              </li>
            ) : null}
            {parsed.employment_type ? (
              <li>
                <span className="font-semibold">Type:</span> {parsed.employment_type}
              </li>
            ) : null}
          </ul>
        </Section>
      )}

      {parsed.about_role.trim() ? (
        <Section title="About the role">
          <p className="text-xs leading-relaxed text-(--text-primary)">{parsed.about_role}</p>
        </Section>
      ) : null}

      {parsed.responsibilities.length > 0 ? (
        <Section title="Responsibilities">
          <ul className="list-disc space-y-1.5 pl-4 text-(--text-primary)">
            {parsed.responsibilities.map((r, idx) => (
              <li key={`r-${idx}-${r.slice(0, 24)}`} className="text-xs leading-snug">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {parsed.requirements.length > 0 ? (
        <Section title="Requirements">
          <ul className="list-disc space-y-1.5 pl-4 text-(--text-primary)">
            {parsed.requirements.map((r, idx) => (
              <li key={`req-${idx}-${r.slice(0, 24)}`} className="text-xs leading-snug">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {parsed.must_have.length > 0 ? (
        <Section title="Must-have">
          <ul className="list-disc space-y-1.5 pl-4 text-(--text-primary)">
            {parsed.must_have.map((r, idx) => (
              <li key={`mh-${idx}-${r.slice(0, 24)}`} className="text-xs leading-snug">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {parsed.nice_to_have.length > 0 ? (
        <Section title="Nice-to-have">
          <ul className="list-disc space-y-1.5 pl-4 text-(--text-primary)">
            {parsed.nice_to_have.map((r, idx) => (
              <li key={`nth-${idx}-${r.slice(0, 24)}`} className="text-xs leading-snug">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {parsed.skills_keywords.length > 0 ? (
        <Section title="Skills & keywords">
          <div className="flex flex-wrap gap-1.5">
            {parsed.skills_keywords.map((s, idx) => (
              <span
                key={`sk-${idx}-${s.slice(0, 20)}`}
                className="rounded-full border border-(--accent-primary)/35 bg-[color-mix(in_srgb,var(--accent-primary)_8%,var(--card-bg))] px-2.5 py-1 text-[11px] font-medium text-(--text-primary)"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {parsed.education_eligibility.length > 0 ? (
        <Section title="Education & eligibility">
          <ul className="list-disc space-y-1.5 pl-4 text-(--text-primary)">
            {parsed.education_eligibility.map((r, idx) => (
              <li key={`ed-${idx}-${r.slice(0, 24)}`} className="text-xs leading-snug">
                {r}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {parsed.compensation_notes.trim() ? (
        <Section title="Compensation / benefits">
          <p className="text-xs leading-relaxed text-(--text-primary)">{parsed.compensation_notes}</p>
        </Section>
      ) : null}
    </div>
  )
}
