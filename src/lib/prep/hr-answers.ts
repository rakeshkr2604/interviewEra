/**
 * Original HR frameworks. Examples illustrate structure. They are not scripts to claim.
 * Existing STAR and HR-tips articles stay the method references; this page is the question-by-question practice layer.
 */

export type HrAnswerGuide = {
  id: string
  question: string
  interviewerWants: string
  framework: string
  structure: readonly string[]
  example: string
  mistakes: readonly string[]
  checklist: readonly string[]
}

export const HR_EXAMPLE_NOTE =
  'Illustrative example of structure. It is a composite, not your experience. Do not memorise it or present it as something you did.'

export const HR_ANSWER_GUIDES: readonly HrAnswerGuide[] = [
  {
    id: 'tell-me-about-yourself',
    question: 'Tell me about yourself',
    interviewerWants:
      'A short, relevant map of who you are for this role: current stage, the proof you will talk about later, and why you are in this conversation. They are not asking for your biography.',
    framework: 'Present, proof, fit. STAR is a poor fit for an introduction because there is no single episode.',
    structure: [
      'Present: your current stage in one sentence (student, intern, fresher, or the work you do now).',
      'Proof: one or two facts you can defend — a project, internship, or skill the role actually needs.',
      'Fit: why this role is the next step, without a slogan.',
      'Stop before one minute unless they ask you to continue.',
    ],
    example:
      'I am a final-year computer science student. For my major project I built a small inventory API in Java and PostgreSQL, and I owned the query layer that cut a slow report from about eight seconds to under two on our test data. I am applying for this backend internship because the description centres on APIs and relational data, which is the work I can already discuss in detail.',
    mistakes: [
      'Starting from childhood, school, or a hobby that never connects to the role.',
      'Listing every skill on the resume with no example.',
      'Reciting a polished paragraph you cannot unpack when they ask "what did you do?"',
    ],
    checklist: [
      'The first sentence says what you are now.',
      'Every claim is something you can explain for two more minutes.',
      'You can say it without reading.',
    ],
  },
  {
    id: 'walk-through-resume',
    question: 'Walk me through your resume',
    interviewerWants:
      'Whether the document is a sequence you understand. They listen for ownership, gaps, and whether the most relevant work shows up early.',
    framework: 'Chronological spine. Choose relevance over completeness. STAR comes later, when they pick one line and probe it.',
    structure: [
      'Name the order you will use (most recent, or the line most relevant to this role) so they can follow.',
      'For each entry: context, your role, one concrete outcome.',
      'Skip lines that do not help this role unless they ask.',
      'Invite a follow-up: "I can go deeper on the project if that is useful."',
    ],
    example:
      'I will start with the internship, then the academic project. At the internship I was on a three-person team maintaining an internal dashboard. I fixed the filter bug that dropped rows when a date was empty, and I added a regression test for that case. The academic project was a library seat tracker; I designed the booking schema and wrote the conflict checks. Happy to go deeper on either.',
    mistakes: [
      'Reading the resume aloud, including every tool logo.',
      'Saying "we" for work you did not do, or "I" for the whole team.',
      'Hiding a gap or a short stint. A plain explanation is stronger than a story you invent.',
    ],
    checklist: [
      'You can point to the line you are discussing.',
      'Titles, dates, and tools match the document.',
      'You left room for them to interrupt.',
    ],
  },
  {
    id: 'why-hire-you',
    question: 'Why should we hire you?',
    interviewerWants:
      'Evidence that you can do the work in the description, not a claim that you are passionate or a fast learner in the abstract.',
    framework: 'Requirement, evidence, limit. Name what you are not claiming.',
    structure: [
      'Pick two requirements from the job description.',
      'Attach one verified example to each.',
      'State a real limit and how you would close it in the role.',
    ],
    example:
      'The posting asks for REST APIs and basic SQL. I can show both from the inventory project: I designed three endpoints and wrote the queries behind the slow report. I have not run this in production traffic. If you hired me, I would want a first task where someone reviews my API contracts before I change a shared service.',
    mistakes: [
      '"I am hardworking and passionate" with no example.',
      'Promising you are the best candidate.',
      'Repeating the company slogan back to them.',
    ],
    checklist: [
      'Each sentence maps to a requirement you actually saw.',
      'You did not invent a metric.',
      'A sceptical interviewer could ask "show me" and you could.',
    ],
  },
  {
    id: 'why-company',
    question: 'Why this company and this role?',
    interviewerWants:
      'Whether you know what this team does and why that matches your evidence. Generic admiration reads as a mass application.',
    framework: 'Observed fact, personal link, role match. Use a source you could cite. Do not guess unstated strategy.',
    structure: [
      'One specific fact from the company careers page, product, or a recent primary source.',
      'Why that fact connects to work you have done.',
      'Why this role, not just this brand.',
    ],
    example:
      'Your careers page for this team describes ownership of an internal billing API used by several products. I have only built a campus-scale API, but the part I liked was being the person who explained the contract to teammates. This role looks like that work at a higher reliability bar, which is what I want to learn next. I would not claim I already know your billing domain.',
    mistakes: [
      '"You are a top MNC and I want a brand name."',
      'Facts you cannot remember the source of, or details a chatbot invented about the company.',
      'The same paragraph for every employer with the name swapped.',
    ],
    checklist: [
      'You can say where you read the fact.',
      'The reason would be false if you changed the company name.',
      'You separated interest from experience you do not have.',
    ],
  },
  {
    id: 'strengths-weaknesses',
    question: 'What are your strengths and weaknesses?',
    interviewerWants:
      'Self-awareness with evidence. A strength they can use, and a weakness that is real, narrow, and already being worked on.',
    framework: 'Strength with proof. Weakness with a current repair. Do not disguise a virtue as a weakness.',
    structure: [
      'One strength, one example, one place it helps this role.',
      'One real weakness that has a cost.',
      'What you do now when that weakness shows up.',
    ],
    example:
      'A strength is writing the failing case down before I change code. On the dashboard bug I reproduced the empty date first, then patched it. That helps on a team that reviews carefully. A weakness is that I over-explain in the first answer and bury the result. I now start with the outcome sentence, then the story, and I ask a friend to stop me at one minute.',
    mistakes: [
      '"I work too hard" or "I am a perfectionist" with no cost.',
      'A weakness that is a core requirement of the job, stated as if it were charming.',
      'A strength you cannot illustrate.',
    ],
    checklist: [
      'The weakness is specific enough to be awkward.',
      'The repair is something you already do, not a promise.',
      'You did not spend the whole answer apologising.',
    ],
  },
  {
    id: 'failure',
    question: 'Explain a failure or mistake',
    interviewerWants:
      'Whether you can own a real miss, say what you changed, and stay calm. They are not collecting humiliation.',
    framework: 'STAR. The Result must include what changed afterwards, not only the damage.',
    structure: [
      'Situation: where you were, in one or two sentences.',
      'Task: what you were responsible for.',
      'Action: the mistake, in the first person, then what you did once you saw it.',
      'Result: the outcome and the practice you kept.',
    ],
    example:
      'In a lab demo I shipped a feature flag defaulted to on, and the demo crashed in front of the class because a null config was not handled. I was the person who merged it. I reverted, added a test for the missing config, and changed our checklist so a demo build uses the same defaults as the test. The demo still failed that day. The next release did not repeat that crash.',
    mistakes: [
      'A fake failure that is secretly a success ("I cared too much").',
      'Blaming the team, the grader, or the tools and stopping there.',
      'A story so old or so vague you cannot answer "what exactly broke?"',
    ],
    checklist: [
      'You say what you got wrong.',
      'The result includes a change in behaviour.',
      'You can answer two follow-ups without adding new heroics.',
    ],
  },
  {
    id: 'conflict',
    question: 'Describe a conflict or teamwork challenge',
    interviewerWants:
      'How you disagree when the work is shared. They listen for respect, a concrete disagreement, and whether the team could keep shipping.',
    framework: 'STAR, with the other person kept professional. Do not diagnose their personality.',
    structure: [
      'Situation: the shared goal and the disagreement, not a villain.',
      'Task: your part.',
      'Action: what you said or proposed, and what you heard.',
      'Result: what the team did, including a compromise if that is the truth.',
    ],
    example:
      'Two of us wanted different ways to store booking conflicts in a course project. I wanted a database constraint. My teammate wanted the check only in the UI because it was faster to demo. I wrote a one-page note with one failing case the UI check missed, and we paired for an hour on the constraint. We kept a small UI message too, because the demo still needed it. The disagreement was about the design, and we could both explain the final choice.',
    mistakes: [
      'A story whose point is that everyone else was difficult.',
      'Claiming you "resolved the conflict" with no specific action.',
      'Sharing private details that identify a classmate or colleague unkindly.',
    ],
    checklist: [
      'The other person would recognise the story as fair.',
      'You describe your action, not only your feelings.',
      'The result is about the work.',
    ],
  },
  {
    id: 'what-you-learned',
    question: 'What did you learn from your project or internship?',
    interviewerWants:
      'A change in how you work, tied to something that actually happened. "I learned a lot" is not an answer.',
    framework: 'Before, event, after. Use STAR if the learning came from one incident.',
    structure: [
      'Name the project or internship in one line.',
      'Describe the moment that taught you something.',
      'State the practice you use now because of it.',
      'Keep the lesson smaller than a life philosophy.',
    ],
    example:
      'On the internship dashboard I learned that a bug report without the input data wastes a day. I used to say "the filter is broken." After we lost an afternoon, I started attaching the request and the row that disappeared. I still do that in code review notes, even on college work.',
    mistakes: [
      'Listing technologies you were "exposed to."',
      'A lesson copied from a blog that your story does not support.',
      'Claiming leadership you did not have.',
    ],
    checklist: [
      'The lesson would be different for a different project.',
      'You can show the before and after.',
      'You are not asking them to be impressed by the tech list.',
    ],
  },
  {
    id: 'five-years',
    question: 'Where do you see yourself in five years?',
    interviewerWants:
      'Direction and realism. They are not scoring a fantasy job title, and they know plans change.',
    framework: 'Skill direction, not a scripted ladder. Do not invent a management path to sound ambitious.',
    structure: [
      'The kind of work you want to be trusted with.',
      'The skill you would need that you do not have yet.',
      'Why this role is a credible first step.',
      'Leave room for the company\'s actual ladder, which you may not know.',
    ],
    example:
      'In five years I want to be someone a team asks to design a small service and explain the trade-offs, not only to implement a ticket. I still need production experience with failure and review. This role is a place to learn that with supervision. I am not claiming I will be a manager, because I have not done that work.',
    mistakes: [
      '"I want to be CEO" or a title you found in a sample answer.',
      'A plan that obviously leaves this role in three months, stated as flattery.',
      'Pretending you have a detailed career contract with yourself.',
    ],
    checklist: [
      'The answer still makes sense if the company is not famous.',
      'You named a skill gap.',
      'You did not lock them into promoting you.',
    ],
  },
  {
    id: 'questions-for-us',
    question: 'Do you have any questions for us?',
    interviewerWants:
      'Whether you thought about the work. Silence, or only "what is the salary?", can sound unprepared. Compensation questions are legitimate later; they are a weak only question in a first screen.',
    framework: 'Work, expectations, and how you would be evaluated. Not a quiz of the interviewer.',
    structure: [
      'Prepare three questions. Ask one or two.',
      'Prefer questions you could not answer from the public posting.',
      'Listen to the answer. A follow-up is better than a list.',
    ],
    example:
      'What would a strong intern or fresher have shipped by the end of the first two months? How does this team review code before it reaches a shared service? Which part of the posting is the work I would actually spend most days on?',
    mistakes: [
      '"No, you covered everything" when you prepared nothing.',
      'Questions whose answers are on the first screen of the job post.',
      'Trick questions meant to impress.',
    ],
    checklist: [
      'You can ask without reading a script.',
      'At least one question is about the work, not the brand.',
      'You will drop a question they already answered.',
    ],
  },
] as const
