export const GOOGLE_APPRENTICESHIP_CANONICAL_PATH = '/google-apprenticeship'

export const GOOGLE_APPRENTICESHIP_META_TITLE =
  'Google Apprenticeship 2026: Eligibility, Salary, Last Date & India Guide'

export const GOOGLE_APPRENTICESHIP_DESCRIPTION =
  'Google Apprenticeship applications are open in India — eligibility, salary, last date (Aug 3, 2026), and application process for Software Development, Data Analytics, Digital Marketing & Project Management tracks.'

export const GOOGLE_APPRENTICESHIP_PUBLISHED_DATE = '2026-07-28'
export const GOOGLE_APPRENTICESHIP_LAST_UPDATED = '2026-07-28'
export const GOOGLE_APPRENTICESHIP_READING_TIME = '18 min read'
export const GOOGLE_APPRENTICESHIP_AUTHOR_NAME = 'InterviewEra Team'
export const GOOGLE_APPRENTICESHIP_REVIEWER_NAME = 'InterviewEra Editorial'
export const GOOGLE_APPRENTICESHIP_LAST_VERIFIED = '28 July 2026'

export const GOOGLE_APPRENTICESHIP_HERO_ALT =
  'Google Apprenticeship 2026 India guide — applications open, August 3 2026 deadline, four tracks, Bengaluru Gurgaon Hyderabad Mumbai'

export const GOOGLE_APPRENTICESHIP_DEADLINE = 'August 3, 2026'
export const GOOGLE_APPRENTICESHIP_DEADLINE_ISO = '2026-08-03'

export const GOOGLE_APPRENTICESHIP_QUICK_FACTS = [
  ['Status', 'Applications open'],
  ['Last date to apply', 'August 3, 2026'],
  ['Program start', 'March 2027 (some tracks: March or June 2027)'],
  ['Duration', '12 months (Software) or 24 months (Data Analytics, Marketing, Project Management)'],
  ['Salary/stipend', 'Paid; exact figure not officially disclosed (unofficial estimates: ₹41,600–₹66,600/month)'],
  ['Locations', 'Bengaluru, Gurgaon, Hyderabad, Mumbai'],
  ['Eligibility', 'Graduate (not currently enrolled), under 1 year of relevant experience'],
  ['Tracks', 'Software Application Development, Data Analytics, Digital Business Marketing, Project Management'],
] as const

export const GOOGLE_APPRENTICESHIP_TOC = [
  { id: 'what-is-google-apprenticeship', label: 'What Is the Program?' },
  { id: 'latest-updates', label: 'Latest Updates' },
  { id: 'google-apprenticeship-tracks', label: 'India Tracks' },
  { id: 'google-apprenticeship-locations', label: 'Locations' },
  { id: 'google-apprenticeship-eligibility', label: 'Eligibility' },
  { id: 'google-apprenticeship-application', label: 'Application Process' },
  { id: 'google-apprenticeship-timeline', label: 'Timeline' },
  { id: 'google-apprenticeship-last-date', label: 'Last Date' },
  { id: 'google-apprenticeship-salary', label: 'Salary' },
  { id: 'resume-tips', label: 'Resume Tips' },
  { id: 'google-apprenticeship-interview', label: 'Interview' },
  { id: 'google-apprenticeship-vs-internship', label: 'vs Internship' },
  { id: 'google-apprenticeship-outside-india', label: 'Outside India' },
  { id: 'faqs', label: 'FAQs' },
] as const

export const GOOGLE_APPRENTICESHIP_LATEST_UPDATES = [
  'Applications open now for the India cohort across all four tracks.',
  'Last date to apply: August 3, 2026.',
  'Program start: March 2027 (June 2027 for some tracks).',
  'No new tracks announced this cycle — Software, Data Analytics, Digital Business Marketing, and Project Management remain.',
  'Locations unchanged: Bengaluru, Gurgaon, Hyderabad, Mumbai.',
] as const

export const GOOGLE_APPRENTICESHIP_TRACKS_COLUMNS = ['Track', 'Duration', 'Eligibility highlight', 'Best for'] as const

export const GOOGLE_APPRENTICESHIP_TRACKS_ROWS = [
  [
    'Software Application Development',
    '12 months',
    'Engineering degree, under 1 year of dev experience, at least one programming language',
    'Engineering grads wanting a coding-adjacent entry point',
  ],
  [
    'Data Analytics',
    '24 months',
    "Bachelor's in any field, interest in SQL/data",
    'Non-CS grads and career switchers — most accessible track on paper',
  ],
  [
    'Digital Business Marketing',
    '24 months',
    'Marketing/business background preferred',
    'Grads aiming for marketing or growth roles',
  ],
  [
    'Project Management',
    '24 months',
    'Any background, strong communication skills',
    'Grads who want a structured, business-facing role without needing to code',
  ],
] as const

export const GOOGLE_APPRENTICESHIP_LOCATIONS = [
  'Bengaluru, Karnataka',
  'Gurgaon, Haryana',
  'Hyderabad, Telangana',
  'Mumbai, Maharashtra',
] as const

export const GOOGLE_APPRENTICESHIP_ELIGIBILITY = [
  "Bachelor's or Master's degree completed — you must not be currently enrolled in a full-time academic program (Data Analytics accepts any graduate).",
  'Less than 1 year of relevant professional experience in the track you are applying for.',
  'Programming experience in at least one language, for the Software track specifically.',
  'Aadhaar number linked to an active mobile number, and an Aadhaar-seeded bank account.',
  'You must not have completed a prior government apprenticeship program; maximum of two apprenticeship programs in your career, with the second in a different trade.',
  'Not eligible for immigration sponsorship — you need to already be authorized to work in India.',
] as const

export const GOOGLE_APPRENTICESHIP_APPLICATION_STAGES = [
  {
    stage: 'Stage 1 — Resume shortlisting',
    body: 'Submit a single-document resume through careers.google.com, clearly stating your graduation year — Google explicitly calls this out in its listings.',
  },
  {
    stage: 'Stage 2 — Assessment',
    body: 'Some tracks (notably Software and Data Analytics) include an online assessment testing basic aptitude or technical skills.',
  },
  {
    stage: 'Stage 3 — Technical/role interview',
    body: 'Focused on problem-solving and role-relevant basics, not deep specialist knowledge.',
  },
  {
    stage: 'Stage 4 — Behavioral interview',
    body: 'Communication, teamwork, and how you handle ambiguity — Google listings repeatedly mention navigating ambiguous tasks as a desired trait.',
  },
  {
    stage: 'Stage 5 — Offer',
    body: 'The full process typically spans 18–24 weeks in total, so patience is part of the deal.',
  },
] as const

export const GOOGLE_APPRENTICESHIP_TIMELINE_STEPS = [
  { label: 'Application Opens', detail: 'Rolling — apply before Aug 3, 2026' },
  { label: 'Resume Screening', detail: 'Graduation year must be clear' },
  { label: 'Assessment', detail: 'Track-dependent' },
  { label: 'Interview(s)', detail: 'Technical + behavioral' },
  { label: 'Offer', detail: '18–24 week total cycle' },
  { label: 'Joining', detail: 'March / June 2027' },
] as const

export const GOOGLE_APPRENTICESHIP_RESUME_TIPS = [
  'Clearly state your graduation year — Google lists this as an explicit requirement.',
  'Keep it to one page — apprenticeship reviewers screen volume, not multi-page resumes.',
  'Lead with projects, not just coursework — especially for Software and Data Analytics, a couple of well-described deployed projects with GitHub links carry more weight than a long course list.',
  'List relevant certifications (SQL, Google Analytics, project management basics) only if you can speak to them in an interview.',
  'If you are a career switcher for Data Analytics or Project Management, use your summary to connect your past field to the new one.',
] as const

export const GOOGLE_APPRENTICESHIP_OUTSIDE_INDIA_COLUMNS = [
  'Country',
  'Duration',
  'Visa/authorization required',
  'Apply directly from India?',
] as const

export const GOOGLE_APPRENTICESHIP_OUTSIDE_INDIA_ROWS = [
  ['United States', '~18 months', 'Must already have US work authorization', 'No'],
  ['France', '12–24 months (varies)', 'Must be enrolled in a French CFA + partner university', 'No'],
  ['Switzerland', 'Varies (EFZ track)', 'Tied to Swiss vocational education system', 'No'],
] as const

export const GOOGLE_APPRENTICESHIP_SOURCES = [
  'Google Careers — official apprenticeship job listings (careers.google.com)',
  'Google Operations Center — India apprenticeships page',
  'Third-party recruiter/job-board postings mirroring official Google listings, used only to cross-check dates and locations (stipend figures from these sources are explicitly marked unofficial above)',
] as const

export const GOOGLE_APPRENTICESHIP_FAQ_ITEMS = [
  {
    question: 'Is the Google Apprenticeship program open now?',
    answer:
      'Yes, for India — across all four tracks — with an application deadline of August 3, 2026.',
  },
  {
    question: 'Who can apply for Google Apprenticeship?',
    answer:
      'Graduates who have completed their degree (not currently enrolled), with under a year of relevant experience, legally authorized to work in India.',
  },
  {
    question: 'Can freshers apply?',
    answer:
      'Yes — the program is designed for recent graduates as much as career switchers; you do not need prior industry experience for most tracks.',
  },
  {
    question: 'Can final-year students apply?',
    answer:
      'Generally no. Google listings specify applicants should not be currently enrolled in an academic program — you need to have graduated already.',
  },
  {
    question: 'Can non-CS students apply?',
    answer:
      'Yes, especially for Data Analytics (any bachelor’s degree) and Project Management (any background). Software specifically needs an engineering degree.',
  },
  {
    question: 'Is Google Apprenticeship paid?',
    answer:
      'Yes. Google does not publish exact numbers, but unofficial estimates put it around ₹41,600–₹66,600 per month in India — confirm the real figure with your recruiter.',
  },
  {
    question: 'Is there any bond or service commitment?',
    answer:
      'Google public listings do not mention a bond. Standard program terms (like a maximum of two apprenticeships in a career, and not eligible for immigration sponsorship) are disclosed, but a financial bond is not part of the published terms.',
  },
  {
    question: 'Is work-from-home available?',
    answer:
      'No — all four India tracks are in-office, full-time roles, with no remote option.',
  },
  {
    question: 'Can international students apply to the India program?',
    answer:
      'The India listings require Aadhaar-linked mobile and bank details, effectively limiting the program to those already eligible to work in India.',
  },
  {
    question: 'Is the completion certificate valid / recognized?',
    answer:
      'Yes — it is a nationally recognized credential, jointly associated with the Government of India and Google.',
  },
  {
    question: 'Is Google Operations Center (GOC) the same as Google?',
    answer:
      'No. GOC explicitly states it is a distinct organization from Google, with its own separate apprenticeship program, though also India-based.',
  },
  {
    question: 'Is coding required for all tracks?',
    answer:
      'No — coding experience is specifically required for the Software Application Development track. Data Analytics, Marketing, and Project Management do not require prior programming experience.',
  },
  {
    question: 'What is the Google Apprenticeship application deadline / last date to apply?',
    answer: 'August 3, 2026, for the current India cohort.',
  },
  {
    question: 'Does Google Apprenticeship guarantee a full-time job?',
    answer:
      'No. It provides real project experience and a path to apply for full-time roles in your final three months, but it is not a guaranteed conversion.',
  },
] as const

export const GOOGLE_APPRENTICESHIP_CONTEXTUAL_LINKS = [
  { href: '/blog/how-to-get-internship-opportunities', label: 'How to Get Internships in India' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Interview Guide' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/tools/ats-checker', label: 'ATS Resume Checker' },
  { href: '/tools/question-generator', label: 'AI Question Generator' },
  { href: '/signup', label: 'AI Mock Interviews' },
] as const
