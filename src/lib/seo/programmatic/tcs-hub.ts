export const TCS_HERO_PATH = '/blog/tcs-interview-hero.webp'
export const TCS_HERO_ALT =
  'TCS interview preparation 2026 for Indian freshers — NQT aptitude, coding, technical and HR rounds, Digital vs Prime tracks, and campus placement roadmap'
export const TCS_HERO_WIDTH = 1024
export const TCS_HERO_HEIGHT = 682

export const TCS_PROCESS_PATH = '/blog/tcs-interview-process-2026.webp'
export const TCS_PROCESS_ALT =
  'TCS hiring process 2026 — Application, TCS NQT, Technical Round, Managerial Round, HR Round, and Offer for campus placements in India'
export const TCS_PROCESS_WIDTH = 1024
export const TCS_PROCESS_HEIGHT = 682

export const TCS_META_TITLE = 'TCS Interview Questions (2026)'
export const TCS_CANONICAL_PATH = '/interview-questions/tcs'
export const TCS_DESCRIPTION =
  'TCS interview questions with expert answers for India 2026 — NQT pattern, aptitude, programming logic, coding, CS fundamentals, Digital vs Prime comparison, 30-day roadmap, and mock interview prep.'
export const TCS_HERO_LEAD =
  'Curated TCS interview questions for campus placements and off-campus drives — with NQT section breakdown, hiring process guide, topic importance chart, Digital vs Prime comparison, common mistakes, and a 30-day preparation plan.'
export const TCS_PUBLISHED_DATE = '2026-05-22'
export const TCS_LAST_UPDATED = '2026-06-12'
export const TCS_REVIEWED_DATE = '2026-06-12'
export const TCS_READING_TIME = '24 min read'
export const TCS_AUTHOR_NAME = 'InterviewEra Team'
export const TCS_REVIEWER_NAME = 'InterviewEra Editorial'
export const TCS_EDITORIAL_NOTE =
  'Content reviewed and updated for 2026 TCS NQT and campus hiring loops across Digital, Prime, and Ninja tracks — aptitude weighting, programming logic, basic DSA, CS fundamentals, and HR STAR structure for Indian freshers.'

export const TCS_HERO_VISUAL_TITLE = 'TCS Campus Hiring Roadmap'

export const TCS_HERO_ROADMAP_STEPS = [
  { label: 'TCS NQT', icon: 'nqt' as const },
  { label: 'Aptitude', icon: 'aptitude' as const },
  { label: 'Coding', icon: 'coding' as const },
  { label: 'Technical Interview', icon: 'technical' as const },
  { label: 'HR Round', icon: 'hr' as const },
] as const

export const TCS_HERO_TRACKS = [
  { name: 'Prime Track', mark: 'P', accent: '#f59e0b' },
  { name: 'Digital Track', mark: 'D', accent: '#22c55e' },
] as const

export const TCS_HERO_TOPIC_ICONS = [
  'Aptitude',
  'Coding',
  'Technical Interview',
  'HR Round',
] as const

export const TCS_TOC_SECTIONS = [
  { id: 'tcs-questions', label: 'TCS Questions' },
  { id: 'tcs-hiring-process', label: 'TCS Hiring Process' },
  { id: 'tcs-nqt-pattern', label: 'NQT Pattern' },
  { id: 'tcs-topic-importance', label: 'Topic Importance' },
  { id: 'tcs-package-tracks', label: 'Package Tracks' },
  { id: 'tcs-digital-vs-prime', label: 'Digital vs Prime' },
  { id: 'tcs-score-targets', label: 'Score Targets' },
  { id: 'tcs-30-day-roadmap', label: '30-Day Plan' },
  { id: 'tcs-top-mistakes', label: 'Common Mistakes' },
  { id: 'tcs-faq', label: 'FAQ' },
  { id: 'tcs-mock-interview-cta', label: 'Mock Interview CTA' },
] as const

export const TCS_HIRING_STEPS = [
  {
    step: 'Step 1 — Application',
    body: 'Register on the TCS NextStep / campus portal with accurate academic details. Upload resume highlighting projects, internships, and programming languages. Eligibility typically requires 60%+ aggregate with no active backlogs at most campuses.',
  },
  {
    step: 'Step 2 — TCS NQT (National Qualifier Test)',
    body: 'Timed online assessment with Verbal Ability, Reasoning, Numerical Ability, and Programming Logic sections — plus coding for Digital/Prime aspirants. Top percentile bands unlock higher package tracks.',
  },
  {
    step: 'Step 3 — Technical Round',
    body: 'Live or virtual panel testing CS fundamentals — OOPs, DBMS/SQL, OS, networking basics — plus 1–2 coding or pseudocode problems. Expect follow-ups on your resume projects and language choice (Java/C/Python).',
  },
  {
    step: 'Step 4 — Managerial Round',
    body: 'Assesses communication, situational judgment, and role fit. May include light technical probing, project deep-dives, and scenario questions on deadlines, teamwork, and client delivery.',
  },
  {
    step: 'Step 5 — HR Round',
    body: 'Final behavioural screen: career goals, relocation flexibility, salary band acceptance, and “Why TCS?” Prepare STAR stories and know Digital vs Prime / Ninja package differences.',
  },
  {
    step: 'Step 6 — Offer',
    body: 'Selected candidates receive offer letter with role band, CTC breakdown, joining date, and ILP (Initial Learning Program) details. Digital UG ₹7.09–8.04 LPA / PG ₹7.39–8.04 LPA; Prime UG ₹9.09–9.30 LPA / PG ₹11.50–11.80 LPA — confirm track and fixed vs variable split before accepting.',
  },
] as const

export const TCS_PROCESS_VISUAL_TITLE = 'TCS Hiring Process 2026'

export const TCS_PROCESS_VISUAL_STEPS = [
  { label: 'Application', duration: '1–2 weeks', signal: 'Portal & resume screen', icon: 'application' as const },
  { label: 'TCS NQT', duration: '90–120 min', signal: 'Aptitude + logic filter', icon: 'nqt' as const },
  { label: 'Technical Round', duration: '45–60 min', signal: 'CS + coding depth', icon: 'technical' as const },
  { label: 'Managerial Round', duration: '30–45 min', signal: 'Fit & communication', icon: 'managerial' as const },
  { label: 'HR Round', duration: '20–30 min', signal: 'Behavioural + offer band', icon: 'hr' as const },
  { label: 'Offer', duration: '1–3 weeks', signal: 'CTC & joining', icon: 'offer' as const },
] as const

export const TCS_NQT_PATTERN_DISCLAIMER =
  'TCS updates exam formats periodically. Always verify the latest NQT pattern before applying.'

export const TCS_NQT_PATTERN_TABLE_COLUMNS = ['Section', 'Focus Area'] as const

export const TCS_NQT_PATTERN_TABLE_ROWS = [
  ['Verbal Ability', 'Grammar, Reading, Vocabulary'],
  ['Numerical Ability', 'Arithmetic, Percentages, Profit & Loss'],
  ['Reasoning Ability', 'Logical Reasoning, Patterns'],
  ['Programming Logic', 'Flowcharts, Pseudocode'],
  ['Coding', 'Java, C++, Python'],
] as const

/** Shared column accent presets — dim | Digital green | Prime amber | dim */
export const TCS_TABLE_ACCENTS_2COL = ['dim', 'da'] as const
export const TCS_TABLE_ACCENTS_3COL = ['dim', 'da', 'pm'] as const
export const TCS_TABLE_ACCENTS_4COL = ['dim', 'da', 'pm', 'dim'] as const

/** Row accents for NQT section table — section label column + mobile cards */
export const TCS_NQT_PATTERN_ROW_ACCENTS = ['ba', 'da', 'pm', 'da', 'pm'] as const

export const TCS_PACKAGE_TRACKS_ROW_ACCENTS = ['ba', 'da', 'pm'] as const

export const TCS_PACKAGE_COMPARISON_ROW_ACCENTS = ['da', 'pm'] as const

export const TCS_NQT_SECTIONS = [
  {
    section: 'Verbal Ability',
    body: 'Reading comprehension, sentence correction, synonyms/antonyms, and para-jumbles. High accuracy matters more than speed — negative marking on some NQT variants makes reckless guessing costly.',
    prep: 'Solve 10 RC passages weekly; review grammar rules for subject-verb agreement and tense.',
  },
  {
    section: 'Numerical Ability',
    body: 'Percentages, ratios, time-speed-distance, profit-loss, and basic data interpretation. Campus NQT papers are time-pressured — mental math shortcuts save minutes.',
    prep: 'Drill 30 timed quant questions daily in Weeks 1–2 of your prep plan.',
  },
  {
    section: 'Reasoning',
    body: 'Blood relations, seating arrangements, syllogisms, coding-decoding, and series patterns. This section separates Digital/Prime shortlists from mass Ninja cuts.',
    prep: 'Practice 15 reasoning sets under 20-minute clocks; learn diagram notation for arrangements.',
  },
  {
    section: 'Programming Logic',
    body: 'Flowcharts, pseudocode tracing, operator precedence, and debugging snippets — tests whether you think like a programmer before live coding.',
    prep: 'Trace 5 pseudocode problems daily; revise loops, recursion, and boolean logic.',
  },
  {
    section: 'Coding',
    body: '1–2 problems for Digital/Prime tracks — arrays, strings, basic sorting/searching. Ninja track may skip or use lighter programming logic only.',
    prep: 'Solve 40 easy array/string problems on paper under 25-minute timers.',
  },
] as const

export const TCS_TOPIC_IMPORTANCE = [
  { topic: 'Aptitude', weight: 92 },
  { topic: 'Reasoning', weight: 88 },
  { topic: 'Programming Logic', weight: 85 },
  { topic: 'SQL', weight: 72 },
  { topic: 'OOPs', weight: 70 },
  { topic: 'DBMS', weight: 68 },
  { topic: 'OS', weight: 62 },
  { topic: 'Networking', weight: 55 },
  { topic: 'HR', weight: 65 },
] as const

export const TCS_PACKAGE_TRACKS_COLUMNS = ['Track', 'Package', 'Difficulty', 'Coding Level'] as const

export const TCS_PACKAGE_TRACKS_ROWS = [
  ['Ninja', 'Entry Level', 'Easy', 'Basic'],
  ['Digital', 'Medium', 'Medium', 'Intermediate'],
  ['Prime', 'Highest Fresher Track', 'High', 'Strong DSA'],
] as const

export const TCS_PACKAGE_TRACKS_NOTES = [
  'Ninja (~₹3.5 LPA band) is the mass-hiring track — aptitude and programming logic matter most; coding depth is lighter.',
  'Digital (UG ₹7.09–8.04 LPA) targets strong NQT performers with full-stack, cloud, and AI/ML role exposure.',
  'Prime (UG ₹9.09–9.30 LPA; PG up to ₹11.80 LPA) is the highest fresher track — expect medium DSA, deeper CS probes, and a managerial round.',
] as const

export const TCS_SCORE_TARGETS_DISCLAIMER =
  'No fixed cutoff is publicly disclosed by TCS. Targets below are preparation benchmarks from campus prep communities — not official thresholds.'

export const TCS_SCORE_TARGETS = [
  {
    area: 'Aptitude',
    target: '75%+',
    detail: 'Aim for high accuracy in quant and reasoning sections — speed matters under NQT time limits.',
  },
  {
    area: 'Coding',
    target: '2/2 coding questions whenever possible',
    detail: 'Digital and Prime aspirants should solve both problems cleanly with correct edge-case handling.',
  },
  {
    area: 'Technical Interview',
    target: 'Strong OOPs, SQL, DBMS, OS fundamentals',
    detail: 'Narrate answers with examples from projects; expect 1–2 follow-up probes per topic.',
  },
  {
    area: 'HR Round',
    target: 'Clear communication and confidence',
    detail: 'Use STAR format, research ILP/Fresco Play, and articulate why TCS fits your career plan.',
  },
] as const

export const TCS_PACKAGE_COMPARISON_INTRO =
  'The salary brackets and roles for both categories generally scale as follows:'

export const TCS_PACKAGE_COMPARISON_COLUMNS = [
  'Tier',
  'Annual CTC (Undergraduate)',
  'Annual CTC (Postgraduate)',
  'Target Roles & Tech Focus',
] as const

export const TCS_PACKAGE_COMPARISON_ROWS = [
  [
    'TCS Digital',
    '₹7.09 – ₹8.04 Lakhs',
    '₹7.39 – ₹8.04 Lakhs',
    'Full Stack Development, Cloud, AI/ML, Big Data',
  ],
  [
    'TCS Prime',
    '₹9.09 – ₹9.30 Lakhs',
    '₹11.50 – ₹11.80 Lakhs',
    'Technical Specialist, Lead Projects, Mentorship',
  ],
] as const

export const TCS_DIGITAL_PRIME_COLUMNS = ['TCS Digital', 'TCS Prime'] as const

export const TCS_DIGITAL_PRIME_ROWS = [
  ['Annual CTC (UG)', '₹7.09 – ₹8.04 LPA', '₹9.09 – ₹9.30 LPA'],
  ['Annual CTC (PG)', '₹7.39 – ₹8.04 LPA', '₹11.50 – ₹11.80 LPA'],
  ['Target roles', 'Full Stack, Cloud, AI/ML, Big Data', 'Technical Specialist, Lead Projects, Mentorship'],
  ['Difficulty', 'Moderate — strong aptitude + basic coding', 'High — aptitude plus DSA-medium coding'],
  ['Coding Level', 'Easy arrays/strings, OOP basics', 'Medium DSA, optimization expected'],
  ['Selection Rate', 'Higher — larger intake band', 'Lower — top NQT percentile only'],
  ['Interview Depth', 'Technical + HR; lighter managerial', 'Technical + managerial + HR; deeper CS probes'],
] as const

export const TCS_TOP_MISTAKES = [
  {
    mistake: 'Ignoring aptitude',
    why: 'NQT eliminates 60–70% of applicants before any technical round — strong coders fail without quant and reasoning practice.',
    fix: 'Allocate 50% of Week 1–2 to timed aptitude and reasoning sets mirroring NQT section clocks.',
  },
  {
    mistake: 'Only solving coding questions',
    why: 'TCS campus pipeline is aptitude-first. LeetCode-heavy prep without NQT simulation leaves you unprepared for the actual filter.',
    fix: 'Balance daily prep: 60 min aptitude + 60 min programming logic/coding — not coding alone.',
  },
  {
    mistake: 'Weak HR answers',
    why: 'Generic “TCS is a big company” answers fail HR panels that test motivation, relocation, and career clarity.',
    fix: 'Prepare 5 STAR stories and research ILP, Fresco Play, and specific TCS training programs.',
  },
  {
    mistake: 'No mock interviews',
    why: 'Technical rounds expose gaps in spoken explanations — silent practice hides communication and nervousness issues.',
    fix: 'Run 3 full mocks before NQT: aptitude simulation + technical narration + HR round.',
  },
  {
    mistake: 'Poor communication',
    why: 'Managerial and HR rounds weight clarity heavily — mumbled project explanations fail even with correct technical knowledge.',
    fix: 'Record 60-second project walkthroughs; fix filler words and structure answers with Situation → Action → Result.',
  },
  {
    mistake: 'Last-minute preparation',
    why: 'NQT requires muscle memory for speed math and pattern recognition — cramming one week before fails for most freshers.',
    fix: 'Follow the 30-day plan below starting 4 weeks before your drive date.',
  },
] as const

export const TCS_30_DAY_ROADMAP = [
  {
    week: 'Week 1 (Days 1–7)',
    focus: 'Aptitude',
    items: [
      'Quant: percentages, ratios, TSD, profit-loss — 30 problems/day',
      'Reasoning: arrangements, blood relations, syllogisms',
      '2 full timed NQT-style section mocks',
      'Review mistakes log daily',
    ],
  },
  {
    week: 'Week 2 (Days 8–14)',
    focus: 'Programming Logic + Coding',
    items: [
      'Pseudocode tracing and flowchart problems',
      '40 easy array/string coding problems on paper',
      'Verbal ability: 10 RC passages with review',
      '1 full-length NQT mock under exam conditions',
    ],
  },
  {
    week: 'Week 3 (Days 15–21)',
    focus: 'CS Fundamentals',
    items: [
      'OOPs pillars with Java/C examples',
      'DBMS: normalization, SQL joins, indexing basics',
      'OS: process vs thread, deadlock, scheduling',
      'Networking: TCP vs UDP, HTTP, OSI layers overview',
    ],
  },
  {
    week: 'Week 4 (Days 22–28)',
    focus: 'Mocks + HR',
    items: [
      '3 full-loop mocks: NQT + technical + HR',
      'Prepare “Why TCS?” and 5-year plan answers',
      'Digital vs Prime strategy based on mock scores',
      'Resume polish and project STAR stories',
    ],
  },
] as const

export const TCS_CONTEXTUAL_LINKS_COMPANY = [
  { href: '/interview-questions/companies/infosys', label: 'Infosys Interview Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions' },
  { href: '/interview-questions/companies/accenture', label: 'Accenture Interview Questions' },
  { href: '/interview-questions/companies/cognizant', label: 'Cognizant Interview Questions' },
  { href: '/interview-questions/companies/hcl', label: 'HCL Interview Questions' },
] as const

export const TCS_CONTEXTUAL_LINKS_OTHER = [
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS Software Engineer Questions' },
  { href: '/interview-questions/companies/tcs/java-developer', label: 'TCS Java Developer Questions' },
  { href: '/interview-questions/companies/tcs/frontend-developer', label: 'TCS Frontend Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Hub' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Topic Map' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Guide' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/tools/question-generator/companies/tcs', label: 'TCS Question Generator' },
] as const

export const TCS_CONTEXTUAL_LINKS = [
  ...TCS_CONTEXTUAL_LINKS_COMPANY,
  ...TCS_CONTEXTUAL_LINKS_OTHER,
] as const

export const TCS_FAQ_ITEMS = [
  {
    question: 'What is TCS NQT and who should take it?',
    answer:
      'TCS National Qualifier Test is the primary campus and off-campus screening for TCS hiring in India. Final-year B.Tech/BCA/MCA students and recent graduates register through TCS NextStep. Your NQT percentile determines Ninja, Digital, or Prime track eligibility.',
  },
  {
    question: 'How many rounds are in the TCS interview process?',
    answer:
      'Typically four stages after application: NQT online test, technical interview, managerial interview, and HR round — then offer. Some campus drives consolidate technical and managerial into one longer panel.',
  },
  {
    question: 'What is the difference between TCS Digital and TCS Prime?',
    answer:
      'Prime (UG ₹9.09–9.30 LPA; PG up to ₹11.80 LPA) targets top NQT performers with stronger coding and CS depth. Digital (UG ₹7.09–8.04 LPA) requires solid aptitude and basic programming with roles in full stack, cloud, and AI/ML. Ninja remains the mass hiring band with lighter technical expectations.',
  },
  {
    question: 'Does TCS ask DSA questions in interviews?',
    answer:
      'Prime and Digital technical rounds include easy-to-medium array, string, and logic problems. Heavy dynamic programming is uncommon for fresher TCS loops — aptitude and CS fundamentals matter more than LeetCode Hard.',
  },
  {
    question: 'What aptitude topics matter most for TCS NQT?',
    answer:
      'Percentages, ratios, time-speed-distance, profit-loss, blood relations, seating arrangements, syllogisms, and data interpretation. Programming logic and pseudocode tracing are equally critical for shortlisting.',
  },
  {
    question: 'How should I prepare for TCS HR round?',
    answer:
      'Prepare STAR-format answers for teamwork, deadlines, and conflict. Research TCS scale, ILP training, Fresco Play, and why you prefer TCS over Infosys or Wipro. Know your preferred location and joining flexibility.',
  },
  {
    question: 'What CS fundamentals does TCS test in technical rounds?',
    answer:
      'OOPs, DBMS/SQL (joins, normalization), operating systems (process vs thread, deadlock), basic networking, and SQL vs NoSQL trade-offs. Expect 1–2 coding or pseudocode problems alongside theory questions.',
  },
  {
    question: 'Can I prepare for TCS and Infosys together?',
    answer:
      'Yes — aptitude, reasoning, OOPs, DBMS, and OS overlap heavily. Add company-specific mocks: NQT format for TCS and InfyTQ patterns for Infosys in your final prep week.',
  },
  {
    question: 'What salary should I expect as a TCS fresher in 2026?',
    answer:
      'Digital UG ₹7.09–8.04 LPA (PG ₹7.39–8.04 LPA); Prime UG ₹9.09–9.30 LPA (PG ₹11.50–11.80 LPA). Figures vary by college tier and offer year — confirm CTC breakdown (fixed vs variable) and joining location before accepting.',
  },
  {
    question: 'Is there negative marking in TCS NQT?',
    answer:
      'Some NQT variants apply negative marking on aptitude sections — verify the instructions on your test day. When negative marking applies, skip questions you cannot eliminate to two options.',
  },
  {
    question: 'How long does the TCS hiring process take?',
    answer:
      'Campus drives often complete in 4–8 weeks from NQT to offer. Off-campus batches may stretch longer depending on slot availability and background verification timelines.',
  },
  {
    question: 'How should I use mock interviews for TCS prep?',
    answer:
      'Run at least 3 mocks: one timed NQT simulation, one technical with spoken coding narration, and one HR round. InterviewEra mocks score communication, structure, and technical depth across five rubric dimensions.',
  },
] as const

export function isTcsHubPath(path: string): boolean {
  return path === TCS_CANONICAL_PATH
}

export function isTcsCompanySlug(companySlug: string): boolean {
  return companySlug === 'tcs'
}
