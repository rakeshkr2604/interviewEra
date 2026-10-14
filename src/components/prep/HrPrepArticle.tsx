import Link from 'next/link'
import { PrepGuideFrame } from '@/components/prep/PrepGuideFrame'
import { HR_ANSWER_GUIDES, HR_EXAMPLE_NOTE } from '@/lib/prep/hr-answers'

const SECTIONS = [
  { id: 'how-to-use', label: 'How to use these frameworks' },
  ...HR_ANSWER_GUIDES.map((guide) => ({ id: guide.id, label: guide.question })),
  { id: 'after-you-draft', label: 'After you draft' },
] as const

export function HrPrepArticle() {
  return (
    <PrepGuideFrame
      guideKey="hr"
      mode="hr_behavioral"
      sections={SECTIONS}
      lede={
        <p>
          HR rounds test whether you can explain real work without a script. The questions below say what the
          interviewer is listening for, which structure fits, and how to review yourself. For the STAR method itself,
          use the <Link href="/blog/what-is-star-method-with-examples">STAR guide</Link> and the{' '}
          <Link href="/tools/star-builder">STAR Answer Builder</Link>. The{' '}
          <Link href="/blog/hr-interview-answer-tips-and-tricks">HR tips article</Link> covers delivery quality. This
          page is the question-by-question practice layer, not a second copy of those guides.
        </p>
      }
    >
      <h2 id="how-to-use">How to use these frameworks</h2>
      <p>
        Read the structure, then close it and answer from your own resume. The sample in each section is labelled as
        an illustration of shape. It is a composite. Claiming it as your internship, project, or metric is a lie the
        follow-up will find. If STAR does not fit the question, the framework says so.
      </p>
      <p>{HR_EXAMPLE_NOTE}</p>

      {HR_ANSWER_GUIDES.map((guide) => (
        <section key={guide.id} aria-labelledby={guide.id}>
          <h2 id={guide.id}>{guide.question}</h2>
          <h3>What the interviewer is trying to understand</h3>
          <p>{guide.interviewerWants}</p>
          <h3>Recommended structure</h3>
          <p>{guide.framework}</p>
          <ol>
            {guide.structure.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <h3>Illustrative example</h3>
          <p>
            <strong>{HR_EXAMPLE_NOTE}</strong>
          </p>
          <blockquote
            className="border-l-2 pl-4"
            style={{ borderColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
          >
            <p>{guide.example}</p>
          </blockquote>
          <h3>Common mistakes</h3>
          <ul>
            {guide.mistakes.map((mistake) => (
              <li key={mistake}>{mistake}</li>
            ))}
          </ul>
          <h3>Self-review</h3>
          <ul>
            {guide.checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <h2 id="after-you-draft">After you can say the answers</h2>
      <p>
        Speak them. A written outline that you cannot deliver is not ready. The{' '}
        <Link href="/blog/english-confidence-interviews">spoken confidence guide</Link> and the{' '}
        <Link href="/blog/overcome-interview-anxiety-mock-interviews">interview anxiety guide</Link> cover pace and
        nerves. When the words are yours, start a focused HR mock and let the follow-up questions do the testing a
        document cannot.
      </p>
      <p>
        If you are also preparing a written resume, run it through the{' '}
        <Link href="/tools/ats-checker">ATS Resume Checker</Link> before you walk someone through it. You should be
        able to explain every line you keep.
      </p>
    </PrepGuideFrame>
  )
}
