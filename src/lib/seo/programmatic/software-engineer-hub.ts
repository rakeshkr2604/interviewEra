export const SOFTWARE_ENGINEER_HERO_PATH = '/blog/software-engineer-hero.webp'
export const SOFTWARE_ENGINEER_HERO_ALT =
  'Software Engineer career roadmap 2026 — programming basics through DSA, OOPs, DBMS, system design, behavioral rounds, mock interviews, and offer. Target companies: Amazon, Microsoft, Google, Infosys, TCS, Wipro.'
export const SOFTWARE_ENGINEER_HERO_WIDTH = 1024
export const SOFTWARE_ENGINEER_HERO_HEIGHT = 682

export const SOFTWARE_ENGINEER_HERO_VISUAL_TITLE = 'Software Engineer Career Roadmap 2026'

export const SOFTWARE_ENGINEER_HERO_ROADMAP_STEPS = [
  { label: 'Programming Basics', icon: 'code' as const },
  { label: 'DSA', icon: 'dsa' as const },
  { label: 'OOPs', icon: 'oop' as const },
  { label: 'DBMS', icon: 'dbms' as const },
  { label: 'System Design', icon: 'design' as const },
  { label: 'Behavioral', icon: 'behavioral' as const },
  { label: 'Mock Interviews', icon: 'mock' as const },
  { label: 'Offer', icon: 'offer' as const },
] as const

export const SOFTWARE_ENGINEER_HERO_COMPANIES = [
  { name: 'Amazon', mark: 'a', accent: '#FF9900' },
  { name: 'Microsoft', mark: '⊞', accent: '#00A4EF' },
  { name: 'Google', mark: 'G', accent: '#4285F4' },
  { name: 'Infosys', mark: 'i', accent: '#007CC3' },
  { name: 'TCS', mark: 'T', accent: '#001489' },
  { name: 'Wipro', mark: 'W', accent: '#341C53' },
] as const

export const SOFTWARE_ENGINEER_PROCESS_PATH = '/blog/software-engineer-process-2026.webp'
export const SOFTWARE_ENGINEER_PROCESS_ALT =
  'Software Engineer interview process 2026 — Application, Online Assessment, Technical Rounds 1 and 2, System Design, Behavioral HR, and Offer'
export const SOFTWARE_ENGINEER_PROCESS_WIDTH = 1024
export const SOFTWARE_ENGINEER_PROCESS_HEIGHT = 682

export const SOFTWARE_ENGINEER_ROADMAP_PATH = '/blog/software-engineer-roadmap-2026.webp'
export const SOFTWARE_ENGINEER_ROADMAP_ALT =
  'Software Engineer preparation roadmap 2026 — programming basics, DSA, OOPs, system design, DBMS, OS, behavioral prep, and mock interviews'
export const SOFTWARE_ENGINEER_ROADMAP_WIDTH = 1774
export const SOFTWARE_ENGINEER_ROADMAP_HEIGHT = 887

export const SOFTWARE_ENGINEER_META_TITLE = 'Software Engineer Interview Questions (2026)'
export const SOFTWARE_ENGINEER_CANONICAL_PATH = '/interview-questions/software-engineer'
export const SOFTWARE_ENGINEER_DESCRIPTION =
  'Software Engineer interview questions with expert answers for India 2026 — DSA, OOPs, system design, DBMS, OS, behavioral rounds, company comparison, 30-day roadmap, and mock interview prep.'
export const SOFTWARE_ENGINEER_HERO_LEAD =
  'Curated Software Engineer interview questions for Indian campus placements and top tech companies — with hiring process guides, topic importance charts, company-wise expectations, common mistakes, and a 30-day preparation roadmap.'
export const SOFTWARE_ENGINEER_PUBLISHED_DATE = '2026-05-21'
export const SOFTWARE_ENGINEER_LAST_UPDATED = '2026-06-11'
export const SOFTWARE_ENGINEER_REVIEWED_DATE = '2026-06-11'
export const SOFTWARE_ENGINEER_READING_TIME = '26 min read'
export const SOFTWARE_ENGINEER_AUTHOR_NAME = 'InterviewEra Team'
export const SOFTWARE_ENGINEER_REVIEWER_NAME = 'InterviewEra Editorial'
export const SOFTWARE_ENGINEER_EDITORIAL_NOTE =
  'Content reviewed and updated for 2026 Software Engineer hiring loops across product companies and campus placements in India — DSA depth, CS fundamentals, system design at senior levels, and behavioral STAR structure.'

export const SOFTWARE_ENGINEER_TOC_SECTIONS = [
  { id: 'swe-hiring-process', label: 'SWE Hiring Process' },
  { id: 'swe-roadmap-image', label: 'Preparation Roadmap' },
  { id: 'swe-topic-importance', label: 'Topic Importance' },
  { id: 'swe-company-comparison', label: 'Company Comparison' },
  { id: 'swe-top-mistakes', label: 'Top Mistakes' },
  { id: 'swe-30-day-roadmap', label: '30-Day Roadmap' },
  { id: 'swe-mock-interview-cta', label: 'Mock Interview CTA' },
  { id: 'swe-contextual-links', label: 'Related Guides' },
  { id: 'swe-questions', label: 'Interview Questions' },
  { id: 'swe-faq', label: 'FAQ' },
] as const

export const SOFTWARE_ENGINEER_HIRING_STEPS = [
  {
    step: 'Step 1 — Application & resume screen',
    body: 'Recruiters scan for relevant projects, DSA practice signals, internship impact, and tech stack alignment. Tailor bullets to measurable outcomes — latency reduced, users served, bugs fixed — not task lists.',
  },
  {
    step: 'Step 2 — Online Assessment (OA)',
    body: 'Timed coding, MCQs on CS fundamentals, and sometimes aptitude. Campus drives (TCS NQT, InfyTQ, Wipro Elite) filter heavily here. Practice under 60–90 minute clocks with arrays, strings, and basic DSA.',
  },
  {
    step: 'Step 3 — Technical Round 1',
    body: 'Live coding on arrays, trees, hashing, or strings plus CS fundamentals — OOPs, DBMS, OS, networking. Explain approach before coding; state time and space complexity; test edge cases aloud.',
  },
  {
    step: 'Step 4 — Technical Round 2',
    body: 'Deeper DSA, language-specific depth, or introductory system design for experienced candidates. Expect follow-ups: optimize further, handle scale, discuss trade-offs, or refactor your solution.',
  },
  {
    step: 'Step 5 — System design (senior / product)',
    body: 'Design APIs, storage, caching, queues, and failure modes for real products — URL shortener, chat, feed, or rate limiter. Entry-level campus loops may skip this; product SDE-2+ loops rarely do.',
  },
  {
    step: 'Step 6 — Behavioral / HR',
    body: 'STAR-format stories on ownership, conflict, deadlines, and learning agility. Company-specific frameworks matter at Amazon (LPs), Microsoft (growth mindset), and service firms (communication + stability).',
  },
  {
    step: 'Step 7 — Offer',
    body: 'Selected candidates receive level, compensation, and joining timeline. India SWE packages range roughly 3.5–8 LPA at mass recruiters to 15–40+ LPA at top product companies for 0–3 YOE — negotiate after level confirmation.',
  },
] as const

export const SOFTWARE_ENGINEER_TOPIC_IMPORTANCE = [
  { topic: 'DSA (arrays, trees, graphs)', weight: 95 },
  { topic: 'OOPs & design patterns', weight: 78 },
  { topic: 'System design', weight: 72 },
  { topic: 'DBMS & SQL', weight: 68 },
  { topic: 'Operating systems', weight: 62 },
  { topic: 'Networking (TCP/HTTP)', weight: 55 },
  { topic: 'Behavioral (STAR)', weight: 70 },
  { topic: 'Aptitude / MCQs', weight: 48 },
] as const

export const SOFTWARE_ENGINEER_COMPANY_COMPARISON_ROWS = [
  ['Hiring Difficulty', 'Very High — OA + multi-round DSA + design', 'High — OA + structured loop', 'High — LP depth + Bar Raiser', 'Medium — aptitude-heavy campus OA'],
  ['DSA Depth', 'Very High — graphs, DP, trees', 'High — arrays, trees, graphs', 'High — two live coding rounds', 'Easy–Medium — arrays, strings'],
  ['System Design', 'Dedicated onsite round', 'Common at SDE-2+', 'SDE-2+ common', 'Rare at fresher level'],
  ['Behavioral Weight', 'Medium — Googleyness', 'Medium — growth mindset', 'Very High — 16 LPs', 'Low–Medium — HR screen'],
  ['Typical Timeline', '6–10 weeks', '4–8 weeks', '4–8 weeks', '2–4 weeks (campus)'],
  ['Package (0–2 YOE)', '25–50+ LPA', '18–35 LPA', '20–40 LPA', '3.5–7 LPA'],
] as const

export const SOFTWARE_ENGINEER_COMPANY_COLUMNS = [
  'Google',
  'Microsoft',
  'Amazon',
  'TCS',
] as const

export const SOFTWARE_ENGINEER_TOP_MISTAKES = [
  {
    title: 'Jumping to code without clarifying',
    body: 'Starting implementation before restating constraints, edge cases, and examples signals poor communication — a top rejection reason even when the final code works.',
    fix: 'Spend 60–90 seconds on problem restatement, 1–2 examples, and approach outline. Ask “Does this match what you expect?” before typing.',
  },
  {
    title: 'Skipping complexity analysis',
    body: 'Many candidates solve the problem but cannot explain time/space complexity or why their approach is optimal. Panels treat this as incomplete mastery.',
    fix: 'Always close with Big-O, walk through loop counts or recursion depth, and mention one optimization trade-off (time vs space).',
  },
  {
    title: 'Neglecting CS fundamentals',
    body: 'Strong LeetCode scores with weak OOPs, DBMS, or OS answers fail service-company and hybrid product loops that mix coding with MCQ-style depth.',
    fix: 'Allocate 30% of prep to fundamentals — normalization, indexing, process vs thread, TCP vs UDP — alongside DSA patterns.',
  },
  {
    title: 'Generic behavioral answers',
    body: '“We worked as a team” without your specific actions, metrics, or trade-offs fails STAR evaluation at product companies and campus HR rounds alike.',
    fix: 'Prepare 8–10 STAR stories with numbers. Use I not we for actions. End every story with measurable outcome plus one lesson learned.',
  },
  {
    title: 'One-size-fits-all company prep',
    body: 'Studying only hard DP for a TCS NQT or only aptitude for Amazon SDE guarantees mismatch. Company loops weight topics differently.',
    fix: 'Use the company comparison table on this page. Pick 2 target employers and mirror their OA format and round depth for the last 2 weeks.',
  },
  {
    title: 'No timed mock interviews',
    body: 'Reading questions without speaking answers under time pressure leaves communication gaps invisible until the real loop.',
    fix: 'Run at least 4 full mock interviews in your final 14 days — coding narration plus one behavioral round per mock.',
  },
] as const

export const SOFTWARE_ENGINEER_30_DAY_ROADMAP = [
  {
    week: 'Week 1 (Days 1–7)',
    focus: 'DSA foundations',
    items: [
      'Arrays, strings, hashing — 25 timed problems',
      'Two pointers and sliding window patterns',
      'Binary search variants on sorted data',
      'Review time/space complexity notation daily',
    ],
  },
  {
    week: 'Week 2 (Days 8–14)',
    focus: 'Trees, graphs & CS fundamentals',
    items: [
      'Trees/BST traversals, BFS/DFS on graphs',
      'OOPs pillars with one example each',
      'DBMS: normalization, indexing, transactions',
      'OS: process vs thread, deadlock, scheduling basics',
    ],
  },
  {
    week: 'Week 3 (Days 15–21)',
    focus: 'System design & company targeting',
    items: [
      'Design URL shortener, chat, or rate limiter on paper',
      'Networking: TCP vs UDP, HTTP, REST vs gRPC overview',
      'Complete 2 company-specific OA practice sets',
      'Polish 6 STAR behavioral stories with metrics',
    ],
  },
  {
    week: 'Week 4 (Days 22–28)',
    focus: 'Mocks & weak-area repair',
    items: [
      '3 full-loop mock interviews (coding + behavioral)',
      'Revisit missed patterns from mock feedback',
      'Resume bullets aligned to story evidence',
      'Company research for “why us” HR answers',
    ],
  },
  {
    week: 'Days 29–30',
    focus: 'Final polish',
    items: [
      'Light revision — high-frequency problems only',
      'One timed OA simulation under exam conditions',
      'Rest and logistics — ID, platform, quiet space',
    ],
  },
] as const

export const SOFTWARE_ENGINEER_CONTEXTUAL_LINKS = [
  { href: '/blog/top-dsa-interview-questions', label: 'Top DSA Interview Questions' },
  { href: '/interview-questions/topics/algorithms', label: 'Algorithms Questions' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/interview-questions/topics/data-structures', label: 'Data Structures Questions' },
  { href: '/interview-questions/java-developer', label: 'Java Developer Questions' },
  { href: '/interview-questions/python-developer', label: 'Python Developer Questions' },
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Questions' },
  { href: '/interview-questions/backend-developer', label: 'Backend Developer Questions' },
  { href: '/interview-questions/android-developer', label: 'Android Developer Hub' },
  { href: '/interview-questions/companies/amazon/software-engineer', label: 'Amazon SWE Hub' },
  { href: '/interview-questions/companies/microsoft/software-engineer', label: 'Microsoft SWE Hub' },
  { href: '/interview-questions/companies/google/software-engineer', label: 'Google SWE Questions' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/interview-questions/companies/infosys/software-engineer', label: 'Infosys SWE Hub' },
  { href: '/interview-questions/companies/flipkart/software-engineer', label: 'Flipkart SWE Questions' },
  { href: '/blog/top-interview-questions-for-software-engineers', label: 'Top SWE Interview Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/tools/question-generator/software-engineer', label: 'SWE Question Generator' },
] as const

export const SOFTWARE_ENGINEER_FAQ_ITEMS = [
  {
    question: 'How many Software Engineer interview questions should I prepare?',
    answer:
      'Aim for 50–80 core questions across DSA, OOPs, DBMS, OS, networking, and behavioral — but depth beats volume. Master 30 patterns you can explain aloud with complexity analysis rather than memorizing 200 shallow answers.',
  },
  {
    question: 'What DSA topics matter most for Software Engineer interviews in India?',
    answer:
      'Arrays, strings, hashing, two pointers, sliding window, binary search, trees, graphs (BFS/DFS), heaps, and medium dynamic programming cover most product and campus OAs. Service-company drives add aptitude and CS MCQs.',
  },
  {
    question: 'Is system design required for Software Engineer campus placements?',
    answer:
      'Usually not for mass-recruiter fresher loops (TCS, Infosys, Wipro). Product companies may introduce light design at SDE-2+ or experienced hire loops. Still learn basics — APIs, databases, caching — to stand out in technical Round 2.',
  },
  {
    question: 'How long does the Software Engineer interview process take in India?',
    answer:
      'Campus drives often complete in 2–4 weeks. Product company loops typically run 4–8 weeks from application to offer, depending on OA scheduling, panel availability, and offer approval chains.',
  },
  {
    question: 'What is the difference between product and service company SWE interviews?',
    answer:
      'Product companies weight DSA depth, system design, and structured behavioral signals more heavily. Service companies often emphasize aptitude, communication, CS fundamentals MCQs, and broader campus eligibility — with moderate coding difficulty.',
  },
  {
    question: 'Should I prepare in Java or Python for SWE interviews?',
    answer:
      'Use the language you can write cleanly under pressure — usually what your projects use. Indian panels accept Java, Python, or C++ if syntax is fluent and you can explain standard library choices. Consistency matters more than trend-chasing.',
  },
  {
    question: 'How important are behavioral rounds for Software Engineer roles?',
    answer:
      'Very important at product companies (Amazon LPs, Microsoft growth mindset) and increasingly at campus HR screens. Technical rejection gets attention, but vague STAR stories eliminate candidates who cleared coding rounds.',
  },
  {
    question: 'Can I crack SWE interviews with only LeetCode practice?',
    answer:
      'LeetCode alone is insufficient for most Indian loops. You also need CS fundamentals, company-specific OA formats, spoken problem-solving, and behavioral stories. Combine DSA drills with mocks and fundamentals revision.',
  },
  {
    question: 'What salary should I expect as a fresher Software Engineer in India (2026)?',
    answer:
      'Mass recruiters typically offer 3.5–8 LPA for B.Tech freshers. Mid-tier product and unicorns range 10–18 LPA. Top product companies can exceed 20–40 LPA for strong campus or off-campus hires — always confirm level and location.',
  },
  {
    question: 'How do I prepare for Online Assessments (OA)?',
    answer:
      'Practice timed sets weekly: 2 coding problems plus MCQ sections under real clocks. Read prompts twice, manage time per section, and review debugging and code-tracing questions — not only algorithm puzzles.',
  },
  {
    question: 'Is a GitHub portfolio necessary for Software Engineer interviews?',
    answer:
      'Helpful but not mandatory for campus drives. For product companies and experienced roles, 1–2 polished projects with README, architecture explanation, and measurable impact strengthen resume screens and project discussion rounds.',
  },
  {
    question: 'How should I use mock interviews in my SWE prep?',
    answer:
      'Start mocks after Week 2 of structured prep. Run at least 4 before your first real loop: narrate approach, accept follow-ups, and review filler words and pacing. InterviewEra mock interviews score answers across five rubric dimensions.',
  },
] as const

export function isSoftwareEngineerHub(roleSlug: string): boolean {
  return roleSlug === 'software-engineer'
}

/**
 * Audit status (2026-06-11):
 * PRODUCTION READY — hero (priority), roadmap image (lazy), sticky TOC, process flow diagram,
 * topic importance chart, company comparison, mistakes, 30-day roadmap, mock interview CTA,
 * E-E-A-T aside, contextual internal links, existing question list preserved.
 * SEO READY — self-canonical, index/follow, Article/FAQPage/BreadcrumbList/ItemList/@graph JSON-LD.
 * PILLAR PAGE READY — depth comparable to Amazon SDE, Microsoft SDE, and Android Developer hubs.
 */
