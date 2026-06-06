export const MICROSOFT_SE_CURATED_QUESTIONS_LABEL = 'Top 10 curated questions'
export const MICROSOFT_SE_HERO_PATH = '/blog/microsoft-software-engineer-hero.webp'
export const MICROSOFT_SE_HERO_ALT =
  'Microsoft Software Engineer interview preparation guide with top 10 curated questions — Online Assessment, Coding Interviews, System Design, Hiring Manager Round, and Growth Mindset culture'
export const MICROSOFT_SE_HERO_WIDTH = 1536
export const MICROSOFT_SE_HERO_HEIGHT = 1024
export const MICROSOFT_SE_PROCESS_PATH = '/blog/microsoft-software-engineer-process-2026.webp'
export const MICROSOFT_SE_PROCESS_ALT =
  'Microsoft Software Engineer interview process flow 2026: Application, Recruiter Screen, Online Assessment, Coding Rounds, System Design, Hiring Manager, and Offer'
export const MICROSOFT_SE_PROCESS_WIDTH = 1672
export const MICROSOFT_SE_PROCESS_HEIGHT = 941
export const MICROSOFT_SE_META_TITLE = 'Microsoft SDE Interview Questions (2026)'
export const MICROSOFT_SE_CANONICAL_PATH = '/interview-questions/companies/microsoft/software-engineer'
export const MICROSOFT_SE_DESCRIPTION =
  'Microsoft SDE interview prep for India 2026: Online Assessment, coding, system design, growth mindset, hiring manager round, and model answers.'
export const MICROSOFT_SE_EDITORIAL_NOTE =
  'Content reviewed and updated for current Microsoft SDE hiring patterns, OA formats, growth mindset evaluation, and hiring manager round expectations in India. Includes top 10 curated interview questions with expanded expert answers.'
export const MICROSOFT_SE_READING_TIME = '28 min read'
export const MICROSOFT_SE_PUBLISHED_DATE = '2026-05-28'
export const MICROSOFT_SE_LAST_UPDATED = '2026-06-05'
export const MICROSOFT_SE_REVIEWED_DATE = '2026-06-05'
export const MICROSOFT_SE_AUTHOR_NAME = 'InterviewEra Team'
export const MICROSOFT_SE_REVIEWER_NAME = 'InterviewEra Editorial'

export const MICROSOFT_SE_TOC_SECTIONS = [
  { id: 'ms-why-different', label: 'Why Microsoft Interviews Are Different' },
  { id: 'ms-hiring-philosophy', label: 'Microsoft Hiring Philosophy' },
  { id: 'ms-engineering-culture', label: 'Microsoft Engineering Culture' },
  { id: 'ms-interview-process', label: 'Microsoft Interview Process' },
  { id: 'ms-resume-examples', label: 'Resume Examples' },
  { id: 'ms-coding-interviews', label: 'Coding Interviews' },
  { id: 'ms-system-design', label: 'System Design Interviews' },
  { id: 'ms-product-thinking', label: 'Product Thinking at Microsoft' },
  { id: 'ms-growth-mindset', label: 'Growth Mindset' },
  { id: 'ms-hiring-manager', label: 'Hiring Manager Round' },
  { id: 'ms-prep-resources', label: 'Preparation Resources' },
  { id: 'ms-vs-big-tech', label: 'Microsoft vs Amazon vs Google' },
  { id: 'ms-roadmap', label: 'Preparation Roadmap' },
  { id: 'ms-questions', label: 'Top 10 Interview Questions' },
  { id: 'ms-faq', label: 'FAQs' },
] as const

export const MICROSOFT_PROCESS_FLOW_STEPS = [
  'Application',
  'Recruiter Call',
  'Online Assessment',
  'Coding Round 1',
  'Coding Round 2',
  'System Design',
  'Hiring Manager',
  'Offer',
] as const

export const MICROSOFT_PHILOSOPHY_CARDS = [
  {
    title: 'Growth Mindset',
    body: 'Microsoft shifted from “know-it-all” to “learn-it-all” under Satya Nadella. Interviewers reward curiosity, feedback-seeking, and honest reflection — not defensive expertise.',
  },
  {
    title: 'Collaboration',
    body: 'Engineering at Microsoft is team-first. Panels look for how you partner across disciplines, give and receive feedback, and unblock others without ego.',
  },
  {
    title: 'Customer Focus',
    body: 'Products serve billions of users and enterprises. Strong candidates tie technical decisions to customer outcomes, trust, and long-term value — not internal metrics alone.',
  },
  {
    title: 'Engineering Excellence',
    body: 'Clean code, testability, operational rigor, and thoughtful trade-offs matter. Microsoft expects you to ship reliably at scale, not just solve puzzles in isolation.',
  },
  {
    title: 'Innovation',
    body: 'From Azure to Copilot, Microsoft invests in platform bets. Show pragmatic invention — simplifying systems, exploring new tools, and learning from experiments.',
  },
] as const

export const MICROSOFT_ENGINEERING_CULTURE_CARDS = [
  {
    title: 'Growth Mindset',
    meaning: 'Treat skills as developable — seek feedback, learn from failure, and adapt when evidence changes your view.',
    whyMicrosoft: 'Cultural north star under Satya Nadella; interviewers probe learning agility over defensive expertise.',
    sampleSignal: 'Failure story with honest root cause, behaviour change, and measurable improvement afterward.',
  },
  {
    title: 'Collaboration',
    meaning: 'Partner across PM, design, and ops to ship outcomes — give candid feedback and elevate team output.',
    whyMicrosoft: 'Large orgs ship through cross-functional alignment; siloed heroes rarely scale at Microsoft.',
    sampleSignal: 'Conflict resolved respectfully with data or prototypes, shared credit, and a team-level outcome.',
  },
  {
    title: 'Customer Focus',
    meaning: 'Prioritize user and customer impact when making engineering trade-offs — not internal convenience alone.',
    whyMicrosoft: 'Enterprise and consumer products compete on trust; customer-backward reasoning differentiates strong loops.',
    sampleSignal: 'Decision that accepted short-term cost for measurable customer outcome, with segment and metric named.',
  },
  {
    title: 'Learn It All vs Know It All',
    meaning: 'Prefer continuous learning over defending existing knowledge — admit gaps and show how you close them.',
    whyMicrosoft: 'Directly reflects Microsoft\'s cultural shift; bluffing expertise is a red flag in HM rounds.',
    sampleSignal: '“I don\'t know yet, but here is how I would investigate” followed by a real example of doing that.',
  },
  {
    title: 'Cross-team Impact',
    meaning: 'Influence beyond your immediate squad — unblock dependencies, align standards, and raise bar org-wide.',
    whyMicrosoft: 'Platform teams (Azure, Office, Windows) require engineers who improve systems others depend on.',
    sampleSignal: 'Initiative that helped multiple teams — API standard, shared library, or incident process with adoption proof.',
  },
] as const

export const MICROSOFT_PRODUCT_THINKING_TOPICS = [
  {
    title: 'Improving Microsoft Teams',
    body: 'Discuss latency, notification reliability, meeting quality, and enterprise compliance — not feature lists alone. Strong answers tie UX pain to measurable engagement or support-ticket reduction.',
  },
  {
    title: 'Improving Outlook',
    body: 'Cover search relevance, sync reliability, calendar conflicts, and mobile offline behaviour. Show you understand email as a mission-critical workflow for enterprises.',
  },
  {
    title: 'Improving Xbox',
    body: 'Address matchmaking latency, download pipelines, social features, and live-service uptime. Product sense here includes gamer trust and session retention — not only backend scale.',
  },
  {
    title: 'Product prioritization',
    body: 'Frame decisions with user impact, engineering cost, risk, and learning value. Use a simple rubric: customer pain × reach × confidence ÷ effort — then defend your top pick with trade-offs.',
  },
] as const

export const MICROSOFT_PRODUCT_THINKING_EVALUATES = [
  'Whether you start from user pain — not technology for its own sake.',
  'How you prioritize under constraints (time, headcount, legacy debt).',
  'Clarity on success metrics and how you would validate after launch.',
  'Awareness of Microsoft product context (enterprise vs consumer, platform vs app).',
] as const

export const MICROSOFT_GROWTH_MINDSET_CARDS = [
  {
    title: 'Learn It All vs Know It All',
    meaning: 'Prefer continuous learning over defending what you already know. Admit gaps, seek feedback, and show how you improved after failure.',
    whyMicrosoft: 'Satya Nadella made this cultural north star — interviewers probe whether you grow from setbacks or rationalize them.',
    sampleQuestion: 'Tell me about a time you were wrong about a technical decision. What did you change?',
    strongSignal: 'Names the mistake, explains what you learned, and describes a concrete behaviour change afterward.',
    weakSignal: 'Blames others, claims you were “mostly right,” or has no follow-up learning loop.',
  },
  {
    title: 'Collaboration',
    meaning: 'Work effectively across roles — PM, design, ops — and elevate team output without hoarding credit.',
    whyMicrosoft: 'Large orgs ship through cross-functional alignment; siloed heroes rarely scale at Microsoft.',
    sampleQuestion: 'Describe a time you resolved a disagreement with a teammate on a technical approach.',
    strongSignal: 'Respectful disagreement, data or prototype used to decide, and shared outcome with credit distributed fairly.',
    weakSignal: 'Conflict avoided, passive aggression, or “I convinced them I was right” with no team benefit.',
  },
  {
    title: 'Continuous Learning',
    meaning: 'Stay current with tools, patterns, and domain knowledge — and apply learning to real delivery.',
    whyMicrosoft: 'Cloud, AI, and platform stacks evolve fast; stagnation is a hiring risk at senior levels.',
    sampleQuestion: 'What have you learned in the last six months and how did you apply it?',
    strongSignal: 'Specific resource or experiment, applied on a real project, with measurable or observable outcome.',
    weakSignal: 'Generic “I read blogs” with no application or depth on follow-ups.',
  },
  {
    title: 'Innovation',
    meaning: 'Find simpler, better ways to solve problems — challenge legacy complexity without reckless risk.',
    whyMicrosoft: 'Azure and product teams reward engineers who simplify operations and unlock new capabilities pragmatically.',
    sampleQuestion: 'Tell me about a time you improved a process or system others accepted as fixed.',
    strongSignal: 'Before/after comparison, trade-offs considered, and adoption or maintenance impact quantified.',
    weakSignal: 'Buzzword innovation with no simplification evidence or stakeholder buy-in.',
  },
  {
    title: 'Ownership',
    meaning: 'Own outcomes end-to-end — including monitoring, incident response, and follow-through after handoff.',
    whyMicrosoft: 'Services at scale need engineers who stay accountable beyond the initial merge.',
    sampleQuestion: 'Describe a problem you owned outside your formal scope.',
    strongSignal: 'Clear personal actions, sustained ownership, and measurable reliability or customer outcome.',
    weakSignal: 'Passive “the team handled it” with no personal agency.',
  },
  {
    title: 'Customer Obsession',
    meaning: 'Start from user and customer impact when prioritizing engineering work.',
    whyMicrosoft: 'Enterprise and consumer products compete on trust; customer-backward reasoning differentiates strong loops.',
    sampleQuestion: 'Tell me about a time you prioritized user impact over internal convenience.',
    strongSignal: 'Customer segment named, trade-off accepted, and impact metric or qualitative proof provided.',
    weakSignal: 'Vague “users matter” without decisions, costs, or outcomes.',
  },
] as const

export const MICROSOFT_CODING_TOPICS = [
  {
    topic: 'Arrays',
    difficulty: 'Medium–High',
    strategy: 'Master two pointers, prefix sums, and binary search variants. Narrate approach before coding.',
    mistakes: 'Off-by-one errors, ignoring edge cases (empty, single element), skipping complexity analysis.',
  },
  {
    topic: 'Strings',
    difficulty: 'Medium',
    strategy: 'Practice sliding window, character frequency maps, and palindrome/substring patterns under time pressure.',
    mistakes: 'Mutating strings inefficiently, missing Unicode/edge cases in OA, not clarifying constraints.',
  },
  {
    topic: 'Linked Lists',
    difficulty: 'Medium',
    strategy: 'Fluent pointer manipulation — dummy head, fast/slow pointers, cycle detection, merge patterns.',
    mistakes: 'Losing references during reversal, infinite loops, forgetting null tail handling.',
  },
  {
    topic: 'Trees',
    difficulty: 'Medium–High',
    strategy: 'DFS/BFS templates, BST properties, recursion with return values, and iterative stack approaches.',
    mistakes: 'Confusing traversal orders, missing null base cases, suboptimal space on deep trees.',
  },
  {
    topic: 'Graphs',
    difficulty: 'High',
    strategy: 'BFS/DFS, topological sort, union-find, and shortest-path basics. State graph representation choice aloud.',
    mistakes: 'Visiting nodes twice without tracking, wrong adjacency structure, ignoring disconnected components.',
  },
  {
    topic: 'Dynamic Programming',
    difficulty: 'High',
    strategy: 'Identify overlapping subproblems — start with recursion + memo, then tabulation. Practice classic 1D/2D DP.',
    mistakes: 'Jumping to code without state definition, wrong base cases, not optimizing space when possible.',
  },
] as const

export const MICROSOFT_SYSTEM_DESIGN_TOPICS = [
  { area: 'Scalability', detail: 'Horizontal scaling, load balancing, partitioning, and bottleneck identification under growth.' },
  { area: 'Availability', detail: 'SLAs, redundancy, failover, graceful degradation, and incident-aware architecture.' },
  { area: 'Databases', detail: 'SQL vs NoSQL trade-offs, indexing, replication, consistency models, and query patterns.' },
  { area: 'Caching', detail: 'CDN, application cache, cache invalidation, TTL strategy, and stampede prevention.' },
  { area: 'APIs', detail: 'REST/gRPC design, versioning, rate limiting, idempotency, and backward compatibility.' },
  { area: 'Distributed Systems', detail: 'Queues, event-driven flows, CAP trade-offs, and observability across services.' },
] as const

export const MICROSOFT_HM_CARDS = [
  {
    title: 'Purpose',
    body: 'The hiring manager round confirms level fit, team alignment, growth mindset signals, and long-term potential — not just coding scores from prior rounds.',
  },
  {
    title: 'Common Questions',
    body: 'Past project depth, conflict and collaboration stories, why Microsoft/why this team, career goals, and “as-appropriate” behavioural probes tied to Microsoft values.',
  },
  {
    title: 'What Gets Candidates Rejected',
    body: 'Shallow project stories, defensive answers to failure questions, misaligned level expectations, or strong coding with no evidence of collaboration or customer thinking.',
  },
  {
    title: 'Preparation Strategy',
    body: 'Prepare 6–8 growth-mindset stories with metrics, research the team’s product area, practise concise “why Microsoft” answers, and rehearse level-appropriate scope examples.',
  },
] as const

export const MICROSOFT_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/companies/amazon/software-engineer', label: 'Amazon SWE Questions' },
  { href: '/interview-questions/companies/google/software-engineer', label: 'Google SWE Questions' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Questions' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Behavioral Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
] as const

export const MICROSOFT_RESUME_EXAMPLES = [
  {
    title: 'Measurable impact',
    bad: '“Improved API performance for the team.”',
    good: '“Reduced order-service p99 latency from 380ms to 145ms (62% drop) by adding Redis caching and batching DB reads — cut checkout timeouts 19%.”',
  },
  {
    title: 'Engineering ownership',
    bad: '“Worked on microservices with the backend team.”',
    good: '“Owned notification pipeline reliability — designed retry queues, on-call runbooks, and post-incident fixes across 4 Azure services.”',
  },
  {
    title: 'Scalability',
    bad: '“Built a scalable backend system.”',
    good: '“Designed event-driven inventory sync on Azure Service Bus handling 12k events/min with idempotent consumers and partition-aware workers.”',
  },
  {
    title: 'Performance improvements',
    bad: '“Optimized code for better speed.”',
    good: '“Profiled hot paths in C# API, replaced N+1 queries with batched reads, and cut CPU usage 34% while sustaining 2× peak traffic.”',
  },
] as const

export const MICROSOFT_VS_AMAZON_GOOGLE_ROWS = [
  ['Coding Difficulty', 'High — 2 coding rounds + OA', 'High — 2 coding rounds + OA', 'Very High — multiple onsite coding rounds'],
  ['System Design Weight', 'Dedicated round at SDE-2+', 'Common at SDE-2+; lighter at entry', 'Dedicated onsite design round'],
  ['Behavioral Weight', 'Medium — growth mindset narratives', 'Very High — 16 Leadership Principles', 'Medium — Googleyness + collaboration'],
  ['Hiring Philosophy', 'Learn-it-all growth mindset', 'Customer-backward + bar-raising LPs', 'Googleyness + intellectual humility'],
  ['Offer Timeline', '3–6 weeks in India', '4–8 weeks in India', '4–8 weeks in India'],
  ['Interview Style', 'OA → coding ×2 → design → HM', 'OA → tech ×2 → LP → Bar Raiser', 'Recruiter → phone → onsite (4–5)'],
] as const

export const MICROSOFT_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'Coding Fundamentals',
    items: ['Refresh arrays, strings, linked lists', 'Practice 15 easy–medium problems timed', 'Review Big-O and clean code habits'],
  },
  {
    week: 'Week 2',
    focus: 'DSA Practice',
    items: ['40 medium problems (trees, graphs, DP)', '2 full OA-style simulations', 'Narrate approach before every solution'],
  },
  {
    week: 'Week 3',
    focus: 'System Design',
    items: ['URL shortener + notification system drills', 'Caching, DB, and API trade-off revision', 'Draw diagrams aloud in 35 minutes'],
  },
  {
    week: 'Week 4',
    focus: 'Mock Interviews + Behavioral',
    items: ['Full-loop mocks (coding + HM-style)', 'Growth mindset story bank (6–8 stories)', 'Team research + “why Microsoft” pitch'],
  },
] as const

export const MICROSOFT_FAQ_ITEMS = [
  {
    question: 'What is Microsoft\'s growth mindset culture?',
    answer:
      'Growth mindset is Microsoft\'s cultural shift from defending existing knowledge (“know-it-all”) to continuous learning (“learn-it-all”). Interviewers expect honest reflection on failures, feedback-seeking behaviour, and evidence that you adapt — not bluffing expertise.',
  },
  {
    question: 'How many rounds are in Microsoft SDE interviews in India?',
    answer:
      'Most loops include recruiter screen, Online Assessment, 2–3 technical coding rounds, system design (often for SDE-2+), and a hiring manager or “as-appropriate” round. Exact count depends on level and org (Azure, Office, Windows, etc.).',
  },
  {
    question: 'How difficult is the Microsoft Online Assessment?',
    answer:
      'OA typically includes timed coding logic, MCQs, and sometimes work-style scenarios. Difficulty is moderate-to-high for product roles — it filters for structured problem-solving under pressure, not memorized puzzle volume alone.',
  },
  {
    question: 'Is system design required for Microsoft SDE interviews?',
    answer:
      'For entry-level SDE roles, focus on strong DSA and clean coding. For SDE-2 and above, expect a dedicated system design round covering scalability, APIs, databases, caching, and failure modes.',
  },
  {
    question: 'What is the “as-appropriate” round at Microsoft?',
    answer:
      'The as-appropriate round is a senior interviewer (often director-level or partner) who assesses overall fit, growth mindset, and level calibration. It can influence final hire/no-hire even when technical rounds were strong.',
  },
  {
    question: 'How long does the Microsoft interview process take?',
    answer:
      'Typically 3–6 weeks from application to offer in India, depending on team, level, and scheduling. Panel coordination and the as-appropriate round often add calendar time between active interview days.',
  },
  {
    question: 'What DSA topics matter most for Microsoft technical rounds?',
    answer:
      'Arrays, strings, linked lists, trees, graphs, heaps, binary search, sliding window, and DP fundamentals. Microsoft also values clear communication, correct complexity analysis, and test-case discussion.',
  },
  {
    question: 'How should I prepare for the Microsoft hiring manager round?',
    answer:
      'Build growth-mindset stories with metrics, research the team\'s product, prepare concise “why Microsoft / why this team” answers, and practise behavioural follow-ups on conflict, failure, and collaboration.',
  },
  {
    question: 'Does Microsoft hire freshers for software engineer roles in India?',
    answer:
      'Microsoft hires early-career engineers through campus and off-campus pipelines, but volume varies by year. The bar still includes OA, DSA depth, and growth-mindset behavioural evaluation.',
  },
  {
    question: 'How does Microsoft evaluate collaboration in interviews?',
    answer:
      'Through behavioural questions on conflict resolution, cross-team work, mentoring, and feedback. Strong answers show respectful disagreement, shared outcomes, and learning — not solo heroics.',
  },
  {
    question: 'When should I negotiate Microsoft compensation?',
    answer:
      'After verbal offer and level confirmation. Microsoft packages include base, stock (RSUs), and bonus components — negotiate the full package using competing offers and role scope as anchors.',
  },
  {
    question: 'How much does an employee referral help at Microsoft?',
    answer:
      'Referrals improve recruiter visibility and response speed but do not bypass the interview bar. You still complete OA, technical loops, and hiring manager evaluation.',
  },
] as const
