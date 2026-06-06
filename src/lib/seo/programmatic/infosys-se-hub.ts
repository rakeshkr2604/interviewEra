export const INFOSYS_SE_HERO_PATH = '/blog/infosys-software-engineer-hero.webp'
export const INFOSYS_SE_HERO_ALT =
  'Infosys Software Engineer interview preparation guide — InfyTQ, HackWithInfy, aptitude, DSA, technical interview, HR round, and offer journey'
export const INFOSYS_SE_HERO_WIDTH = 1536
export const INFOSYS_SE_HERO_HEIGHT = 1024
export const INFOSYS_SE_PROCESS_PATH = '/blog/infosys-software-engineer-process-2026.webp'
export const INFOSYS_SE_PROCESS_ALT =
  'Infosys Software Engineer interview process flow 2026: Application, InfyTQ, Coding Assessment, Technical Interview, HR Round, and Offer'
export const INFOSYS_SE_PROCESS_WIDTH = 1672
export const INFOSYS_SE_PROCESS_HEIGHT = 941
export const INFOSYS_SE_META_TITLE = 'Infosys Software Engineer Questions (2026)'
export const INFOSYS_SE_CANONICAL_PATH = '/interview-questions/companies/infosys/software-engineer'
export const INFOSYS_SE_DESCRIPTION =
  'Infosys SE interview prep for India 2026: InfyTQ, HackWithInfy, aptitude, DSA, technical rounds, HR prep, and expert model answers.'
export const INFOSYS_SE_EDITORIAL_NOTE =
  'Content reviewed and updated for current Infosys Software Engineer hiring patterns — InfyTQ, HackWithInfy, fresher selection criteria, project discussion depth, aptitude and coding assessments, Core CS technical rounds, hiring process diagram, HR evaluation, and placement expectations in India.'
export const INFOSYS_SE_READING_TIME = '28 min read'
export const INFOSYS_SE_PUBLISHED_DATE = '2026-05-28'
export const INFOSYS_SE_LAST_UPDATED = '2026-06-05'
export const INFOSYS_SE_REVIEWED_DATE = '2026-06-05'
export const INFOSYS_SE_AUTHOR_NAME = 'InterviewEra Team'
export const INFOSYS_SE_REVIEWER_NAME = 'InterviewEra Editorial'

export const INFOSYS_SE_TOC_SECTIONS = [
  { id: 'infosys-se-why-different', label: 'Why Infosys Interviews Are Different' },
  { id: 'infosys-se-hiring-process', label: 'Infosys Hiring Process' },
  { id: 'infosys-se-selection-criteria', label: 'Freshers Selection Criteria' },
  { id: 'infosys-se-infyTQ', label: 'InfyTQ & HackWithInfy' },
  { id: 'infosys-se-technical-topics', label: 'Technical Topics Infosys Tests' },
  { id: 'infosys-se-aptitude', label: 'Aptitude Round' },
  { id: 'infosys-se-coding-round', label: 'Coding Round' },
  { id: 'infosys-se-hr-interview', label: 'HR Interview' },
  { id: 'infosys-se-resume-examples', label: 'Resume Examples' },
  { id: 'infosys-se-project-discussion', label: 'Project Discussion Questions' },
  { id: 'infosys-se-vs-tcs', label: 'Infosys vs TCS' },
  { id: 'infosys-se-roadmap', label: 'Preparation Roadmap' },
  { id: 'infosys-se-questions', label: 'Interview Questions' },
  { id: 'infosys-se-faq', label: 'FAQs' },
] as const

export const INFOSYS_SE_PROCESS_FLOW_STEPS = [
  'Application',
  'InfyTQ',
  'Coding Assessment',
  'Technical Interview',
  'HR Round',
  'Offer',
] as const

export const INFOSYS_SE_HIRING_STEPS = [
  {
    step: 'Step 1 — Resume screening',
    body: 'Recruiters scan for relevant projects, CGPA, internships, and hackathon or InfyTQ certification badges. Tailor bullets to measurable outcomes — not generic “good academic record” lines.',
  },
  {
    step: 'Step 2 — InfyTQ / HackWithInfy',
    body: 'InfyTQ tests aptitude, reasoning, and technical fundamentals for campus shortlists. HackWithInfy is a competitive coding contest — top performers may qualify for the Power Programmer track (₹8–9 LPA).',
  },
  {
    step: 'Step 3 — Technical interview',
    body: 'One or two rounds covering DSA coding, OOP, DBMS, OS, CN, SQL, and project discussion. Panels expect narrated problem-solving — not silent coding or memorized definitions alone.',
  },
  {
    step: 'Step 4 — HR round',
    body: 'Communication, relocation flexibility, salary expectations, and “why Infosys.” Research Springboard, Cobalt cloud practice, and ESG initiatives for credible company-specific answers.',
  },
  {
    step: 'Step 5 — Offer',
    body: 'System Engineer (₹3.6–4.5 LPA), SP track (₹6.5 LPA), or Power Programmer (₹8–9 LPA) for top HackWithInfy performers. Offer includes training period and joining location details.',
  },
] as const

export const INFOSYS_SE_SELECTION_CRITERIA = [
  {
    title: 'Communication Skills',
    evaluates:
      'Clarity when explaining technical concepts, structured answers in HR and technical rounds, and active listening — panels reject candidates who ramble or cannot summarize a project in two minutes.',
  },
  {
    title: 'Problem Solving',
    evaluates:
      'Approach narration before coding, breaking problems into steps, and recovering from hints — Infosys values methodical thinking over silent brute-force attempts.',
  },
  {
    title: 'Coding Fundamentals',
    evaluates:
      'Correct syntax, edge-case handling, and Big-O awareness on easy-to-medium DSA problems — not competitive-programming tricks alone.',
  },
  {
    title: 'Learning Ability',
    evaluates:
      'How quickly you absorb feedback during the interview, willingness to learn new stacks in Springboard training, and examples of self-taught skills from coursework or side projects.',
  },
  {
    title: 'Project Understanding',
    evaluates:
      'Ownership of your capstone or internship work — architecture choices, your specific contributions, trade-offs, and what you would improve if you rebuilt the system.',
  },
  {
    title: 'Professional Attitude',
    evaluates:
      'Punctuality, respect for panel time, relocation flexibility, teamwork examples, and honest answers on strengths and weaknesses without arrogance or evasion.',
  },
] as const

export const INFOSYS_SE_PROJECT_DISCUSSION_TOPICS = [
  {
    title: 'Final year projects',
    detail:
      'Panels probe whether you built the system or only followed a tutorial. Expect questions on your role, module boundaries, and one technical decision you defended.',
    exampleQuestions: [
      'Walk me through your final year project architecture — what were the main components?',
      'Which part of the project did you personally implement, and what would you change today?',
    ],
  },
  {
    title: 'Internship projects',
    detail:
      'Infosys weighs internship experience for off-campus and tier-2 drives. Interviewers check whether you understand production constraints — deployments, code reviews, and team workflows.',
    exampleQuestions: [
      'Describe your internship project and the business problem it solved.',
      'What did you learn in your internship that you did not learn in college coursework?',
    ],
  },
  {
    title: 'Technology choices',
    detail:
      'Be ready to justify language, framework, and database picks — Java vs Python, REST vs GraphQL, MySQL vs MongoDB — with trade-offs, not popularity.',
    exampleQuestions: [
      'Why did you choose this tech stack for your project?',
      'What alternative technologies did you consider and why did you reject them?',
    ],
  },
  {
    title: 'Challenges faced',
    detail:
      'Strong candidates describe a real blocker — performance bottleneck, integration failure, or team conflict — and the debugging or collaboration steps that resolved it.',
    exampleQuestions: [
      'What was the hardest technical challenge in your project and how did you solve it?',
      'Tell me about a bug that took multiple days to fix — what was your debugging process?',
    ],
  },
  {
    title: 'Testing strategy',
    detail:
      'Fresher panels increasingly ask about unit tests, manual test cases, and basic CI awareness. Mention tools you used and what coverage you targeted.',
    exampleQuestions: [
      'How did you test your application before demo day?',
      'Did you write unit tests? Which framework and what scenarios did you cover?',
    ],
  },
  {
    title: 'Improvements',
    detail:
      'Interviewers reward self-critique — scalability limits, missing auth layers, or poor error handling you would fix in a v2. Shows growth mindset beyond the demo.',
    exampleQuestions: [
      'If you had three more months, what would you improve in your project?',
      'What technical debt did you knowingly accept and how would you pay it down?',
    ],
  },
] as const

export const INFOSYS_SE_INFYTQ_CARDS = [
  {
    title: 'What is InfyTQ?',
    body: 'Infosys’s free learning and certification platform for engineering students. Scoring 65%+ can shortlist you for System Engineer roles and unlock higher compensation tracks.',
  },
  {
    title: 'Exam structure',
    body: 'Typically aptitude (quant + logical), verbal/communication, and technical MCQs covering programming fundamentals, DBMS, and OS basics — format varies by campus season.',
  },
  {
    title: 'Difficulty',
    body: 'Moderate for mass-hiring fresher drives — not GATE-level depth, but time pressure and accuracy matter. Weak aptitude performance eliminates candidates before live technical panels.',
  },
  {
    title: 'Preparation strategy',
    body: 'Daily timed aptitude sets, revise OOP and SQL MCQs, complete Infosys official modules on the platform, and take 2 full-length mock InfyTQ simulations in the final week.',
  },
] as const

export const INFOSYS_SE_HACKWITHINFY_CARDS = [
  {
    title: 'What is HackWithInfy?',
    body: 'National competitive programming contest by Infosys. Top performers receive Power Programmer offers with harder DSA expectations than standard campus loops.',
  },
  {
    title: 'Contest structure',
    body: 'Multi-round online coding with algorithmic problems — arrays, strings, DP, and graph patterns at medium-to-hard difficulty under strict time limits.',
  },
  {
    title: 'Difficulty',
    body: 'High — comparable to Codeforces Div 2 B/C problems. Standard Infosys SE candidates are not expected to clear this; it is an elite fast-track path.',
  },
  {
    title: 'Preparation strategy',
    body: 'Practice 40+ medium problems on Codeforces/LeetCode, master DP and graph templates, and simulate 90-minute contest conditions weekly for eight weeks before the event.',
  },
] as const

export const INFOSYS_SE_TECHNICAL_TOPIC_CARDS = [
  {
    title: 'DSA',
    evaluates: 'Problem decomposition, correct complexity analysis, and clean implementation under time pressure.',
    mistakes: 'Jumping to code without approach, wrong Big-O, or skipping edge-case discussion.',
    tips: 'Practice arrays, strings, hashing, linked lists, and trees — narrate approach before every solution.',
  },
  {
    title: 'OOP',
    evaluates: 'Inheritance, polymorphism, encapsulation, and abstraction with language-specific examples (Java/Python).',
    mistakes: 'Textbook definitions without project examples, or confusing abstract class vs interface.',
    tips: 'Prepare one inheritance example and one design decision from your capstone project.',
  },
  {
    title: 'DBMS',
    evaluates: 'ACID properties, normalization, indexing, and transaction isolation — often via scenario questions.',
    mistakes: 'Mixing up isolation levels, or unable to explain why normalization reduces redundancy.',
    tips: 'Walk through a bank transfer for ACID; know 1NF–3NF with one table example each.',
  },
  {
    title: 'Operating Systems',
    evaluates: 'Processes vs threads, scheduling basics, deadlocks, and memory management at fresher depth.',
    mistakes: 'Confusing process and thread memory models, or vague deadlock answers without four conditions.',
    tips: 'Revise process states, mutex vs semaphore, and one real deadlock prevention technique.',
  },
  {
    title: 'Computer Networks',
    evaluates: 'OSI/TCP-IP layers, HTTP methods, and basic troubleshooting — Infosys frequently probes layers 3–4.',
    mistakes: 'Memorizing layer names without knowing which protocol belongs where (TCP vs UDP, IP routing).',
    tips: 'Use the OSI mnemonic and explain GET vs POST with idempotency and caching implications.',
  },
  {
    title: 'SQL',
    evaluates: 'JOINs, aggregations, subqueries, and basic indexing — often tied to project database work.',
    mistakes: 'Writing cartesian joins, confusing WHERE vs HAVING, or unable to explain query optimization.',
    tips: 'Practice 10 JOIN patterns and one GROUP BY with HAVING filter; know when indexes help.',
  },
] as const

export const INFOSYS_SE_APTITUDE_TOPICS = [
  {
    title: 'Quantitative aptitude',
    detail: 'Percentages, ratios, time-speed-distance, profit-loss, and number series. Accuracy under 60–90 second per question targets — use approximation for speed.',
  },
  {
    title: 'Logical reasoning',
    detail: 'Seating arrangements, blood relations, syllogisms, and pattern completion. Draw tables for arrangement problems; eliminate wrong options early.',
  },
  {
    title: 'Verbal ability',
    detail: 'Reading comprehension, sentence correction, para jumbles, and vocabulary in context. Read the question stem twice before selecting — InfyTQ penalizes careless errors.',
  },
] as const

export const INFOSYS_SE_APTITUDE_STRATEGY =
  'Block 45 minutes daily: 20 quant, 15 logical, 10 verbal. Track accuracy percentage weekly — aim for 80%+ before InfyTQ. On weak topics, drill 50 problems of one type before moving on.'

export const INFOSYS_SE_CODING_TOPICS = [
  {
    topic: 'Arrays',
    difficulty: 'Easy–Medium',
    timeManagement: 'Clarify constraints in 2 minutes; aim to finish easy array problems in 10–12 minutes with one test walkthrough.',
    mistakes: 'Off-by-one indices, not handling empty arrays, skipping complexity statement.',
  },
  {
    topic: 'Strings',
    difficulty: 'Easy–Medium',
    timeManagement: 'Use StringBuilder for loop concatenation; budget 15 minutes for medium string problems.',
    mistakes: 'O(n²) brute force when HashMap or two-pointer patterns apply.',
  },
  {
    topic: 'Hashing',
    difficulty: 'Medium',
    timeManagement: 'HashMap frequency and complement patterns solve many Infosys problems in O(n) — state the key choice aloud.',
    mistakes: 'Wrong hash key type, forgetting to handle duplicate keys in grouping problems.',
  },
  {
    topic: 'Linked lists',
    difficulty: 'Medium',
    timeManagement: 'Practice reverse and merge until pointer moves are fluent — 15–18 minutes for medium problems.',
    mistakes: 'Losing head reference, infinite loops in cycle detection.',
  },
  {
    topic: 'Sorting',
    difficulty: 'Easy–Medium',
    timeManagement: 'Know when built-in sort suffices vs custom comparator; explain stability and O(n log n) expectation.',
    mistakes: 'Implementing bubble sort when quicksort/mergesort awareness is enough; wrong comparator for objects.',
  },
] as const

export const INFOSYS_SE_HR_CARDS = [
  {
    title: 'Tell me about yourself',
    body: 'Structure: Background (30s) → Academic/project highlights (45s) → Why Infosys (30s). End with enthusiasm for learning and relocation flexibility.',
  },
  {
    title: 'Why Infosys?',
    body: 'Mention Springboard training, global client exposure, Cobalt digital practice, and ESG commitments — not generic “brand name” answers.',
  },
  {
    title: 'Strengths and weaknesses',
    body: 'Strength with evidence (project metric). Weakness as growth story with concrete improvement steps — avoid clichés like “perfectionist.”',
  },
  {
    title: 'Relocation and adaptability',
    body: 'Infosys centres: Bengaluru, Mysuru, Hyderabad, Pune, Chennai. Express genuine flexibility and cite hostel/internship adaptability examples.',
  },
] as const

export const INFOSYS_SE_RESUME_EXAMPLES = [
  {
    title: 'Project impact',
    bad: '“Built a college project using Java and MySQL.”',
    good: '“Shipped attendance-tracking web app used by 200+ students — cut manual record-keeping time 35% with automated reports and role-based access.”',
  },
  {
    title: 'Metrics',
    bad: '“Improved application performance.”',
    good: '“Reduced API response time from 480ms to 190ms by indexing slow SQL queries and caching frequent reads — 40% fewer DB round-trips per session.”',
  },
  {
    title: 'Technical depth',
    bad: '“Worked on DSA problems and OOP concepts.”',
    good: '“Implemented BFS shortest-path visualizer in Python with unit tests — explained O(V+E) complexity and demoed to 3 faculty reviewers.”',
  },
] as const

export const INFOSYS_SE_VS_TCS_ROWS = [
  ['Aptitude Difficulty', 'Moderate — InfyTQ quant + logical + verbal', 'Moderate–High — TCS NQT with strong aptitude weight'],
  ['Coding Difficulty', 'Medium — 1–2 easy/medium DSA problems', 'Medium — NQT coding + technical panel problems'],
  ['Communication Round', 'Dedicated HR round — relocation and fit', 'Combined tech + HR or separate MR round'],
  ['Interview Style', 'InfyTQ → coding test → tech → HR', 'NQT → technical → HR/MR'],
  ['Offer Process', '2–6 weeks; SP/Power Programmer tracks', '2–8 weeks; Ninja/Digital offer bands'],
] as const

export const INFOSYS_SE_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/companies/infosys/java-developer', label: 'Infosys Java Developer Questions' },
  { href: '/interview-questions/companies/infosys/python-developer', label: 'Infosys Python Developer Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Interview Questions' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Interview Questions' },
  { href: '/interview-questions/topics/dbms', label: 'DBMS Interview Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Interview Questions' },
  { href: '/interview-questions/topics/operating-systems', label: 'Operating System Interview Questions' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/interview-questions/companies/wipro/software-engineer', label: 'Wipro SWE Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
] as const

export const INFOSYS_SE_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'Aptitude + OOP',
    items: ['Daily quant + logical + verbal drills', 'Revise OOP with Java/Python examples', 'Complete 2 InfyTQ-style mock tests'],
  },
  {
    week: 'Week 2',
    focus: 'DSA + DBMS',
    items: ['20 medium problems (arrays, strings, hashing)', 'ACID, normalization, and JOIN revision', 'Practice 5 linked-list implementations'],
  },
  {
    week: 'Week 3',
    focus: 'OS + CN + SQL',
    items: ['Process/thread, deadlock, scheduling basics', 'OSI model and HTTP methods', '10 SQL query drills with indexing notes'],
  },
  {
    week: 'Week 4',
    focus: 'Mock Interviews + HR',
    items: ['Full Infosys-style tech + HR mocks', 'Why Infosys and weakness stories', 'Review expanded questions below with follow-ups'],
  },
] as const

export const INFOSYS_SE_FAQ_ITEMS = [
  {
    question: 'What is InfyTQ and is it mandatory for Infosys campus hiring?',
    answer:
      'InfyTQ is Infosys’s certification and learning platform for engineering students. Scoring 65%+ can shortlist you for System Engineer roles. Many campus drives treat InfyTQ as the first filter — prepare as if it is mandatory.',
  },
  {
    question: 'What is HackWithInfy and how is it different from InfyTQ?',
    answer:
      'HackWithInfy is a national competitive coding contest offering Power Programmer tracks (₹8–9 LPA) for top performers. InfyTQ is broader aptitude + technical certification; HackWithInfy targets elite coders with harder algorithmic problems.',
  },
  {
    question: 'How many rounds are in Infosys Software Engineer interviews?',
    answer:
      'Typically: application, InfyTQ or online assessment, coding assessment, one or two technical interviews, and an HR round. HackWithInfy winners may skip some stages but still face verification.',
  },
  {
    question: 'What technical topics does Infosys test for Software Engineer roles?',
    answer:
      'DSA, OOP, DBMS, operating systems, computer networks, and SQL — plus project discussion. Coding rounds focus on arrays, strings, hashing, linked lists, and sorting at easy-to-medium difficulty.',
  },
  {
    question: 'How difficult is the Infosys aptitude round?',
    answer:
      'Moderate for fresher drives — quant, logical reasoning, and verbal sections under time pressure. Weekly timed practice targeting 80%+ accuracy is the most reliable preparation approach.',
  },
  {
    question: 'How difficult is the Infosys coding round?',
    answer:
      'Usually easy-to-medium — one or two problems, not FAANG hard. Clean explanation, edge cases, and complexity analysis matter as much as working code.',
  },
  {
    question: 'Does Infosys ask system design to freshers?',
    answer:
      'Rarely at entry level. Focus on DSA, Core CS fundamentals, and project depth. Basic scalability awareness is a plus but not the primary filter.',
  },
  {
    question: 'What CGPA cutoff does Infosys use?',
    answer:
      'Commonly 6.5–7.5 depending on college tier and hiring season. Strong InfyTQ or HackWithInfy performance can offset borderline CGPA in some cases.',
  },
  {
    question: 'How should I answer “Why Infosys” in the HR round?',
    answer:
      'Combine Springboard training quality, global client exposure, Cobalt digital practice, and personal fit — relocation willingness and learning goals. Avoid generic brand-name answers.',
  },
  {
    question: 'Infosys vs TCS Software Engineer — which is harder?',
    answer:
      'Similar overall difficulty for fresher SE roles. Infosys emphasizes InfyTQ certification; TCS routes through NQT with strong aptitude weight. Compare both processes before committing to one study plan.',
  },
  {
    question: 'How long does the Infosys offer process take?',
    answer:
      'Typically 2–6 weeks from final HR round to offer letter, depending on batch scheduling and background verification.',
  },
  {
    question: 'Can I prepare for Infosys and TCS SE interviews together?',
    answer:
      'Yes — aptitude, DSA, OOP, DBMS, OS, CN, and SQL overlap heavily. Add company-specific mocks: InfyTQ patterns for Infosys and NQT for TCS in the final week.',
  },
] as const

/**
 * Audit status (2026-06-05):
 * PRODUCTION READY — editorial hub, fresher selection criteria, project discussion, hero + process diagram, E-E-A-T aside.
 * SEO READY — canonical, index/follow, Article/FAQPage/BreadcrumbList/ItemList/@graph JSON-LD, 25+ contextual internal links.
 * INDEXING READY — isIntersectionIndexable(infosys, software-engineer); sitemap + IndexNow eligible.
 */
