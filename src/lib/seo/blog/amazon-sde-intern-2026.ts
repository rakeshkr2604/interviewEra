/**
 * Amazon SDE Intern Interview Experience 2026 — editorial config.
 * Content source of truth for CMS: content/blog/amazon-sde-intern-interview-experience-2026.md
 * Live route mirrors that article via TSX (InterviewEra has no MDX pipeline).
 */
export const AMAZON_SDE_INTERN_CANONICAL_PATH =
  '/blog/amazon-sde-intern-interview-experience-2026' as const

export const AMAZON_SDE_INTERN_META_TITLE =
  'Amazon SDE I Intern Interview Experience 2026 | OA, Interview Questions & Preparation Guide'

export const AMAZON_SDE_INTERN_META_DESCRIPTION =
  'Read a complete Amazon SDE I Intern Interview Experience for 2026 University Hiring. Learn the Online Assessment pattern, interview rounds, coding questions, Leadership Principles, preparation roadmap, tips, mistakes to avoid, and resources.'

export const AMAZON_SDE_INTERN_KEYWORDS =
  'amazon sde intern interview experience, amazon internship 2026, amazon oa pattern, amazon university hiring, amazon sde interview questions, amazon leadership principles, amazon coding interview, amazon internship preparation, amazon oa experience, amazon interview rounds, amazon internship interview'

export const AMAZON_SDE_INTERN_PUBLISHED = '2026-08-05'
export const AMAZON_SDE_INTERN_LAST_UPDATED = '2026-08-05'
export const AMAZON_SDE_INTERN_READING_TIME = '22 min read'
export const AMAZON_SDE_INTERN_AUTHOR = 'InterviewEra Editorial'
export const AMAZON_SDE_INTERN_REVIEWER = 'InterviewEra Career Content Team'

export const AMAZON_SDE_INTERN_HERO_PATH = '/blog/amazon-sde-intern-hero.webp'
export const AMAZON_SDE_INTERN_HERO_ALT =
  'Student preparing for Amazon SDE Intern university hiring with OA-to-offer timeline'

export const AMAZON_SDE_INTERN_IMAGES = {
  hero: {
    src: AMAZON_SDE_INTERN_HERO_PATH,
    alt: AMAZON_SDE_INTERN_HERO_ALT,
    caption: 'Amazon SDE I Intern 2026 prep: OA, coding rounds, and Leadership Principles',
  },
  timeline: {
    src: '/blog/amazon-sde-timeline.webp',
    alt: 'University hiring timeline from Amazon SDE Intern application to offer',
    caption: 'Planning sketch of a commonly reported university hiring flow',
  },
  oa: {
    src: '/blog/amazon-sde-oa.webp',
    alt: 'Amazon SDE internship OA structure showing coding, workstyles, and feedback survey timing',
    caption: 'Official internship OA baseline: about 90 minutes across three parts',
  },
  leadership: {
    src: '/blog/amazon-leadership-principles.webp',
    alt: 'Leadership Principles study map for Amazon internship behavioral prep',
    caption: 'Map STAR stories to Leadership Principles before interview week',
  },
  roadmap: {
    src: '/blog/amazon-roadmap.webp',
    alt: '30-day Amazon SDE Intern preparation roadmap across four weeks',
    caption: 'A four-week plan beats last-minute Hard-problem panic',
  },
  checklist: {
    src: '/blog/amazon-checklist.webp',
    alt: 'Amazon SDE Intern preparation checklist covering resume, projects, Leadership Principles, and interview day',
    caption: 'Use four checklists — not one vague to-do list',
  },
} as const

export const AMAZON_SDE_INTERN_TOC = [
  { id: 'quick-background', label: 'Quick background' },
  { id: 'company-overview', label: 'Company overview' },
  { id: 'internship-details', label: 'Internship details' },
  { id: 'overview-table', label: '2026 overview' },
  { id: 'job-description', label: 'Job description themes' },
  { id: 'hiring-timeline', label: 'Hiring timeline' },
  { id: 'preparation-strategy', label: 'Preparation strategy' },
  { id: 'online-assessment', label: 'Online assessment' },
  { id: 'round-1', label: 'Round 1' },
  { id: 'round-2', label: 'Round 2' },
  { id: 'leadership-principles', label: 'Leadership Principles' },
  { id: 'technical-questions', label: 'Technical questions' },
  { id: 'behavioral-questions', label: 'Behavioral questions' },
  { id: 'coding-summary', label: 'Coding summary' },
  { id: 'thirty-day-roadmap', label: '30-day roadmap' },
  { id: 'resources', label: 'Resources' },
  { id: 'common-mistakes', label: 'Common mistakes' },
  { id: 'pro-tips', label: 'Pro tips' },
  { id: 'checklists', label: 'Checklists' },
  { id: 'hiring-trends', label: '2026 hiring trends' },
  { id: 'key-takeaways', label: 'Key takeaways' },
  { id: 'faq', label: 'FAQ' },
] as const

export const AMAZON_SDE_INTERN_FAQ_CATEGORIES = [
  {
    id: 'process',
    label: 'Process Overview',
    items: [
      {
        q: 'What is the Amazon SDE Intern interview process for university hiring?',
        a: 'Most university pipelines follow application → OA → interviews → recruiter update → decision. Exact steps vary by campus, region, and hiring team. Use your recruiter email as the source of truth for your loop.',
      },
      {
        q: 'How hard are Amazon SDE Intern interviews?',
        a: 'Overall difficulty is commonly described as medium to hard. The real challenge is combined: timed coding quality, behavioral depth, and clear communication.',
      },
      {
        q: 'How many interview rounds are there after OA?',
        a: 'Many candidates report around one to two technical interviews after OA. Some loops add or compress rounds depending on team and campus process.',
      },
      {
        q: 'How long does the Amazon SDE Intern hiring process take?',
        a: 'Timelines vary widely by campus, region, and hiring window. Some candidates move from OA to interviews within days; others wait weeks. Track recruiter emails and spam folders rather than assuming a fixed calendar.',
      },
      {
        q: 'Is Amazon SDE Intern hiring the same for every college?',
        a: 'No. University, region, recruiter, hiring team, and year can change OA timing, interview count, and communication style. Treat campus drive stories as patterns, not guarantees for your batch.',
      },
      {
        q: 'Do I need a referral for Amazon university hiring?',
        a: 'Referrals can improve visibility in some pipelines, but they do not replace OA or interviews. You still need strong coding and Leadership Principle stories. Follow the official application path listed for your cycle.',
      },
    ],
  },
  {
    id: 'online-assessment',
    label: 'Online Assessment',
    items: [
      {
        q: 'How long is the Amazon SDE Intern OA?',
        a: 'Amazon’s university guidance for SDE internships indicates about 90 minutes, including coding (~70), workstyles (~15), and feedback survey (~5). Always confirm details in your OA invitation.',
      },
      {
        q: 'How many coding questions appear in the OA?',
        a: 'Candidates commonly report two DSA-style coding problems in the coding assessment. Do not treat unofficial PDFs as guaranteed replicas of your test.',
      },
      {
        q: 'Is the Workstyles assessment important?',
        a: 'Yes. It is an official part of the internship OA flow and evaluates workplace judgment aligned with Leadership Principle thinking. Answer honestly and consistently rather than gaming extremes.',
      },
      {
        q: 'Are Amazon OA questions the same every year?',
        a: 'No. Patterns overlap, but exact prompts change. Prepare transferable patterns—windows, trees, graphs, heaps, DP—rather than memorizing claimed question banks.',
      },
      {
        q: 'Where can I verify official OA information?',
        a: 'Start with Amazon’s public university OA page on amazon.jobs (Online assessment prep for SDE roles). Prefer that page and your recruiter email over unofficial forwards.',
      },
      {
        q: 'Can I use Google or documentation during the Amazon OA?',
        a: 'Amazon’s university OA guidance says publicly accessible online resources may be allowed during coding, with restrictions. Do not use login-walled private repos. Follow your invite rules exactly — browser activity may be logged.',
      },
      {
        q: 'What happens if I miss the OA deadline?',
        a: 'OA links are time-bound in the invitation email. Missing the window usually means you cannot proceed in that cycle unless a recruiter explicitly extends access. Set reminders as soon as the invite arrives.',
      },
      {
        q: 'Do I need a webcam for the Amazon SDE Intern OA?',
        a: 'Amazon’s OA setup guidance includes webcam and computer requirements for many assessments. Check your invitation for the exact technical checklist before test day.',
      },
    ],
  },
  {
    id: 'interview-rounds',
    label: 'Interview Rounds',
    items: [
      {
        q: 'What happens in Amazon SDE Intern Round 1?',
        a: 'Candidates commonly report a mix of coding, project discussion, and Leadership Principle questions. Expect clarifying questions, edge cases, and follow-ups on your personal contribution — not only syntax.',
      },
      {
        q: 'What happens in Amazon SDE Intern Round 2?',
        a: 'When scheduled, Round 2 is often deeper: harder coding, sharper project trade-offs, and stronger LP probing. Stay calm if you need a hint — interviewers often evaluate recovery quality.',
      },
      {
        q: 'Will interviewers ask about my projects?',
        a: 'Yes, many candidates report project deep-dives. Be ready to explain architecture choices, bugs you fixed, metrics, and what you would rebuild. “We did it” answers without your actions are a common failure mode.',
      },
      {
        q: 'Do Amazon intern interviews include system design?',
        a: 'Full large-scale system design is less common for intern loops than for experienced SDE roles. Candidates more often see DSA, project design choices, and fundamentals. Confirm with your recruiter if a design round is scheduled.',
      },
      {
        q: 'Should I speak while coding in the interview?',
        a: 'Yes. Interviewers need to hear how you think: constraints, approach, trade-offs, and testing plan. Silent coding is a frequent reason strong solvers still get weak feedback.',
      },
    ],
  },
  {
    id: 'leadership-principles',
    label: 'Leadership Principles',
    items: [
      {
        q: 'Do Amazon intern interviews include Leadership Principles?',
        a: 'Recent candidates commonly report coding plus Leadership Principle evaluation. Prepare STAR stories even if your invite says “technical interview.”',
      },
      {
        q: 'How should students with no job experience prepare Leadership Principles?',
        a: 'Use projects, hackathons, club leadership, teaching, open-source, and academic teamwork conflicts. Ownership stories do not require a full-time job title.',
      },
      {
        q: 'How many STAR stories should I prepare for Amazon?',
        a: 'Most candidates do well with 8–12 flexible stories mapped across Ownership, Customer Obsession, Dive Deep, Bias for Action, Deliver Results, Learn and Be Curious, and Invent and Simplify.',
      },
      {
        q: 'Which Leadership Principles matter most for SDE Intern interviews?',
        a: 'Amazon publishes 16 Leadership Principles. For intern loops, candidates commonly get probed on Ownership, Customer Obsession, Dive Deep, Bias for Action, Deliver Results, and Learn and Be Curious — prepare those first, then expand.',
      },
      {
        q: 'Can I reuse one story for multiple Leadership Principles?',
        a: 'Yes, if you reframe the same situation around a different principle and still answer the exact question asked. Keep the Action section personal and add a clear metric or learning.',
      },
    ],
  },
  {
    id: 'preparation',
    label: 'Preparation',
    items: [
      {
        q: 'What programming language should I use?',
        a: 'Use the language you can write correctly under pressure—often Java, C++, or Python. Switching languages one week before OA usually increases bug rate more than it helps.',
      },
      {
        q: 'What is a practical 30-day preparation plan?',
        a: 'Week 1 foundations, Week 2 OA simulations, Week 3 graphs/DP plus mocks, Week 4 revision and LP polish. Keep at least one weekly mock interview non-negotiable.',
      },
      {
        q: 'How can I practice Amazon-style interviews effectively?',
        a: 'Combine timed DSA, spoken explanation, STAR drills, and full mocks. InterviewEra AI mock interviews help rehearse coding and behavioral follow-ups under realistic pressure.',
      },
      {
        q: 'Which DSA topics matter most for Amazon OA and interviews?',
        a: 'Prioritize arrays, strings, hashing, sliding window, binary search, trees, graphs, heaps, and intro DP. Pattern fluency beats collecting random Hard problems you cannot explain.',
      },
      {
        q: 'How important are CS fundamentals for Amazon SDE Intern?',
        a: 'OOP, OS, DBMS, and CN basics often appear as short probes around projects or coding follow-ups. Aim for interview-ready explanations, not textbook dumps.',
      },
      {
        q: 'How many LeetCode problems should I solve before applying?',
        a: 'There is no magic number. Candidates who convert usually master medium patterns under a timer and can narrate solutions. Track weak topics weekly instead of chasing a raw solve count.',
      },
    ],
  },
  {
    id: 'eligibility',
    label: 'Eligibility & Outcomes',
    items: [
      {
        q: 'Can first-year or second-year students apply?',
        a: 'Eligibility depends on the official posting and program rules for that cycle. Check graduation window and enrollment requirements on the listing before assuming fit.',
      },
      {
        q: 'Does CGPA matter more than DSA once interviews start?',
        a: 'Shortlisting criteria vary by posting and campus rules. Once interviews begin, demonstrated problem-solving and Leadership Principle stories usually matter more than a single resume number.',
      },
      {
        q: 'What is the Amazon SDE Intern stipend or salary?',
        a: 'Do not trust unofficial Telegram or social media numbers. Stipend, benefits, and location details are posting- and offer-dependent. Confirm only from the official job listing or offer documents.',
      },
      {
        q: 'How long is the Amazon SDE internship?',
        a: 'Duration is posting-dependent and can differ by program and country. Candidates commonly discuss multi-month windows, but you must verify the length on your specific listing or offer letter.',
      },
      {
        q: 'What if I get rejected after OA or interviews?',
        a: 'Rejection is common in competitive cycles. Review weak patterns, rebuild STAR stories with metrics, and practice spoken coding. Reapplication windows depend on Amazon policy for that role and year — ask your recruiter.',
      },
      {
        q: 'Will I get feedback if I am rejected?',
        a: 'Detailed feedback is not guaranteed. Many candidates receive only a status update. Treat every mock and interview as data: note where you froze, skipped edge cases, or gave vague ownership answers.',
      },
    ],
  },
] as const

/** Flat FAQ list for FAQPage JSON-LD — category order preserved. */
export const AMAZON_SDE_INTERN_FAQS = AMAZON_SDE_INTERN_FAQ_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({
    question: item.q,
    answer: item.a,
  })),
)
export const AMAZON_SDE_INTERN_HOWTO_STEPS = [
  {
    name: 'Week 1 — Foundations',
    text: 'Practice arrays, strings, hashing, and two pointers. Complete two timed sets. Draft six STAR stories. Clean your resume and project notes.',
  },
  {
    name: 'Week 2 — OA simulation',
    text: 'Practice sliding window, binary search, and trees. Run three timed OA-style mocks. Practice consistent Workstyles answers. Write one-page project deep dives.',
  },
  {
    name: 'Week 3 — Depth and live skills',
    text: 'Cover graphs, heaps, and intro DP. Speak while coding daily. Drill LP follow-ups. Complete two full mock interviews.',
  },
  {
    name: 'Week 4 — Conversion polish',
    text: 'Revise weak patterns. Run two harder mocks. Finalize 10–12 STAR stories. Sleep well and complete your assessment-day setup checklist.',
  },
] as const

export const AMAZON_OA_OFFICIAL_URL =
  'https://amazon.jobs/content/en/how-we-hire/university/sde-oa' as const

export const AMAZON_LP_OFFICIAL_URL =
  'https://www.amazon.jobs/content/en/our-workplace/leadership-principles' as const
