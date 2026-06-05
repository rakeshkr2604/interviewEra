import Link from 'next/link'

const BA_COMPANY_PROCESS = [
  {
    company: 'TCS',
    title: 'TCS Business Analyst Interview Process',
    overview:
      'Tata Consultancy Services hires BAs primarily for client delivery and internal transformation projects. Campus and lateral tracks both emphasize communication clarity, domain curiosity, and whether you can translate vague business asks into structured requirements without waiting for a senior to rewrite your notes.',
    rounds: 'Online aptitude → HR screening → technical/managerial (requirements + SQL basics) → optional client round',
    difficulty: 'Easy–Medium',
    commonQuestions: [
      'Walk me through how you gathered requirements in your last project.',
      'Write user stories for an employee leave approval workflow.',
      'Explain the difference between BRD and FRD with an example.',
      'A stakeholder wants a report “by tomorrow”—how do you respond?',
    ],
    skillsEvaluated: [
      'Structured communication and BRD/user story quality',
      'Basic SQL (joins, GROUP BY, filtering)',
      'Domain understanding for banking, retail, or insurance (varies by account)',
      'Stakeholder alignment and escalation judgment',
    ],
    prepTips:
      'Prepare one end-to-end campus or internship story with artifacts (flow diagram, sample user stories). Practice 6–8 SQL queries and rehearse HR answers using the STAR format. Review TCS-specific process terms: change request, impact analysis, and sign-off checkpoints.',
  },
  {
    company: 'Infosys',
    title: 'Infosys Business Analyst Interview Process',
    overview:
      'Infosys BA hiring spans digital transformation, ERP rollouts, and analytics-led engagements. Interviewers look for process discipline—can you map as-is workflows, identify gaps, and propose a to-be state that engineering can estimate? Freshers are often tested on documentation rigor more than deep SQL.',
    rounds: 'Resume shortlist → online assessment (varies) → technical interview → HR/managerial → offer',
    difficulty: 'Easy–Medium',
    commonQuestions: [
      'Draw an as-is/to-be process for invoice reconciliation.',
      'How do you handle conflicting requirements from two business owners?',
      'What goes into a change request when scope shifts mid-sprint?',
      'Define a KPI for customer onboarding and how you would validate it.',
    ],
    skillsEvaluated: [
      'Process modelling (swimlanes, BPMN basics)',
      'Change management and impact analysis',
      'Requirement traceability and version control',
      'Analytical thinking without over-engineering solutions',
    ],
    prepTips:
      'Build a process map for a familiar workflow (college fest registration, inventory tracking). Practice explaining change requests with scope, timeline, and risk columns. Read Infosys case patterns around ERP and digital programs so your examples feel domain-aware.',
  },
  {
    company: 'Accenture',
    title: 'Accenture Business Analyst Interview Process',
    overview:
      'Accenture BA roles often mirror client-facing consulting: workshop facilitation, workshop outputs, and UAT ownership matter as much as writing specs. Expect scenario questions that simulate client calls—ambiguous priorities, tight deadlines, and the need to document decisions so offshore teams can execute.',
    rounds: 'Recruiter screen → case/requirements round → functional + behavioral → senior stakeholder or client simulation → HR',
    difficulty: 'Medium',
    commonQuestions: [
      'Facilitate a requirements workshop for a loyalty program redesign—what is your agenda?',
      'A client rejects your BRD section on reporting—how do you resolve it?',
      'Write acceptance criteria for a multi-step KYC verification flow.',
      'How do you plan UAT when the client has limited availability?',
    ],
    skillsEvaluated: [
      'Client-style communication and workshop leadership',
      'Acceptance criteria depth (happy path + exceptions)',
      'UAT planning and defect triage coordination',
      'Prioritization under competing stakeholder demands',
    ],
    prepTips:
      'Rehearse a 10-minute workshop outline: objectives, attendees, activities, outputs. Prepare a UAT checklist for a payment or onboarding feature. Practice answering “why this trade-off” with a documented decision log example—not just verbal agreement.',
  },
  {
    company: 'Cognizant',
    title: 'Cognizant Business Analyst Interview Process',
    overview:
      'Cognizant frequently blends BA work with operations and analytics—especially in BFSI, healthcare, and retail accounts. Interview loops test whether you can investigate metric anomalies, coordinate across QA and dev during delivery, and keep requirements stable when production defects surface late.',
    rounds: 'HR phone screen → technical (requirements + SQL/metrics) → managerial → optional client/domain round',
    difficulty: 'Medium',
    commonQuestions: [
      'Revenue dropped 12% last month—walk through your analysis approach.',
      'How do you triage a production defect that contradicts signed-off requirements?',
      'Segment users for a churn analysis—what dimensions would you check first?',
      'Describe coordinating a release when QA finds blocking issues two days before go-live.',
    ],
    skillsEvaluated: [
      'SQL-driven investigation and metric segmentation',
      'Cross-team coordination (dev, QA, ops)',
      'Defect root-cause thinking tied back to requirements',
      'Operational workflow awareness (retries, SLAs, audit trails)',
    ],
    prepTips:
      'Practice a “metric drop” case: hypothesis → SQL segments → recommendation. Prepare a change-management story where you updated requirements after a production incident. Emphasize collaboration artifacts—bug tickets linked to acceptance criteria gaps.',
  },
  {
    company: 'Capgemini',
    title: 'Capgemini Business Analyst Interview Process',
    overview:
      'Capgemini BA hiring emphasizes agile delivery fluency alongside classical requirement skills. Teams expect familiarity with backlog grooming, sprint ceremonies, and Jira workflows. Fresher-friendly panels often combine a lightweight case study with questions about how you would support developers during an active sprint.',
    rounds: 'Application review → online/HR screen → technical + agile scenario → managerial → offer',
    difficulty: 'Easy–Medium',
    commonQuestions: [
      'Convert a refund process flow into epics and user stories with acceptance criteria.',
      'Explain your role during sprint planning and backlog refinement.',
      'A developer says a story is unclear—what do you do in the next 30 minutes?',
      'Which non-functional requirements would you add for an admin dashboard?',
    ],
    skillsEvaluated: [
      'Agile ceremony participation and backlog quality',
      'Jira/workflow literacy (states, transitions, linking)',
      'Requirement elicitation from single-process flows',
      'Collaboration with developers during active sprints',
    ],
    prepTips:
      'Build 10–12 user stories from one end-to-end process (e.g., expense reimbursement). Review Scrum roles and definition of done. Practice explaining how you use Jira to maintain traceability from story to test case—interviewers notice delivery hygiene quickly.',
  },
] as const

export function BaCompanyProcessSection() {
  return (
    <section aria-labelledby="ba-process-by-company">
      <h2
        id="ba-process-by-company"
        className="text-xl font-bold tracking-tight sm:text-2xl"
        style={{ color: 'var(--text-primary)' }}
      >
        Business Analyst Interview Process by Company
      </h2>
      <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        Large Indian employers follow recognizable BA interview patterns, but each company weights skills differently.
        Use these company-specific overviews to predict round types and prepare the right artifacts before you walk in.
      </p>
      <div className="mt-4 space-y-3">
        {BA_COMPANY_PROCESS.map((c) => (
          <details
            key={c.company}
            className="rounded-xl border p-4"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
            }}
          >
            <summary className="ie-role-ba-company-summary cursor-pointer list-none">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  {c.title}
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {c.difficulty}
                </span>
              </div>
            </summary>
            <div className="mt-4 space-y-3">
              <section
                className="rounded-lg border p-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
                }}
              >
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  Hiring overview
                </h3>
                <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {c.overview}
                </p>
              </section>
              <div className="grid gap-3 sm:grid-cols-2">
                <section
                  className="rounded-lg border p-3"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
                  }}
                >
                  <h3 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                    Typical interview rounds
                  </h3>
                  <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {c.rounds}
                  </p>
                </section>
                <section
                  className="rounded-lg border p-3"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
                  }}
                >
                  <h3 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                    Difficulty level
                  </h3>
                  <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {c.difficulty}
                  </p>
                </section>
              </div>
              <section
                className="rounded-lg border p-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
                }}
              >
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  Common business analyst questions
                </h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {c.commonQuestions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </section>
              <section
                className="rounded-lg border p-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
                }}
              >
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  Skills frequently evaluated
                </h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {c.skillsEvaluated.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </section>
              <section
                className="rounded-lg border p-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 60%, transparent)',
                }}
              >
                <h3 className="m-0 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  Preparation tips
                </h3>
                <p className="mt-2 m-0 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {c.prepTips}
                </p>
              </section>
            </div>
          </details>
        ))}
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
        For adjacent role patterns, compare{' '}
        <Link
          href="/interview-questions/system-analyst"
          className="font-medium underline-offset-4 hover:underline"
          style={{ color: 'var(--accent-primary)' }}
        >
          System Analyst interview questions
        </Link>{' '}
        when your target role sits closer to IT systems design than pure business discovery.
      </p>
    </section>
  )
}
