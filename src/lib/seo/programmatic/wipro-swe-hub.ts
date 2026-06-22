import type { SeoQuestion } from './types'

export const WIPRO_SWE_HERO_PATH = '/blog/wipro-software-engineer-hero.webp'
export const WIPRO_SWE_HERO_ALT =
  'Wipro Software Engineer interview preparation guide 2026 — NLTH online test, DSA coding, OOP, DBMS, OS, project discussion, and HR interview for engineering roles in India'
export const WIPRO_SWE_HERO_WIDTH = 1536
export const WIPRO_SWE_HERO_HEIGHT = 1024

export const WIPRO_SWE_PROCESS_PATH = '/blog/wipro-software-engineer-process-2026.webp'
export const WIPRO_SWE_PROCESS_ALT =
  'Wipro Software Engineer interview process flow 2026: Application, NLTH Online Test, Technical Interview, HR Round, and Offer'
export const WIPRO_SWE_PROCESS_WIDTH = 1672
export const WIPRO_SWE_PROCESS_HEIGHT = 941

export const WIPRO_SWE_META_TITLE = 'Wipro Software Engineer Interview Questions and Answers (2026)'
export const WIPRO_SWE_CANONICAL_PATH = '/interview-questions/companies/wipro/software-engineer'
export const WIPRO_SWE_DESCRIPTION =
  'Wipro Software Engineer interview questions for India 2026: NLTH, DSA, OOP, DBMS, SQL, salary ranges, 30-day roadmap, and expert sample answers.'
export const WIPRO_SWE_EDITORIAL_NOTE =
  'Content reviewed and updated for current Wipro Software Engineer hiring patterns — NLTH online assessment, fresher eligibility, DSA and Core CS technical depth, project discussion, HR evaluation, and ILP placement expectations in India.'
export const WIPRO_SWE_READING_TIME = '24 min read'
export const WIPRO_SWE_PUBLISHED_DATE = '2026-05-21'
export const WIPRO_SWE_LAST_UPDATED = '2026-06-23'
export const WIPRO_SWE_REVIEWED_DATE = '2026-06-23'
export const WIPRO_SWE_AUTHOR_NAME = 'InterviewEra Team'
export const WIPRO_SWE_REVIEWER_NAME = 'InterviewEra Editorial'

export const WIPRO_SWE_TOC_SECTIONS = [
  { id: 'wipro-swe-overview', label: 'What Wipro Asks SWE Candidates' },
  { id: 'wipro-swe-hiring-process', label: 'Wipro Hiring Process' },
  { id: 'wipro-swe-eligibility', label: 'Eligibility Criteria' },
  { id: 'wipro-swe-interview-pattern', label: 'Interview Pattern' },
  { id: 'wipro-swe-skills-tested', label: 'Skills Tested' },
  { id: 'wipro-swe-2026-trends', label: '2026 Hiring Trends' },
  { id: 'wipro-swe-question-categories', label: 'Question Categories' },
  { id: 'wipro-swe-company-insights', label: 'Company Insights' },
  { id: 'wipro-swe-salary', label: 'Salary Guide' },
  { id: 'wipro-swe-questions', label: 'Interview Questions' },
  { id: 'wipro-swe-roadmap', label: '30-Day Roadmap' },
  { id: 'wipro-swe-mistakes', label: 'Common Mistakes' },
  { id: 'wipro-swe-checklist', label: 'Last-Minute Checklist' },
  { id: 'wipro-swe-resources', label: 'Recommended Resources' },
  { id: 'wipro-swe-vs-peers', label: 'Wipro vs TCS vs Infosys' },
  { id: 'wipro-swe-faq', label: 'FAQs' },
  { id: 'wipro-swe-mock-cta', label: 'Practice Mock Interview' },
  { id: 'wipro-swe-related', label: 'Related Guides' },
] as const

export const WIPRO_SWE_HIRING_STEPS = [
  {
    step: 'Step 1 — Application & resume screening',
    body: 'Register on Wipro careers or campus portal. Recruiters scan for DSA practice evidence, capstone or internship projects, CGPA, and hackathon participation. Highlight measurable engineering outcomes — features shipped, bugs fixed, performance gains — not generic “good academic record” lines.',
  },
  {
    step: 'Step 2 — NLTH (National Level Talent Hunt) online test',
    body: 'Timed assessment covering aptitude (quant, logical, verbal) and technical MCQs (programming logic, OOP, DBMS, CN basics). Many drives include one or two easy coding problems. Strong NLTH scores shortlist candidates for live technical panels — weak aptitude eliminates strong coders early.',
  },
  {
    step: 'Step 3 — Technical interview',
    body: 'Live round probing DSA (easy to medium), OOP, DBMS/SQL, OS, CN, and deep project discussion. Panels expect narrated problem-solving — approach before code, edge cases, and complexity. Fresher difficulty is fundamentals-heavy, not competitive-programming extremes.',
  },
  {
    step: 'Step 4 — HR round (often combined with technical)',
    body: 'Communication, relocation flexibility, salary expectations, and “why Wipro.” Research Wipro’s digital engineering practice, Topcoder partnership, and client industries. STAR-format project stories strengthen HR performance.',
  },
  {
    step: 'Step 5 — Offer',
    body: 'Selected candidates receive offer with role band and CTC (typically ₹3.5–7 LPA for fresher SWE tracks depending on college tier and NLTH percentile), joining location, and ILP training details. Confirm fixed vs variable split before accepting.',
  },
] as const

export const WIPRO_SWE_ELIGIBILITY_CARDS = [
  {
    title: 'Educational background',
    body: 'B.Tech/B.E. (CS/IT/ECE/EEE), MCA, or B.Sc. Computer Science. Wipro hires SWE profiles from engineering backgrounds for campus and off-campus drives. Relevant internships and GitHub projects strengthen shortlists.',
  },
  {
    title: 'CGPA cutoff',
    body: 'Commonly 60–65% aggregate (or 6.0+ CGPA) with no active backlogs. Strong NLTH scores or a substantive capstone project can offset borderline academics in some seasons.',
  },
  {
    title: 'Core skills',
    body: 'DSA (arrays, strings, linked lists, trees basics), OOP, DBMS/SQL, OS and CN fundamentals, Java or Python fluency, Git basics, and Agile awareness. System design depth is rare at fresher level.',
  },
  {
    title: 'Experience level',
    body: 'Freshers via NLTH are the primary entry path. Lateral hires (1–3 years) face deeper coding, framework, and client-delivery questions with higher salary bands.',
  },
  {
    title: 'Freshers vs experienced',
    body: 'Freshers: NLTH + fundamentals + project walkthrough. Experienced: module ownership, debugging production issues, and framework depth. Both tracks value clear communication over memorized definitions.',
  },
] as const

export const WIPRO_SWE_INTERVIEW_ROUNDS = [
  {
    round: 'NLTH Online Test',
    duration: '60–90 min',
    format: 'Aptitude + technical MCQs + optional coding',
    evaluates: 'Speed, accuracy, programming logic, and elimination before live panels.',
  },
  {
    round: 'Technical Interview',
    duration: '45–60 min',
    format: 'DSA, Core CS, SQL, project deep-dive',
    evaluates: 'Problem-solving narration, fundamentals depth, and resume authenticity.',
  },
  {
    round: 'HR / Managerial',
    duration: '15–25 min',
    format: 'Behavioral + fit + relocation + salary',
    evaluates: 'Communication, adaptability, motivation for Wipro, and professional attitude.',
  },
] as const

export const WIPRO_SWE_SKILL_CARDS = [
  { skill: 'DSA / Coding', weight: 'High', detail: 'Arrays, strings, two-pointer, sliding window, linked lists, trees basics. Easy-medium difficulty with narrated approach.' },
  { skill: 'OOP', weight: 'High', detail: 'Encapsulation, inheritance, polymorphism, abstraction with Java or C++ examples. Design trade-offs over textbook definitions.' },
  { skill: 'DBMS / SQL', weight: 'High', detail: 'Normalization, JOINs, indexing basics, ACID properties. Expect one live or verbal SQL query.' },
  { skill: 'Operating Systems', weight: 'Medium', detail: 'Process vs thread, deadlock, scheduling, memory management basics.' },
  { skill: 'Computer Networks', weight: 'Medium', detail: 'TCP vs UDP, HTTP methods, REST basics, DNS and IP layer awareness.' },
  { skill: 'Java / Python', weight: 'Medium–High', detail: 'Language syntax, collections, exception handling, and project stack alignment.' },
  { skill: 'Git', weight: 'Low–Medium', detail: 'Branching, pull requests, merge conflict resolution on team projects.' },
  { skill: 'Agile / Scrum', weight: 'Medium', detail: 'Sprint ceremonies, definition of done, and developer role in client delivery.' },
  { skill: 'System design basics', weight: 'Low', detail: 'High-level API and DB schema discussion on capstone — not distributed systems at fresher level.' },
  { skill: 'Communication', weight: 'High', detail: 'Explaining code aloud, summarizing projects in two minutes, and structured HR answers.' },
] as const

export const WIPRO_SWE_2026_TRENDS = [
  { title: 'NLTH remains the primary fresher gate', body: 'Campus and mass-hiring drives still route through NLTH. Aptitude plus technical MCQ accuracy has increased — weak fundamentals eliminate candidates before live coding rounds.' },
  { title: 'Project depth over LeetCode grind', body: 'Wipro panels increasingly probe capstone architecture, your specific contributions, and trade-offs — not only isolated algorithm puzzles.' },
  { title: 'Combined technical + HR rounds', body: 'Many drives compress technical and HR into one session. Prepare DSA answers and “why Wipro” in the same mock — stamina matters.' },
  { title: 'Cloud and API awareness', body: 'Mention REST APIs, basic AWS/Azure exposure, or CI/CD hooks from projects. Full cloud architecture depth is not expected for freshers.' },
] as const

export const WIPRO_SWE_QUESTION_CATEGORIES = [
  { category: 'DSA / Algorithms', count: '3 questions', focus: 'Stack/queue, binary search, two-sum pattern' },
  { category: 'Core CS', count: '4 questions', focus: 'OOP, deadlock, TCP/UDP, process vs thread' },
  { category: 'DBMS / SQL', count: '1 question', focus: 'INNER vs LEFT JOIN' },
  { category: 'Behavioral', count: '2 questions', focus: 'Deadline STAR, learning agility' },
  { category: 'Situational', count: '1 question', focus: 'Pre-release production bug' },
  { category: 'HR', count: '2 questions', focus: 'Why Wipro, company research' },
  { category: 'Project', count: '1 question', focus: 'Capstone walkthrough' },
] as const

export const WIPRO_SWE_COMPANY_INSIGHTS = [
  { title: 'Engineering practice & delivery', body: 'Wipro’s digital engineering practice spans application development, cloud migration, and maintenance for BFSI, healthcare, retail, and telecom clients. SWEs often work in blended onshore-offshore Agile teams with sprint deadlines.' },
  { title: 'Types of projects', body: 'Typical engagements: enterprise web apps, API modernization, ERP integrations, test automation support, and cloud lift-and-shift. Fresher projects start with supervised feature development and bug fixes under senior mentorship.' },
  { title: 'Tech stack', body: 'Java/Spring, .NET, Python, Angular/React on client projects, SQL Server or Oracle, Jenkins/GitLab CI, and Jira for sprint tracking. Stack varies by account — adaptability matters more than one-language loyalty.' },
  { title: 'Work culture', body: 'Service-delivery model with client reporting, documentation standards, and relocation flexibility. ILP (Initial Learning Program) trains freshers before project allocation.' },
  { title: 'Career progression', body: 'Project Engineer → Senior Engineer → Team Lead → Project Manager / Architect. Certifications (cloud, architecture) and consistent delivery accelerate promotion in Wipro engineering tracks.' },
] as const

export const WIPRO_SWE_SALARY_TIERS = [
  { title: 'Fresher / campus', range: '₹3.5–7 LPA', note: 'NLTH campus offers vary by college tier and role band. Strong NLTH percentile and internship experience push toward upper band.', tier: 'entry' as const },
  { title: '1–3 years', range: '₹6–11 LPA', note: 'Independent module ownership, client-facing demos, and framework fluency expected.', tier: 'mid' as const },
  { title: 'Senior SWE (3–5 years)', range: '₹10–16 LPA', note: 'Leads technical decisions for modules, mentors juniors, owns release quality.', tier: 'senior' as const },
  { title: 'Lead / Architect', range: '₹14–22+ LPA', note: 'Solution design, cross-team coordination, and account-level technical ownership. Varies by city and client.', tier: 'lead' as const },
] as const

export const WIPRO_SWE_ROADMAP_WEEKS = [
  { week: 'Week 1', focus: 'DSA + aptitude', items: ['Arrays, strings, two-pointer daily', 'Stack, queue, binary search revision', 'Daily NLTH aptitude drills (quant + logical)'] },
  { week: 'Week 2', focus: 'Core CS + SQL', items: ['OOP, OS, CN concept cards', 'INNER/LEFT JOIN and one ranking SQL query', 'Practice 2 NLTH-style technical MCQ mocks'] },
  { week: 'Week 3', focus: 'Projects + coding', items: ['Capstone architecture one-pager', '5 easy-medium coding problems timed', 'STAR stories for deadline and learning agility'] },
  { week: 'Week 4', focus: 'Mocks + HR', items: ['Why Wipro SWE + relocation answer', 'Full project walkthrough rehearsal', 'Combined technical + HR mock on InterviewEra'] },
] as const

export const WIPRO_SWE_MISTAKES = [
  'Ignoring NLTH aptitude — strong DSA alone cannot save a failed online assessment.',
  'Silent coding without narrating approach, complexity, and edge cases.',
  'Listing OOP pillars without concrete class examples.',
  'Unable to explain your capstone architecture under follow-up probing.',
  'Claiming full project credit for team work without stating your specific modules.',
  'Weak SQL — JOIN confusion is a common elimination reason.',
  'Rambling HR answers without Wipro-specific research.',
  'Overstating LeetCode count but failing easy warm-up problems.',
  'No plan for production bug scenario — heroics without communication.',
  'Memorizing TCP definitions without mapping to real protocol choices.',
  'Skipping Git basics when resume lists team projects.',
  'Copying generic SWE answers without Wipro/NLTH context.',
] as const

export const WIPRO_SWE_CHECKLIST = [
  'NLTH registration confirmed with correct academic details',
  'Resume lists tech stack, project modules owned, and quantified outcomes',
  '5 DSA problems rehearsed with complexity stated aloud',
  'OOP four pillars with one example each ready',
  'One SQL JOIN query and one ranking query practiced',
  'Capstone walkthrough under 3 minutes with follow-up prep',
  'STAR deadline story with measurable delivery outcome',
  '“Why Wipro SWE” answer with digital engineering research',
  'TCP vs UDP and process vs thread answers crisp',
  'Salary range researched (₹3.5–7 LPA fresher band) with flexible framing',
] as const

export const WIPRO_SWE_VS_PEER_ROWS = [
  ['Entry assessment', 'NLTH (aptitude + technical MCQs + coding)', 'TCS NQT (strong aptitude)', 'InfyTQ + HackWithInfy'],
  ['Coding difficulty', 'Easy to medium', 'Easy to medium', 'Easy to medium'],
  ['Core CS weight', 'High — OOP, DBMS, OS, CN', 'High', 'High'],
  ['Project discussion', 'Deep — ownership probed', 'Moderate to deep', 'Deep'],
  ['Typical fresher package', '₹3.5–7 LPA SWE band', '₹3.3–7 LPA (track dependent)', '₹3.6–9 LPA (track dependent)'],
  ['Interview difficulty', 'Easy to medium', 'Easy to medium', 'Easy to medium'],
] as const

export const WIPRO_SWE_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Interview Questions' },
  { href: '/interview-questions/topics/dsa', label: 'DSA Interview Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Interview Questions' },
  { href: '/interview-questions/companies/wipro/java-developer', label: 'Wipro Java Developer Questions' },
  { href: '/interview-questions/companies/wipro/data-analyst', label: 'Wipro Data Analyst Questions' },
  { href: '/interview-questions/companies/wipro/qa-engineer', label: 'Wipro QA Engineer Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions Hub' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Tips' },
  { href: '/blog/top-dsa-interview-questions', label: 'Top DSA Questions' },
  { href: '/tools/question-generator', label: 'AI Question Generator' },
  { href: '/signup', label: 'Free Mock Interview' },
] as const

export const WIPRO_SWE_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Questions' },
  { href: '/interview-questions/companies/wipro/java-developer', label: 'Wipro Java Questions' },
  { href: '/interview-questions/companies/wipro/data-analyst', label: 'Wipro DA Questions' },
  { href: '/interview-questions/companies/wipro/qa-engineer', label: 'Wipro QA Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Company Hub' },
  { href: '/interview-questions/topics/dsa', label: 'DSA Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Questions' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/interview-questions/companies/infosys/software-engineer', label: 'Infosys SWE Questions' },
] as const

export const WIPRO_SWE_FAQ_ITEMS = [
  { question: 'What does Wipro ask in Software Engineer interviews?', answer: 'Wipro SWE interviews typically cover NLTH online assessment (aptitude + technical MCQs + optional coding), live DSA and Core CS questions (OOP, DBMS, OS, CN), SQL probes, capstone project discussion, and HR fit questions. Fresher drives emphasize fundamentals over advanced system design.' },
  { question: 'Is coding mandatory for Wipro SWE freshers?', answer: 'Yes. NLTH often includes coding or pseudocode, and technical rounds probe easy-to-medium DSA with narrated problem-solving. You do not need competitive-programming mastery — clean fundamentals and communication matter more.' },
  { question: 'What is NLTH and is it mandatory for Wipro SWE?', answer: 'NLTH (National Level Talent Hunt) is Wipro’s online assessment for campus and off-campus fresher drives. It includes aptitude, technical MCQs, and sometimes coding. Most SWE campus shortlists treat NLTH as mandatory.' },
  { question: 'How many rounds are in Wipro Software Engineer interviews?', answer: 'Typically three: NLTH online test, technical interview (DSA + Core CS + project), and HR round — sometimes combined into one live session for off-campus hires.' },
  { question: 'What is the salary for Wipro Software Engineer freshers?', answer: 'Fresher campus offers typically range ₹3.5–7 LPA depending on college tier and NLTH performance. With 1–3 years experience, expect ₹6–11 LPA. Senior and lead roles reach ₹10–22+ LPA depending on city and client account.' },
  { question: 'Can freshers crack Wipro SWE interviews?', answer: 'Yes. NLTH is designed for mass fresher hiring. Strong aptitude, DSA fundamentals, a quantified capstone project, and clear communication are the primary success factors.' },
  { question: 'Wipro vs TCS SWE — which is harder?', answer: 'Similar overall difficulty for fresher SWE roles. Wipro routes through NLTH; TCS uses NQT with strong aptitude weight. Both test DSA and Core CS fundamentals — compare both processes if applying to multiple employers.' },
  { question: 'Is system design asked at Wipro for freshers?', answer: 'Rarely in depth. Fresher panels may ask high-level capstone architecture — API layers, database schema, deployment basics. Full distributed system design is expected only for senior lateral hires.' },
  { question: 'Which language should I prepare — Java or Python?', answer: 'Match your resume and capstone stack. Wipro client projects use Java, .NET, and Python widely. Consistency matters — do not claim Java expertise if your projects are all Python without justification.' },
  { question: 'What projects should I prepare?', answer: 'Prepare one capstone or internship where you owned specific modules, can draw architecture, explain trade-offs, and quantify outcomes (users, latency, bugs fixed). Panels probe ownership, not tutorial clones.' },
  { question: 'Does Wipro combine technical and HR rounds?', answer: 'Yes, frequently. Many drives use a single combined session covering DSA questions followed by HR fit and relocation discussion. Practice sustained communication across both.' },
  { question: 'How important is SQL for Wipro SWE?', answer: 'Very important. Expect JOIN questions, basic normalization, and sometimes a live query. SQL weakness eliminates otherwise strong coders in service-company panels.' },
  { question: 'What DSA topics matter most?', answer: 'Arrays, strings, two-pointer, sliding window, linked lists, stacks/queues, binary search, and basic trees. Focus on easy-medium with clean narration and complexity analysis.' },
  { question: 'How do I prepare for Wipro SWE in 30 days?', answer: 'Week 1: DSA + aptitude. Week 2: Core CS + SQL. Week 3: projects + timed coding. Week 4: STAR stories, Why Wipro, and full mocks. Follow the week-by-week roadmap in this guide.' },
  { question: 'What is Wipro ILP?', answer: 'Initial Learning Program — structured training for freshers before project allocation. Covers technology fundamentals, soft skills, and client-readiness. Mention ILP positively in “why Wipro” answers.' },
  { question: 'How long until offer after final round?', answer: 'Typically 2–6 weeks from final HR round to offer letter, depending on batch scheduling and background verification. Off-campus drives may take longer during low-hiring seasons.' },
  { question: 'Are CGPA cutoffs strict at Wipro?', answer: 'Commonly 60–65% aggregate or 6.0+ CGPA with no active backlogs. Cutoffs vary by college tier. Strong NLTH scores or internships can offset borderline academics in some drives.' },
  { question: 'What should I say for “Why Wipro”?', answer: 'Anchor on multi-industry project exposure, ILP training structure, digital engineering practice, and your fit — e.g. capstone stack alignment and willingness to relocate. Avoid generic MNC praise without specifics.' },
] as const

export const WIPRO_SWE_QUESTIONS: readonly SeoQuestion[] = [
  {
    question: 'What is the difference between a stack and a queue? Where would you use each?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Foundational data-structure question in almost every Wipro SWE technical round — tests CS basics before harder DSA.',
    evaluates: 'LIFO vs FIFO understanding and ability to map structures to real engineering scenarios.',
    strategy: 'Define both, give one production example each, mention O(1) push/pop operations.',
    expertAnswer: 'A stack follows LIFO — last in, first out. Use for undo/redo, browser back navigation, and DFS. A queue follows FIFO — first in, first out. Use for job scheduling, print spooling, and BFS. Both support O(1) operations with proper implementations.',
    mistakes: 'Mixing up ordering, giving only textbook definitions, or skipping use cases.',
    followUps: ['Implement queue using two stacks?', 'BFS vs DFS — which uses which?'],
    tip: 'Undo/redo for stack; print queue for queue.',
    keywords: ['LIFO', 'FIFO', 'stack', 'queue'],
  },
  {
    question: 'What is the time complexity of binary search and what is its prerequisite?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Binary search probes algorithmic thinking and complexity clarity — common warm-up before live coding at Wipro.',
    evaluates: 'Big-O fluency and understanding of preconditions for algorithm correctness.',
    strategy: 'State O(log n), mention sorted input, explain halving search space with one example.',
    expertAnswer: 'Binary search runs in O(log n) because each comparison eliminates half the search space. Prerequisite: data must be sorted in the search order. Use overflow-safe midpoint: left + (right - left) / 2. Space is O(1) iterative, O(log n) recursive.',
    mistakes: 'Forgetting sorted prerequisite, wrong midpoint, or not discussing duplicates.',
    followUps: ['Find first occurrence in duplicates?', 'Binary search on answer space?'],
    tip: 'Always state sorted array requirement first.',
    keywords: ['O(log n)', 'sorted array', 'binary search'],
  },
  {
    question: 'Explain the four pillars of Object-Oriented Programming with one example each.',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '3 min',
    whyAsked: 'OOP is core to Wipro Java/.NET client projects — panels reject definition-only answers.',
    evaluates: 'Foundational OOP understanding with practical class-design examples.',
    strategy: 'Name each pillar in order with one short class example — BankAccount or PaymentGateway works well.',
    expertAnswer: 'Encapsulation: private fields with public methods (BankAccount with deposit/withdraw). Inheritance: SavingsAccount extends BankAccount. Polymorphism: processPayment() behaves differently for UPI vs Card. Abstraction: PaymentGateway interface hiding provider implementation details.',
    mistakes: 'Confusing abstraction with encapsulation, or no concrete examples.',
    followUps: ['Composition vs inheritance?', 'Method overriding vs overloading?'],
    tip: 'One crisp example per pillar beats long definitions.',
    keywords: ['encapsulation', 'inheritance', 'polymorphism', 'abstraction'],
  },
  {
    question: 'What is a deadlock? State the four conditions required for it to occur.',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2–3 min',
    whyAsked: 'Concurrency fundamentals appear in OS rounds and multi-threaded project follow-ups at Wipro.',
    evaluates: 'Coffman conditions knowledge and practical prevention awareness.',
    strategy: 'Define deadlock, list all four conditions, add lock ordering as prevention.',
    expertAnswer: 'Deadlock: threads wait forever, each holding a resource another needs. Coffman conditions: mutual exclusion, hold and wait, no preemption, circular wait. Prevent via lock ordering, timeouts, or reducing nested locks in production services.',
    mistakes: 'Missing a Coffman condition or no prevention strategy.',
    followUps: ['Deadlock vs starvation?', 'How detect deadlock in Java?'],
    tip: 'List all four Coffman conditions — missing one fails the answer.',
    keywords: ['deadlock', 'Coffman', 'circular wait'],
  },
  {
    question: 'What is the difference between TCP and UDP? When would you choose each?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2–3 min',
    whyAsked: 'Networking trade-offs matter for API-heavy Wipro client projects — tests practical judgment.',
    evaluates: 'Reliability vs latency reasoning for real systems.',
    strategy: 'Compare reliability and ordering, map TCP to payments/APIs and UDP to real-time streams.',
    expertAnswer: 'TCP: connection-oriented, reliable, ordered delivery — use for HTTP APIs, payments, file transfer. UDP: connectionless, lower overhead, tolerates loss — use for live video, gaming, DNS. Mention handshake overhead for TCP.',
    mistakes: 'Saying UDP is always faster without caveats, or no scenario-based justification.',
    followUps: ['Why HTTP/3 uses QUIC over UDP?', 'TCP three-way handshake?'],
    tip: 'Map each protocol to one concrete scenario.',
    keywords: ['TCP', 'UDP', 'reliability', 'latency'],
  },
  {
    question: 'Describe the difference between process and thread. What are the pros and cons of multithreading?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked: 'OS fundamentals and concurrency trade-offs — common in Core CS blocks at Wipro.',
    evaluates: 'Memory model understanding and multithreading risk awareness.',
    strategy: 'Contrast isolated process memory vs shared thread memory, then one pro and one con with mitigation.',
    expertAnswer: 'Process: isolated memory space. Thread: lightweight unit sharing process memory. Multithreading pros: better throughput and responsiveness for I/O workloads. Cons: race conditions, deadlocks, harder debugging. Mitigate with thread pools, immutability, and synchronization.',
    mistakes: 'Claiming threads are always better, ignoring race conditions.',
    followUps: ['When prefer multiprocessing?', 'Context switch cost comparison?'],
    tip: 'Emphasize shared memory = concurrency risks.',
    keywords: ['process', 'thread', 'race condition'],
  },
  {
    question: 'What is the difference between INNER JOIN and LEFT JOIN?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'SQL JOIN fluency is a top elimination filter in Wipro SWE panels — service companies rely on database-heavy apps.',
    evaluates: 'Relational query understanding and NULL handling for non-matching rows.',
    strategy: 'INNER = matching rows only. LEFT = all left rows with NULLs for non-matches. Draw mental Venn diagram.',
    expertAnswer: 'INNER JOIN returns only rows where the join condition matches in both tables. LEFT JOIN returns all rows from the left table; non-matching right columns are NULL. Use LEFT JOIN when you need to preserve all records from the primary table (e.g. all customers even without orders).',
    mistakes: 'Confusing LEFT with RIGHT, or unable to explain NULL behavior.',
    followUps: ['When use RIGHT JOIN?', 'INNER JOIN with WHERE vs ON?'],
    tip: 'Mental Venn diagram — INNER is intersection, LEFT keeps all left rows.',
    keywords: ['INNER JOIN', 'LEFT JOIN', 'NULL'],
  },
  {
    question: 'Given an array of integers, how would you find two numbers that sum to a target?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '4–5 min',
    whyAsked: 'Two-sum pattern is the most common live coding problem in Wipro NLTH and technical rounds.',
    evaluates: 'Hash map thinking, complexity analysis, and edge-case handling.',
    strategy: 'Brute force O(n²) first, then optimize with hash map O(n). State approach before coding.',
    expertAnswer: 'Optimal: iterate with a hash map storing value → index. For each element x, check if (target - x) exists in map; if yes return indices. O(n) time, O(n) space. Handle duplicates and negative numbers. Mention why brute force O(n²) is insufficient at scale.',
    mistakes: 'Silent coding, wrong index handling with duplicates, or no complexity stated.',
    followUps: ['Three-sum variant?', 'Sorted array two-pointer approach?'],
    tip: 'Narrate brute force then hash map optimization.',
    keywords: ['two sum', 'hash map', 'O(n)'],
  },
  {
    question: 'Tell me about a time you had to meet a tight deadline. How did you prioritise?',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked: 'Client delivery deadlines are daily reality at Wipro — STAR format tests execution under pressure.',
    evaluates: 'Prioritization, communication, and delivery discipline.',
    strategy: 'STAR: must-have vs nice-to-have split, early blocker escalation, working subset delivered on time.',
    expertAnswer: 'Example: capstone demo in three days after scope change. I split features into must-have vs nice-to-have, aligned with mentor on thin vertical slice, assigned API/UI/test owners, shipped core flow first, sent progress updates every few hours. Demoed on time with zero critical bugs.',
    mistakes: 'Heroics without communication, or no concrete prioritization framework.',
    followUps: ['What did you defer?', 'How did you handle team disagreement?'],
    tip: 'STAR format with measurable delivery outcome.',
    keywords: ['STAR', 'prioritisation', 'deadline'],
  },
  {
    question: 'Describe a situation where you had to learn a new technology quickly.',
    category: 'behavioral',
    difficulty: 'easy',
    answerTime: '2–3 min',
    whyAsked: 'Wipro ILP and client projects require rapid stack switching — learning agility is a hiring signal.',
    evaluates: 'Self-study process and time-to-productivity.',
    strategy: 'Docs → small POC → iterate on real task. Mention how quickly you became productive.',
    expertAnswer: 'When our capstone needed React after Java backend-only experience, I spent day one on official docs and a todo POC, day two integrating one API screen, day three refactoring with component patterns. Shipped the dashboard module in five days and became the team’s frontend point person.',
    mistakes: 'Vague “I am a fast learner” without process or timeline.',
    followUps: ['What resource did you use first?', 'How did you validate understanding?'],
    tip: 'Show learning process: docs, POC, production use.',
    keywords: ['learning agility', 'adaptability'],
  },
  {
    question: 'If you discovered a critical bug in production right before a major release, what would you do?',
    category: 'situational',
    difficulty: 'hard',
    answerTime: '3 min',
    whyAsked: 'Release judgment under pressure — mirrors Wipro client sprint deadlines and production support scenarios.',
    evaluates: 'Escalation discipline, risk communication, and team-first thinking.',
    strategy: 'Assess severity → notify lead immediately → rollback vs hotfix decision with team — no solo heroics.',
    expertAnswer: 'Assess severity and blast radius immediately. Notify tech lead and PM with repro steps and affected users. Recommend rollback if data integrity is at risk. Document incident timeline. Never deploy unauthorized hotfixes — the team decides release go/no-go based on evidence.',
    mistakes: 'Fixing silently, downplaying severity, or no escalation path.',
    followUps: ['What if rollback is expensive?', 'Post-incident review steps?'],
    tip: 'Communicate first — structured incident response beats heroics.',
    keywords: ['incident response', 'rollback', 'escalation'],
  },
  {
    question: 'Walk me through your capstone or internship project. What was your role?',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '4 min',
    whyAsked: 'Wipro panels verify project ownership — tutorial clones fail under architecture and contribution follow-ups.',
    evaluates: 'Technical depth, ownership clarity, and trade-off reasoning.',
    strategy: 'Problem → your modules → tech stack → challenges → measurable outcome. Be honest about team scope.',
    expertAnswer: 'Structure: “Built X for Y users. I owned authentication API and PostgreSQL schema — chose JWT over sessions for stateless scaling. Reduced login latency 40% via indexing. If rebuilt, I would add integration tests earlier.” Prepare module-level follow-ups.',
    mistakes: 'Cannot explain architecture, or claiming full team credit.',
    followUps: ['Why that database choice?', 'What would you improve?'],
    tip: 'Quantify outcome — users, latency, bugs fixed.',
    keywords: ['project discussion', 'architecture', 'ownership'],
  },
  {
    question: 'Why do you want to join Wipro as a Software Engineer?',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'HR and combined rounds test motivation, relocation fit, and company research depth.',
    evaluates: 'Genuine interest, relocation willingness, and structured communication.',
    strategy: 'Wipro digital engineering scale + ILP + industry exposure + your stack fit. Avoid generic brand praise.',
    expertAnswer: 'Anchor on Wipro’s multi-industry project exposure, structured ILP training, opportunity to grow from fundamentals to client-facing delivery, and alignment with my capstone stack. Tie to year-one goal — e.g. deepening Spring or cloud skills on enterprise accounts. Confirm relocation flexibility.',
    mistakes: 'Generic MNC answer, no Wipro-specific research, or sounding uncommitted.',
    followUps: ['Willing to relocate?', 'Salary expectations?'],
    tip: 'Mention ILP and one Wipro digital initiative by name.',
    keywords: ['why Wipro', 'HR interview', 'ILP'],
  },
  {
    question: 'Why do you want to work at Wipro? What do you know about us?',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Tests company research — generic answers are penalized in Wipro HR and combined rounds.',
    evaluates: 'Preparation quality and credible motivation.',
    strategy: 'Name Wipro digital engineering, Topcoder partnership, client industries, and connect to your career plan.',
    expertAnswer: 'Wipro is a global IT services leader with strong digital engineering and cloud practices across BFSI, healthcare, and retail. I know about the Initial Learning Program for structured fresher onboarding and Topcoder for competitive engineering culture. I want Wipro because it offers enterprise project exposure early in my career while I build depth in Java and cloud — matching my capstone and long-term architect goal.',
    mistakes: 'Only citing brand name, wrong facts, or no personal career link.',
    followUps: ['Which Wipro practice interests you?', 'Recent Wipro news you followed?'],
    tip: 'Research ILP, digital engineering, and one client industry.',
    keywords: ['company research', 'Wipro', 'motivation'],
  },
]

export function isWiproSoftwareEngineerHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'wipro' && roleSlug === 'software-engineer'
}
