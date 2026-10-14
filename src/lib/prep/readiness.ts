/**
 * In-memory interview readiness checklist. Completion is a self-check, not a hiring verdict.
 */

export const READINESS_CATEGORIES = [
  {
    id: 'resume',
    title: 'Resume readiness',
    href: '/tools/ats-checker',
    hrefLabel: 'Open the ATS Resume Checker',
    nextStep: 'Next, make sure you can explain every important resume claim out loud before you rely on it.',
    items: [
      { id: 'resume-claims', label: 'I can explain every important resume claim.' },
      { id: 'resume-project', label: 'I can explain my most relevant project and my personal contribution.' },
      { id: 'resume-tech', label: 'I can justify the technologies and decisions I mention.' },
    ],
  },
  {
    id: 'answers',
    title: 'Answer readiness',
    href: '/resources/hr-interview-answer-framework',
    hrefLabel: 'Review HR answer frameworks',
    nextStep: 'Next, prepare a short introduction and one specific example for a challenge, a mistake, and why you fit the role.',
    items: [
      { id: 'answer-intro', label: 'I have prepared a concise introduction.' },
      { id: 'answer-learning', label: 'I can explain a challenge, a mistake, and a learning experience.' },
      { id: 'answer-fit', label: 'I can answer why I fit the target role.' },
      { id: 'answer-specific', label: 'I can give specific examples rather than vague claims.' },
    ],
  },
  {
    id: 'role',
    title: 'Role readiness',
    href: '/tools/question-generator',
    hrefLabel: 'Generate role-specific questions',
    nextStep: 'Next, reread the job description, pick the technical topics that matter most, and check the company from a reliable source.',
    items: [
      { id: 'role-jd', label: 'I understand the core requirements in the job description.' },
      { id: 'role-topics', label: 'I have identified the most important technical topics to revise.' },
      { id: 'role-company', label: 'I have researched the company using reliable sources.' },
    ],
  },
  {
    id: 'delivery',
    title: 'Delivery and setup',
    href: '/how-it-works',
    hrefLabel: 'See how a spoken mock works',
    nextStep: 'Next, practise answers aloud and confirm your microphone, camera, browser, and connection.',
    items: [
      { id: 'delivery-aloud', label: 'I have practised answers aloud.' },
      { id: 'delivery-structure', label: 'I can give structured answers without memorising full scripts.' },
      { id: 'delivery-setup', label: 'My microphone, camera, browser, and internet connection work.' },
    ],
  },
] as const

export type ReadinessItemId = (typeof READINESS_CATEGORIES)[number]['items'][number]['id']

export const READINESS_ITEMS = READINESS_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({ ...item, categoryId: category.id })),
)

const ITEM_IDS = new Set<string>(READINESS_ITEMS.map((item) => item.id))

export function isReadinessItemId(value: string): value is ReadinessItemId {
  return ITEM_IDS.has(value)
}

export type ReadinessSnapshot = {
  done: number
  total: number
  percent: number
  complete: boolean
  message: string
  href: string | null
  hrefLabel: string | null
}

export function readinessSnapshot(checkedIds: ReadonlySet<string>): ReadinessSnapshot {
  const total = READINESS_ITEMS.length
  const done = READINESS_ITEMS.filter((item) => checkedIds.has(item.id)).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  if (done === total) {
    return {
      done,
      total,
      percent: 100,
      complete: true,
      message:
        'You checked every item. This is a self-assessment, not proof that you are job-ready. Review anything that still feels shaky, then start a focused mock interview and use the feedback.',
      href: null,
      hrefLabel: null,
    }
  }

  const nextItem = READINESS_ITEMS.find((item) => !checkedIds.has(item.id))
  const category = READINESS_CATEGORIES.find((entry) => entry.id === nextItem?.categoryId)
  return {
    done,
    total,
    percent,
    complete: false,
    message: category?.nextStep ?? 'Keep working through the unchecked items.',
    href: category?.href ?? null,
    hrefLabel: category?.hrefLabel ?? null,
  }
}

export function toggleReadinessId(checkedIds: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(checkedIds)
  if (!isReadinessItemId(id)) return next
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}
