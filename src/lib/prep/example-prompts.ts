/**
 * Short prompts shown in the ChatGPT guide. Placeholders only — no sample resume.
 * The interactive builder is the full version.
 */

export type ExamplePrompt = {
  id: string
  title: string
  text: string
}

export const EXAMPLE_PROMPTS: readonly ExamplePrompt[] = [
  {
    id: 'role-fit',
    title: 'Find role-fit evidence',
    text: [
      'You are an interview coach. I will paste a target role, a job description, and only the resume lines I am willing to share.',
      'List skills, projects, and experience that the resume explicitly supports for this role.',
      'List requirements I cannot evidence yet.',
      'Mark every inference as an assumption.',
      'Do not invent employers, metrics, or tools.',
      'Do not write a script for me to memorise.',
      '',
      'Target role: [ROLE]',
      'Job description: [PASTE JOB DESCRIPTION]',
      'Resume lines: [PASTE ONLY WHAT YOU ARE WILLING TO SHARE]',
    ].join('\n'),
  },
  {
    id: 'critical-feedback',
    title: 'Ask for critique, not praise',
    text: [
      'Critique the answer below as an interviewer would.',
      'Score it only as weak, mixed, or strong on clarity, technical depth, structure, confidence, and relevance.',
      'Quote the vague parts.',
      'Tell me what to cut.',
      'Do not rewrite it with achievements I did not state.',
      'Do not compliment me before the critique.',
      '',
      'Question: [QUESTION]',
      'My answer: [WHAT YOU WOULD ACTUALLY SAY]',
    ].join('\n'),
  },
  {
    id: 'follow-ups',
    title: 'Practise one follow-up at a time',
    text: [
      'Ask me one interview question for [ROLE] based on the skills I list.',
      'Wait for my answer.',
      'Then ask one follow-up about ownership or a trade-off.',
      'Evaluate my answer before you show a stronger structure.',
      'Use only facts I have already told you.',
      'Tell me to say the improved version aloud, not to memorise it.',
      '',
      'Skills I can defend: [SKILLS]',
    ].join('\n'),
  },
] as const
