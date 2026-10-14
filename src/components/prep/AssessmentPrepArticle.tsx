import Link from 'next/link'
import { PrepGuideFrame } from '@/components/prep/PrepGuideFrame'
import { ReadinessChecklist } from '@/components/prep/ReadinessChecklist'
import { SpeakingPracticeNotes } from '@/components/prep/SpeakingPracticeNotes'
import {
  AMAZON_LP_OFFICIAL_URL,
  AMAZON_OA_OFFICIAL_URL,
} from '@/lib/seo/blog/amazon-sde-intern-2026'

const SECTIONS = [
  { id: 'instructions', label: 'Read the official instructions' },
  { id: 'categories', label: 'Common assessment categories' },
  { id: 'time', label: 'Time and priorities' },
  { id: 'setup', label: 'Device and connection checks' },
  { id: 'speak', label: 'Practise explanations aloud' },
  { id: 'review', label: 'Review what you missed' },
  { id: 'environment', label: 'A quiet, professional setup' },
  { id: 'rules', label: 'Rules and permitted tools' },
  { id: 'technical-issues', label: 'If something breaks' },
  { id: 'company-guides', label: 'Company guides' },
  { id: 'checklist', label: 'Pre-assessment checklist' },
] as const

export function AssessmentPrepArticle() {
  return (
    <PrepGuideFrame
      guideKey="assessment"
      mode="technical"
      sections={SECTIONS}
      tools={
        <section aria-labelledby="checklist">
          <h2
            id="checklist"
            className="text-xl font-bold tracking-tight sm:text-2xl"
            style={{ color: 'var(--text-primary)' }}
          >
            Final pre-assessment checklist
          </h2>
          <p className="mt-3 mb-6 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            The checklist below is the same self-check as on the resources hub. It includes setup and whether you can
            explain your resume. It does not certify that you will pass.
          </p>
          <ReadinessChecklist section="online_assessment_guide" />
        </section>
      }
      lede={
        <p>
          Online assessments and recorded video answers are not one universal hiring sequence. Aptitude, coding,
          communication, and video prompts show up in different combinations, with different time limits and different
          rules about notes, browsers, and AI tools. Your invite and the company's official careers page win over any
          generic roadmap, including this one.
        </p>
      }
    >
      <h2 id="instructions">Read the instructions that apply to your invite</h2>
      <p>
        Before you practise, read the message that scheduled the assessment. Note the duration, the number of
        sections, whether the camera must stay on, whether you may leave a tab, and what happens if the connection
        drops. Those rules change between employers and between drives at the same employer.
      </p>
      <p>
        For Amazon university software roles, Amazon publishes its own online assessment description and Leadership
        Principles. Use those pages, then our{' '}
        <Link href="/blog/amazon-sde-intern-interview-experience-2026">Amazon SDE intern experience</Link> and{' '}
        <Link href="/interview-questions/companies/amazon/software-engineer">Amazon software engineer guide</Link> as
        context, not as a substitute for the invite.
      </p>
      <ul>
        <li>
          <a href={AMAZON_OA_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">
            Amazon's university SDE online assessment page
          </a>
        </li>
        <li>
          <a href={AMAZON_LP_OFFICIAL_URL} rel="noopener noreferrer" target="_blank">
            Amazon Leadership Principles
          </a>
        </li>
      </ul>

      <h2 id="categories">Categories you may see</h2>
      <p>A drive might include some of these. It might skip others. Do not study all four as if every company uses them.</p>
      <ul>
        <li>
          <strong>Aptitude.</strong> Numerical, logical, or verbal items under a clock. Accuracy with a cutoff matters
          more than solving the hardest puzzle last.
        </li>
        <li>
          <strong>Coding.</strong> One or more problems in a browser editor. The language, the IDE, and whether you
          can run code vary. Practise in conditions closer to a plain editor than to your usual setup.
        </li>
        <li>
          <strong>Communication.</strong> A written response or a short spoken answer. Structure and a real example
          matter more than decorative vocabulary. The{' '}
          <Link href="/resources/hr-interview-answer-framework">HR framework</Link> is the place to prepare the
          content.
        </li>
        <li>
          <strong>Recorded video.</strong> You see a prompt, get a short pause, and record. You often cannot redo it.
          Practise the first twenty seconds, because that is what a nervous take wastes.
        </li>
      </ul>

      <h2 id="time">Time management</h2>
      <p>
        Read the section weights if the invite shows them. Start with questions you can finish. Mark a long item and
        return if the tool allows it. Guessing rules differ: some tests penalise wrong answers, some do not. Follow
        the rule on the screen, not a habit from another exam.
      </p>
      <p>
        For coding, write a correct simple solution you can explain before you chase an optimal one you cannot finish.
        Leave time to read the failing case.
      </p>

      <h2 id="setup">Browser, device, microphone, webcam, power, and internet</h2>
      <ul>
        <li>Use the browser the invite names. Update it the day before, not during the test.</li>
        <li>Plug in the laptop. A full battery is not a plan.</li>
        <li>Test the microphone and camera in the same browser. Close other apps that hold the camera.</li>
        <li>Prefer a wired connection or sit next to the router. Run the vendor's system check if one is offered.</li>
        <li>Disable extensions that inject scripts or change the page, unless the instructions say they are allowed.</li>
      </ul>

      <h2 id="speak">Practise explanations aloud</h2>
      <p>
        Video and communication sections grade what you say, not the outline in your notes. Speak one project and one
        failure the way the <Link href="/resources/hr-interview-answer-framework">HR frameworks</Link> describe. The{' '}
        <Link href="/blog/english-confidence-interviews">spoken confidence guide</Link> is about being understood.
      </p>
      <SpeakingPracticeNotes />

      <h2 id="review">Review incorrect answers</h2>
      <p>
        After a practice set, write why the wrong choice was attractive and what you will check next time. Re-solving
        the same problem while looking at the solution is not review. For coding, re-implement the approach from a
        blank editor the next day.
      </p>

      <h2 id="environment">A quiet and professional environment</h2>
      <p>
        For a recorded answer, face a light source, sit at the distance the preview shows, and use a background that
        is not a distraction. Tell the people around you the start and end time. Headphones help you hear instructions.
        They do not hide a noisy room from a microphone.
      </p>

      <h2 id="rules">Follow the rules of that assessment</h2>
      <p>
        Permitted tools are part of the test. Some coding rounds allow public documentation. Some forbid other people,
        phones, and AI assistants. Some record the screen. If you are unsure, do not use the tool. A disqualification
        is worse than a slower solution. Do not paste a live assessment into ChatGPT or into InterviewEra.
      </p>

      <h2 id="technical-issues">If a technical problem happens</h2>
      <ol>
        <li>Read the on-screen support note before you refresh. Refreshing can submit or void an attempt.</li>
        <li>Photograph or copy the error text and the time.</li>
        <li>Use the help channel named in the invite: proctor chat, support mail, or campus coordinator.</li>
        <li>Reconnect power and the network. Rejoin only the way the instructions describe.</li>
        <li>Afterward, write what failed and what you already did, while you remember it.</li>
      </ol>
      <p>
        InterviewEra cannot restore an employer's assessment attempt. A mock interview is a separate practice session.
      </p>

      <h2 id="company-guides">Use company guides as context</h2>
      <p>
        These InterviewEra guides collect patterns candidates search for. Hiring stages, eligibility, duration, and
        deadlines still come from the employer.
      </p>
      <ul>
        <li>
          <Link href="/interview-questions/companies/amazon/software-engineer">Amazon software engineer guide</Link>
        </li>
        <li>
          <Link href="/interview-questions/companies/microsoft/software-engineer">Microsoft software engineer guide</Link>
        </li>
        <li>
          <Link href="/interview-questions/tcs">TCS interview guide</Link>
        </li>
        <li>
          <Link href="/interview-questions/companies/infosys/software-engineer">Infosys software engineer guide</Link>
        </li>
        <li>
          <Link href="/interview-questions/companies/wipro">Wipro interview guide</Link>
        </li>
        <li>
          <Link href="/blog/top-dsa-interview-questions">DSA topic map</Link> for coding practice themes
        </li>
      </ul>

    </PrepGuideFrame>
  )
}
