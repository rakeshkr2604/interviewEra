export const FRONTEND_HERO_PATH = '/blog/frontend-developer-hero.webp'
export const FRONTEND_HERO_ALT =
  'Frontend Developer interview preparation 2026 — React, JavaScript, TypeScript, HTML, CSS, frontend system design, performance optimization, and browser internals for India hiring loops'
export const FRONTEND_HERO_WIDTH = 1024
export const FRONTEND_HERO_HEIGHT = 682

export const FRONTEND_PROCESS_PATH = '/blog/frontend-developer-process-2026.webp'
export const FRONTEND_PROCESS_ALT =
  'Frontend Developer interview process 2026 — Application, Online Assessment, Frontend Round 1, Frontend Round 2, System Design or UI Architecture, Behavioral, and Offer with prep topics and typical timeline for India'
export const FRONTEND_PROCESS_WIDTH = 1024
export const FRONTEND_PROCESS_HEIGHT = 682

export const FRONTEND_PROCESS_VISUAL_TITLE = 'Frontend Developer Interview Process 2026'

export const FRONTEND_PROCESS_VISUAL_STATS = [
  { label: 'Typical timeline', value: '3–6 weeks' },
  { label: 'Total stages', value: '7 rounds' },
  { label: 'Package (0–2 YOE)', value: '4–25 LPA' },
] as const

export const FRONTEND_PROCESS_VISUAL_STEPS = [
  {
    label: 'Application',
    duration: '1–5 days',
    signal: 'Resume & portfolio screen',
    prep: 'Ship 1–2 projects with README, live demo link, and measurable UI impact bullets.',
    topics: ['React portfolio', 'GitHub', 'Resume'],
    icon: 'application' as const,
  },
  {
    label: 'Online Assessment',
    duration: '60–90 min',
    signal: 'Aptitude + JS filter',
    prep: 'Practice timed JS MCQs, CSS layout puzzles, and 1–2 easy array/string problems.',
    topics: ['JavaScript MCQs', 'CSS', 'Easy DSA'],
    icon: 'assessment' as const,
  },
  {
    label: 'Frontend Round 1',
    duration: '45–60 min',
    signal: 'JS & DOM fundamentals',
    prep: 'Explain closures, event loop, Flexbox/Grid, and build a small UI widget live.',
    topics: ['Closures', 'DOM APIs', 'CSS Layout', 'React basics'],
    icon: 'round1' as const,
  },
  {
    label: 'Frontend Round 2',
    duration: '60–90 min',
    signal: 'React depth + coding',
    prep: 'Refactor a component, integrate an API, discuss hooks, TypeScript types, and state flow.',
    topics: ['Hooks', 'TypeScript', 'State mgmt', 'API fetch'],
    icon: 'round2' as const,
  },
  {
    label: 'System Design / UI Architecture',
    duration: '45–60 min',
    signal: 'Architecture & trade-offs',
    prep: 'Design a dashboard or feed: component boundaries, caching, lazy load, error boundaries.',
    topics: ['Component design', 'Performance', 'Caching', 'Data flow'],
    icon: 'design' as const,
  },
  {
    label: 'Behavioral',
    duration: '30–45 min',
    signal: 'Communication & teamwork',
    prep: 'Prepare STAR stories on designer collaboration, deadlines, and accessibility wins.',
    topics: ['STAR format', 'Cross-functional', 'Conflict'],
    icon: 'behavioral' as const,
  },
  {
    label: 'Offer',
    duration: '3–10 days',
    signal: 'Level & compensation',
    prep: 'Confirm role level, stack, and joining date before negotiating — product vs service bands differ.',
    topics: ['CTC breakdown', 'ESOP', 'Level'],
    icon: 'offer' as const,
  },
] as const

export const FRONTEND_ROADMAP_PATH = '/blog/frontend-developer-roadmap-2026.webp'
export const FRONTEND_ROADMAP_ALT =
  'Frontend Developer learning roadmap 2026 — HTML, CSS, JavaScript, TypeScript, React, state management, performance, frontend system design, and interview ready'
export const FRONTEND_ROADMAP_WIDTH = 1774
export const FRONTEND_ROADMAP_HEIGHT = 887

export const FRONTEND_META_TITLE = 'Frontend Developer Interview Questions (2026)'
export const FRONTEND_CANONICAL_PATH = '/interview-questions/frontend-developer'
export const FRONTEND_DESCRIPTION =
  'Frontend Developer interview questions with expert answers for India 2026 — React, JavaScript, TypeScript, CSS, browser internals, performance, framework comparison, 30-day roadmap, and mock interview prep.'
export const FRONTEND_HERO_LEAD =
  'Curated Frontend Developer interview questions for Indian product companies and campus placements — with hiring process guides, topic importance charts, React vs Angular vs Vue comparison, common mistakes, and a 30-day preparation roadmap.'
export const FRONTEND_PUBLISHED_DATE = '2026-05-21'
export const FRONTEND_LAST_UPDATED = '2026-06-11'
export const FRONTEND_REVIEWED_DATE = '2026-06-11'
export const FRONTEND_READING_TIME = '24 min read'
export const FRONTEND_AUTHOR_NAME = 'InterviewEra Team'
export const FRONTEND_REVIEWER_NAME = 'InterviewEra Editorial'
export const FRONTEND_EDITORIAL_NOTE =
  'Content reviewed and updated for 2026 Frontend Developer hiring loops across product companies and service firms in India — JavaScript depth, React patterns, CSS layout, TypeScript adoption, performance profiling, accessibility basics, and UI architecture discussions.'

export const FRONTEND_TOC_SECTIONS = [
  { id: 'fe-hiring-process', label: 'Frontend Hiring Process' },
  { id: 'fe-roadmap-image', label: 'Learning Roadmap' },
  { id: 'fe-topic-importance', label: 'Topic Importance' },
  { id: 'fe-framework-comparison', label: 'React vs Angular vs Vue' },
  { id: 'fe-top-mistakes', label: 'Common Mistakes' },
  { id: 'fe-30-day-roadmap', label: '30-Day Roadmap' },
  { id: 'fe-mock-interview-cta', label: 'Mock Interview CTA' },
  { id: 'fe-contextual-links', label: 'Related Guides' },
  { id: 'fe-questions', label: 'Interview Questions' },
  { id: 'fe-faq', label: 'FAQ' },
] as const

export const FRONTEND_HIRING_STEPS = [
  {
    step: 'Step 1 — Application',
    body: 'Recruiters scan for React or modern JS project depth, live demos or GitHub links, and measurable UI impact — load time improved, conversion uplift, accessibility fixes. Tailor bullets to components shipped, not tutorial clones.',
  },
  {
    step: 'Step 2 — Online Assessment',
    body: 'Timed OA with JavaScript MCQs, DOM/CSS puzzles, debugging snippets, and sometimes 1–2 easy coding problems (arrays, strings). Campus and lateral pipelines at TCS, Accenture, Zoho, and product firms filter heavily here.',
  },
  {
    step: 'Step 3 — Frontend Round 1',
    body: 'JavaScript fundamentals, closures, event loop, DOM APIs, CSS layout (Flexbox/Grid), and basic React concepts — props, state, hooks. Expect live coding on a small UI widget or algorithmic JS problem with spoken reasoning.',
  },
  {
    step: 'Step 4 — Frontend Round 2',
    body: 'Deeper React — state management, performance, custom hooks, TypeScript types, testing mindset. May include code review of your component, refactoring exercise, or building a feature with API integration.',
  },
  {
    step: 'Step 5 — System Design / UI Architecture',
    body: 'Design a dashboard, design system, or high-traffic page: component boundaries, data flow, caching, lazy loading, error boundaries, and API contract. Senior loops add frontend system design; fresher loops may use a lighter architecture discussion.',
  },
  {
    step: 'Step 6 — Behavioral',
    body: 'Collaboration with designers, handling feedback, deadline pressure, and conflict resolution. Prepare STAR stories on accessibility wins, performance fixes, and cross-functional delivery.',
  },
  {
    step: 'Step 7 — Offer',
    body: 'Selected candidates receive level, compensation, and joining timeline. Frontend Developer packages in India typically range 4–12 LPA for 0–2 YOE at service firms and 10–25+ LPA at product companies — negotiate after level confirmation.',
  },
] as const

export const FRONTEND_TOPIC_IMPORTANCE = [
  { topic: 'JavaScript', weight: 95 },
  { topic: 'React', weight: 88 },
  { topic: 'CSS', weight: 82 },
  { topic: 'HTML', weight: 70 },
  { topic: 'TypeScript', weight: 75 },
  { topic: 'Browser Internals', weight: 65 },
  { topic: 'Performance', weight: 72 },
  { topic: 'System Design', weight: 58 },
  { topic: 'Behavioral', weight: 62 },
] as const

export const FRONTEND_FRAMEWORK_COLUMNS = ['React', 'Angular', 'Vue'] as const

export const FRONTEND_FRAMEWORK_COMPARISON_ROWS = [
  [
    'Learning Curve',
    'Moderate — JSX + hooks; large ecosystem to navigate',
    'Steep — TypeScript, RxJS, modules, and Angular CLI conventions',
    'Moderate — approachable SFC syntax; composition API adds depth',
  ],
  [
    'Demand (India 2026)',
    'Very High — dominant in startups and product companies',
    'Medium–High — enterprise IT, banking, and large service accounts',
    'Medium — growing share; strong in selective product teams',
  ],
  [
    'Interview Frequency',
    'Highest — most FE loops assume React familiarity',
    'Common in enterprise and Angular-heavy codebases',
    'Less frequent than React; appears in Vue-first teams',
  ],
  [
    'Ecosystem',
    'Largest — Next.js, state libs, UI kits, hiring pool',
    'Mature — NgRx, Angular Material, enterprise patterns',
    'Lean — Vue Router, Pinia, Nuxt; smaller but cohesive',
  ],
  [
    'Performance',
    'Strong with code splitting, memoization, and SSR frameworks',
    'Good with OnPush and lazy modules; heavier default bundle',
    'Lightweight runtime; fine-grained reactivity aids efficiency',
  ],
  [
    'Enterprise Adoption',
    'High — Meta lineage, widespread in Indian product firms',
    'Very High — preferred in large regulated enterprises',
    'Moderate — popular in APAC teams; less campus focus in India',
  ],
] as const

export const FRONTEND_TOP_MISTAKES = [
  {
    mistake: 'Memorizing React APIs without JavaScript depth',
    why: 'Candidates recite useEffect rules but fail on closures, event loop, or prototype questions — Round 1 eliminations happen on JS, not JSX syntax.',
    fix: 'Spend 40% of prep on vanilla JavaScript: scope, async/await, promises, this binding, and array methods before advanced React patterns.',
  },
  {
    mistake: 'Ignoring JS fundamentals',
    why: 'Skipping typeof, coercion, and execution context leads to debugging failures in live coding and whiteboard trace questions.',
    fix: 'Practice 20 fundamental MCQs weekly and explain answers aloud. Use strict equality and immutability habits in every code sample.',
  },
  {
    mistake: 'Weak CSS knowledge',
    why: 'Cannot build responsive layouts from scratch or explain specificity — interviewers assign UI tasks even for “React-only” roles.',
    fix: 'Rebuild 3 layouts with Flexbox and Grid only. Memorize specificity order and practice mobile-first breakpoints without frameworks.',
  },
  {
    mistake: 'No performance understanding',
    why: 'Listing React.memo without profiling data, bundle analysis, or network waterfall reading signals shallow optimization knowledge.',
    fix: 'Profile one real app with Lighthouse and React DevTools. Document one fix with before/after metrics for interview stories.',
  },
  {
    mistake: 'No accessibility awareness',
    why: 'Building clickable divs without keyboard support or ARIA labels fails product-company bars and senior frontend expectations.',
    fix: 'Audit one page with axe or Lighthouse a11y. Practice semantic HTML, focus management, and aria-label on interactive components.',
  },
  {
    mistake: 'No project depth',
    why: 'Tutorial todo apps without architecture decisions, trade-offs, or deployment story cannot survive project discussion rounds.',
    fix: 'Ship one portfolio project with README architecture section, API integration, error states, and one measurable improvement you drove.',
  },
] as const

export const FRONTEND_30_DAY_ROADMAP = [
  {
    week: 'Week 1 (Days 1–7)',
    focus: 'HTML + CSS',
    items: [
      'Semantic HTML, forms, and accessibility basics',
      'Flexbox and CSS Grid layouts from scratch',
      'Responsive design — mobile-first, clamp(), media queries',
      'CSS specificity, cascade, and BEM or utility patterns',
    ],
  },
  {
    week: 'Week 2 (Days 8–14)',
    focus: 'JavaScript + TypeScript',
    items: [
      'Closures, scope, event loop, and promise chains',
      'ES6+ — destructuring, spread, modules, async/await',
      'TypeScript basics — interfaces, generics, union types',
      'DOM APIs, event delegation, and fetch error handling',
    ],
  },
  {
    week: 'Week 3 (Days 15–21)',
    focus: 'React + State Management',
    items: [
      'Components, props, state, hooks (useState, useEffect, useMemo)',
      'Controlled forms, lifting state, and composition patterns',
      'Context vs Redux/Zustand — when each fits',
      'Build one feature with API integration and loading states',
    ],
  },
  {
    week: 'Week 4 (Days 22–28)',
    focus: 'Performance + System Design + Mock Interviews',
    items: [
      'Code splitting, lazy loading, list virtualization overview',
      'Design a dashboard or component library on paper',
      'Browser internals — render pipeline, critical rendering path',
      '3 timed mock interviews with spoken explanations',
    ],
  },
] as const

export const FRONTEND_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/topics/react', label: 'React Interview Questions' },
  { href: '/interview-questions/topics/javascript', label: 'JavaScript Questions' },
  { href: '/interview-questions/topics/html-css', label: 'HTML & CSS Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Hub' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Topic Map' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Guide' },
  { href: '/interview-questions/topics/typescript', label: 'TypeScript Questions' },
  { href: '/interview-questions/android-developer', label: 'Android Developer Hub' },
  { href: '/interview-questions/full-stack-developer', label: 'Full Stack Developer Questions' },
  { href: '/interview-questions/companies/freshworks/frontend-developer', label: 'Freshworks Frontend Hub' },
  { href: '/interview-questions/companies/tcs/frontend-developer', label: 'TCS Frontend Questions' },
  { href: '/interview-questions/companies/accenture/frontend-developer', label: 'Accenture Frontend Questions' },
  { href: '/interview-questions/companies/zoho/frontend-developer', label: 'Zoho Frontend Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/tools/question-generator/frontend-developer', label: 'Frontend Question Generator' },
] as const

export const FRONTEND_FAQ_ITEMS = [
  {
    question: 'How many Frontend Developer interview questions should I prepare?',
    answer:
      'Aim for 40–60 core questions across JavaScript, React, CSS, HTML, TypeScript, and behavioral — but depth beats volume. Master 25 concepts you can explain with code examples and trade-offs rather than memorizing API lists.',
  },
  {
    question: 'Is React mandatory for Frontend Developer interviews in India?',
    answer:
      'React dominates product-company and startup loops in 2026, but enterprise firms still hire Angular developers. Learn React first for breadth, then skim Angular or Vue basics if you target specific employers.',
  },
  {
    question: 'How important is TypeScript for frontend interviews?',
    answer:
      'Increasingly expected at product companies. You should read and write basic interfaces, props typing, and union types even if your projects use JavaScript. Full generics mastery is rarely required for fresher loops.',
  },
  {
    question: 'Do Frontend Developer interviews include DSA?',
    answer:
      'Yes — usually easier than backend SWE loops. Expect arrays, strings, hashing, and occasional tree questions in OAs or live coding. Heavy DP is uncommon unless the role is labeled “frontend + algorithms.”',
  },
  {
    question: 'What CSS topics matter most in frontend interviews?',
    answer:
      'Flexbox, Grid, specificity, responsive design, box model, and positioning. Be ready to build a card layout or navbar from scratch without Tailwind during live exercises.',
  },
  {
    question: 'How do I prepare for frontend system design rounds?',
    answer:
      'Practice designing dashboards, infinite scroll feeds, autocomplete, and design systems. Cover component API design, state ownership, caching, error boundaries, and performance budgets — not microservices depth.',
  },
  {
    question: 'What is the typical Frontend Developer interview timeline in India?',
    answer:
      'Campus and service drives often complete in 2–4 weeks. Product company loops run 3–6 weeks from OA to offer, depending on panel scheduling and take-home assignments.',
  },
  {
    question: 'Should I learn Next.js for frontend interviews?',
    answer:
      'Helpful but not mandatory for all loops. Understand SSR vs CSR trade-offs, routing, and data fetching patterns. If your target companies list Next.js, build one deployed project with it.',
  },
  {
    question: 'How important is accessibility in frontend interviews?',
    answer:
      'Product companies increasingly test semantic HTML, keyboard navigation, and ARIA basics. Mention one accessibility improvement you shipped — it differentiates candidates with identical React knowledge.',
  },
  {
    question: 'What salary should I expect as a fresher Frontend Developer in India (2026)?',
    answer:
      'Service firms typically offer 3.5–7 LPA. Mid-tier product companies range 8–15 LPA. Strong off-campus product hires can exceed 15–22 LPA — confirm level, location, and ESOP separately.',
  },
  {
    question: 'How do I answer “Tell me about yourself” as a frontend fresher?',
    answer:
      'Use a 60–90 second arc: domain interest, one shipped UI project with tech stack, hardest technical problem solved, and why frontend engineering fits your strengths. End by mapping skills to the job description.',
  },
  {
    question: 'How should I use mock interviews for frontend prep?',
    answer:
      'Start after Week 2 of structured study. Run at least 3 mocks before real loops — mix JavaScript fundamentals, live UI coding, and one behavioral round. Review pacing, filler words, and whether you explained trade-offs aloud.',
  },
] as const

export function isFrontendDeveloperHub(roleSlug: string): boolean {
  return roleSlug === 'frontend-developer'
}
