/**
 * Public speaking-practice PDFs.
 * Only files that exist under `public/resources/guides/` may be listed.
 * Missing owner PDFs stay out of this manifest so the site never links a 404.
 */

export type PrepPdfResource = {
  id: string
  title: string
  description: string
  category: 'speaking-practice'
  /** Public URL. Must match a real file in `public/`. */
  href: string
  filename: string
}

export const PDF_RESOURCES: readonly PrepPdfResource[] = [
  {
    id: 'practice-sheet',
    title: 'Practice sentences for reading',
    description:
      'Two pages of reading sentences. Use them to practise pace and clarity, then switch to answers that are actually yours.',
    category: 'speaking-practice',
    href: '/resources/guides/practice-sheet-watch-and-read.pdf',
    filename: 'practice-sheet-watch-and-read.pdf',
  },
  {
    id: 'college-experience',
    title: 'My college experience',
    description:
      'A sample spoken answer about college. Replace the general claims with experiences you can explain.',
    category: 'speaking-practice',
    href: '/resources/guides/topic-1-my-college-experience.pdf',
    filename: 'topic-1-my-college-experience.pdf',
  },
  {
    id: 'internship-experience',
    title: 'My internship experience',
    description:
      'A sample spoken answer about an internship. Keep only the parts that match work you actually did.',
    category: 'speaking-practice',
    href: '/resources/guides/topic-2-my-internship-experience.pdf',
    filename: 'topic-2-my-internship-experience.pdf',
  },
  {
    id: 'project-experience',
    title: 'My project experience',
    description:
      'A sample spoken answer about a student project. Name your own problem, contribution, and outcome.',
    category: 'speaking-practice',
    href: '/resources/guides/topic-3-my-project-experience.pdf',
    filename: 'topic-3-my-project-experience.pdf',
  },
  {
    id: 'views-on-ai',
    title: 'My views on artificial intelligence',
    description: 'A sample spoken view on artificial intelligence. Use the shape of the answer, then state your own view.',
    category: 'speaking-practice',
    href: '/resources/guides/topic-4-my-views-on-artificial-intelligence.pdf',
    filename: 'topic-4-my-views-on-artificial-intelligence.pdf',
  },
  {
    id: 'views-on-social-media',
    title: 'My views on social media',
    description: 'A sample spoken view on social media. Use the shape of the answer, then state your own view.',
    category: 'speaking-practice',
    href: '/resources/guides/topic-5-my-views-on-social-media.pdf',
    filename: 'topic-5-my-views-on-social-media.pdf',
  },
  {
    id: 'video-profile',
    title: 'Capgemini Exceller video profile',
    description:
      'A practice script with blanks for your name, degree, and college. Fill those blanks with your details. It is not an official Capgemini document.',
    category: 'speaking-practice',
    href: '/resources/guides/video-profile.pdf',
    filename: 'video-profile.pdf',
  },
]

export const SPEAKING_PDF_USAGE = [
  'Personalise every example so it matches work you can actually defend.',
  'Speak the answer aloud. Record yourself when that helps you hear pacing and filler.',
  'Do not memorise a sample paragraph that is not your experience.',
] as const
