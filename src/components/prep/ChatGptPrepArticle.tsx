import Link from 'next/link'
import { CopyStaticPrompt } from '@/components/prep/CopyStaticPrompt'
import { PrepGuideFrame } from '@/components/prep/PrepGuideFrame'
import { PromptBuilder } from '@/components/prep/PromptBuilder'
import { EXAMPLE_PROMPTS } from '@/lib/prep/example-prompts'

const SECTIONS = [
  { id: 'before-you-prompt', label: 'Prepare the materials' },
  { id: 'role-fit', label: 'Find real role-fit evidence' },
  { id: 'hr-and-projects', label: 'HR answers and project explanations' },
  { id: 'critique', label: 'Ask for critique' },
  { id: 'follow-ups', label: 'Practise follow-up questions' },
  { id: 'your-experience', label: 'Turn suggestions into your answers' },
  { id: 'verify', label: 'Verify technical and company claims' },
  { id: 'privacy', label: 'Resume privacy' },
  { id: 'daily-plan', label: 'A realistic daily workflow' },
  { id: 'builder', label: 'Prompt builder' },
] as const

export function ChatGptPrepArticle() {
  const roleFit = EXAMPLE_PROMPTS.find((prompt) => prompt.id === 'role-fit')
  const critique = EXAMPLE_PROMPTS.find((prompt) => prompt.id === 'critical-feedback')
  const followUps = EXAMPLE_PROMPTS.find((prompt) => prompt.id === 'follow-ups')

  return (
    <PrepGuideFrame
      guideKey="chatgpt"
      mode="mixed"
      sections={SECTIONS}
      tools={
        <section aria-labelledby="builder">
          <h2 id="builder" className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
            Build the prompt
          </h2>
          <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Required field: target role. Company, skills, job description, and resume text are optional. Generate,
            edit, then copy. Reset clears the form in this tab. It does not create an interview or use a credit.
          </p>
          <div className="mt-6">
            <PromptBuilder />
          </div>
        </section>
      }
      lede={
        <p>
          ChatGPT can help you organise a role, find gaps, and rehearse structure. It cannot hear whether you sound
          clear, and it will invent details if you let it. Use it to prepare. Use an{' '}
          <Link href="/how-it-works">InterviewEra mock interview</Link> when you need to speak, take a follow-up, and
          get a score.
        </p>
      }
    >
      <h2 id="before-you-prompt">Prepare a resume and a job description before you prompt</h2>
      <p>
        A useful session starts with two documents you already have: the role you want, and the lines on your resume
        you are willing to defend. Paste the job description, or the parts of it that describe the work. You do not
        need your entire resume. A project section and the skills you can explain are enough to begin.
      </p>
      <p>
        Remove account numbers, addresses, phone numbers, and government IDs before you paste anything into a third-party
        chat. If a line is not true, do not include it so the model can "improve" it.
      </p>

      <h2 id="role-fit">Identify evidence that actually fits the role</h2>
      <p>
        Ask for a comparison, not a new biography. The model should list skills, projects, and experience the resume
        states, then list requirements you cannot evidence yet. Assumptions need a label. Missing evidence is a study
        list, not a paragraph to memorise.
      </p>
      {roleFit ? (
        <figure className="ie-blog-card p-4 sm:p-5">
          <figcaption className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {roleFit.title}
          </figcaption>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm">
            {roleFit.text}
          </pre>
          <CopyStaticPrompt text={roleFit.text} label="Copy this example" />
        </figure>
      ) : null}
      <p>
        The interactive builder further down writes a longer version of this instruction from your own fields, still
        on this device.
      </p>

      <h2 id="hr-and-projects">Practise HR questions and project explanations</h2>
      <p>
        For HR questions, point the model at a framework and at your facts. Behavioural questions can use STAR.
        "Tell me about yourself" should not. The{' '}
        <Link href="/resources/hr-interview-answer-framework">HR answer framework</Link> shows which structure fits
        which question, and the <Link href="/blog/what-is-star-method-with-examples">STAR method guide</Link> is the
        longer reference for experience stories. The{' '}
        <Link href="/tools/star-builder">STAR Answer Builder</Link> is there when you want to draft one story field by
        field.
      </p>
      <p>
        For a project, require this sequence: problem, architecture, what you personally did, decisions, challenges,
        how you tested, and the outcome. If the outcome has no number, say that. Do not accept a metric the model
        adds.
      </p>

      <h2 id="critique">Request criticism instead of praise</h2>
      <p>
        Models default to encouragement. That feels useful and hides weak answers. Ask it to quote the vague lines,
        say what to cut, and refuse to add achievements you did not state. Score the answer on the same dimensions
        InterviewEra uses in a mock: communication clarity, technical depth, answer structure, confidence, and
        relevance.
      </p>
      {critique ? (
        <figure className="ie-blog-card p-4 sm:p-5">
          <figcaption className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {critique.title}
          </figcaption>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm">
            {critique.text}
          </pre>
          <CopyStaticPrompt text={critique.text} label="Copy this example" />
        </figure>
      ) : null}

      <h2 id="follow-ups">Practise adaptive follow-up questions</h2>
      <p>
        A real interviewer does not stop at your first paragraph. Ask for one question, answer it in your own words,
        then take one follow-up about why you chose that approach or what you owned. The model should judge your
        answer before it shows a cleaner structure. If it dumps five model answers at once, tell it to stop and wait.
      </p>
      {followUps ? (
        <figure className="ie-blog-card p-4 sm:p-5">
          <figcaption className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {followUps.title}
          </figcaption>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed sm:text-sm">
            {followUps.text}
          </pre>
          <CopyStaticPrompt text={followUps.text} label="Copy this example" />
        </figure>
      ) : null}
      <p>
        When you want questions without a chat transcript, use the{' '}
        <Link href="/tools/question-generator">Interview Question Generator</Link> or browse the{' '}
        <Link href="/interview-questions">interview question hub</Link>.
      </p>

      <h2 id="your-experience">Convert suggestions into answers you can defend</h2>
      <p>
        Keep a line only if you can explain it for another minute. If the suggestion adds a tool, a metric, or a
        teammate's work, delete it. Say the answer aloud. If you stumble, the sentence is too long or the fact is not
        yours. The <Link href="/blog/english-confidence-interviews">spoken confidence guide</Link> is about clarity
        and pace, not about sounding like someone else.
      </p>
      <p>
        Do not memorise the generated paragraph. Interviewers notice a script when the follow-up leaves the script.
        Keep a few anchor facts and a structure, then talk.
      </p>

      <h2 id="verify">Verify technical claims and company information</h2>
      <p>
        Check APIs, complexity claims, and framework behaviour against official documentation when the answer depends
        on them. Check company facts against that company's careers page or another primary source you can name.
        InterviewEra's company guides, including{' '}
        <Link href="/interview-questions/companies/amazon/software-engineer">Amazon</Link>,{' '}
        <Link href="/interview-questions/companies/microsoft/software-engineer">Microsoft</Link>,{' '}
        <Link href="/interview-questions/tcs">TCS</Link>,{' '}
        <Link href="/interview-questions/companies/infosys/software-engineer">Infosys</Link>, and{' '}
        <Link href="/interview-questions/companies/wipro">Wipro</Link>, describe patterns. They are not a promise that
        your invite will use the same rounds.
      </p>

      <h2 id="privacy">Keep personal information out of the chat</h2>
      <p>
        The prompt builder on this page does not upload the form to InterviewEra. ChatGPT is still a separate product.
        Paste only what you would be comfortable repeating. Skip full addresses, identification numbers, and other
        people's private details. Leave the resume field empty if you only want a role-level plan.
      </p>

      <h2 id="daily-plan">A realistic day of preparation</h2>
      <ol>
        <li>Read the job description and mark three requirements you can evidence.</li>
        <li>Run one prompt for gaps. Write the gaps down. Do not "solve" them by editing your resume in the chat.</li>
        <li>Speak one HR answer and one project explanation. Record the project answer if you want to hear the pace.</li>
        <li>Take one follow-up you did not expect. Note the fact you could not support.</li>
        <li>
          If the spoken version is the weak part, start a focused mock. Reading another generated answer will not fix
          delivery.
        </li>
      </ol>
      <p>
        The <Link href="/blog/how-to-prepare-for-placement-interviews">placement preparation guide</Link> is the longer
        campus roadmap. This page is the ChatGPT slice of that work.
      </p>

    </PrepGuideFrame>
  )
}
