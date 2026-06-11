export const REACT_HERO_PATH = '/blog/react-interview-hero.webp'
export const REACT_HERO_ALT =
  'React.js interview preparation 2026 — Indian frontend developer with React dashboard, component tree, hooks visualization, React logo, and VS Code for India hiring loops'
export const REACT_HERO_WIDTH = 1024
export const REACT_HERO_HEIGHT = 682

export const REACT_ROADMAP_PATH = '/blog/react-learning-roadmap-premium-2026.webp'
export const REACT_ROADMAP_SECTION_TITLE = 'React Learning Roadmap 2026'
export const REACT_ROADMAP_SECTION_LEAD =
  'Solid ES6+ and async JavaScript underpin every React loop — do not skip straight to hooks without closures and promises.'
export const REACT_ROADMAP_ALT =
  'React Learning Roadmap 2026 — nine steps from JavaScript and ES6+ through React fundamentals, hooks, state management, API integration, performance, Next.js, to interview ready'
export const REACT_ROADMAP_WIDTH = 1024
export const REACT_ROADMAP_HEIGHT = 682

export const REACT_ARCHITECTURE_PATH = '/blog/react-architecture-premium-2026.webp'
export const REACT_ARCHITECTURE_SECTION_TITLE = 'React Application Architecture'
export const REACT_ARCHITECTURE_SECTION_LEAD =
  'Practice tracing a user action through every layer below — interviewers expect you to explain how production React apps move data from UI to backend and back.'
export const REACT_ARCHITECTURE_ALT =
  'React Application Architecture — Components, State, Hooks, Context or Redux, API Layer, and Backend with data flow for interview discussions'
export const REACT_ARCHITECTURE_WIDTH = 1024
export const REACT_ARCHITECTURE_HEIGHT = 682

export const REACT_META_TITLE = 'React.js Interview Questions (2026)'
export const REACT_CANONICAL_PATH = '/interview-questions/topics/react'
export const REACT_DESCRIPTION =
  'React.js interview questions with expert answers for India 2026 — hooks, Context API, performance, state management, architecture, framework comparison, 30-day roadmap, and mock interview prep.'
export const REACT_HERO_HEADLINE = 'React.js Interview Questions 2026'
export const REACT_HERO_SUBHEADLINE = 'Hooks • Context API • Performance • State Management'
export const REACT_HERO_LEAD =
  'Curated React.js interview questions for Indian product companies and campus placements — with learning roadmap, architecture flow, topic importance charts, React vs Angular vs Vue comparison, common mistakes, and a 30-day preparation plan.'
export const REACT_PUBLISHED_DATE = '2026-05-31'
export const REACT_LAST_UPDATED = '2026-06-11'
export const REACT_REVIEWED_DATE = '2026-06-11'
export const REACT_READING_TIME = '22 min read'
export const REACT_AUTHOR_NAME = 'InterviewEra Team'
export const REACT_REVIEWER_NAME = 'InterviewEra Editorial'
export const REACT_EDITORIAL_NOTE =
  'Content reviewed and updated for 2026 React.js hiring loops across product companies and service firms in India — hooks depth, Context API trade-offs, reconciliation, performance profiling, state management patterns, and Next.js fundamentals.'

export const REACT_TOC_SECTIONS = [
  { id: 'react-questions', label: 'React Questions' },
  { id: 'react-roadmap', label: 'React Learning Roadmap' },
  { id: 'react-architecture', label: 'React Application Architecture' },
  { id: 'react-topic-importance', label: 'Topic Importance' },
  { id: 'react-framework-comparison', label: 'React vs Other Frameworks' },
  { id: 'react-mistakes', label: 'Common Mistakes' },
  { id: 'react-30-day-plan', label: '30-Day Plan' },
  { id: 'react-faq', label: 'FAQ' },
  { id: 'react-mock-interview-cta', label: 'Mock Interview CTA' },
] as const

export const REACT_TOPIC_IMPORTANCE = [
  { topic: 'Hooks', weight: 92 },
  { topic: 'State Management', weight: 85 },
  { topic: 'Context API', weight: 78 },
  { topic: 'Rendering', weight: 82 },
  { topic: 'Performance', weight: 80 },
  { topic: 'Routing', weight: 65 },
  { topic: 'Testing', weight: 58 },
  { topic: 'SSR', weight: 62 },
] as const

export const REACT_FRAMEWORK_COLUMNS = ['React', 'Angular', 'Vue'] as const

export const REACT_FRAMEWORK_COMPARISON_ROWS = [
  [
    'Learning Curve',
    'Moderate — JSX + hooks; large ecosystem to navigate',
    'Steep — TypeScript, RxJS, modules, and Angular CLI conventions',
    'Moderate — approachable SFC syntax; composition API adds depth',
  ],
  [
    'Performance',
    'Strong with code splitting, memoization, and SSR via Next.js',
    'Good with OnPush and lazy modules; heavier default bundle',
    'Lightweight runtime; fine-grained reactivity aids efficiency',
  ],
  [
    'Demand (India 2026)',
    'Very High — dominant in startups and product companies',
    'Medium–High — enterprise IT, banking, and large service accounts',
    'Medium — growing share; strong in selective product teams',
  ],
  [
    'Interview Frequency',
    'Highest — most frontend loops assume React familiarity',
    'Common in enterprise and Angular-heavy codebases',
    'Less frequent than React; appears in Vue-first teams',
  ],
  [
    'Ecosystem',
    'Largest — Next.js, Redux, Zustand, UI kits, hiring pool',
    'Mature — NgRx, Angular Material, enterprise patterns',
    'Lean — Vue Router, Pinia, Nuxt; smaller but cohesive',
  ],
] as const

export const REACT_TOP_MISTAKES = [
  {
    mistake: 'Overusing useEffect for derived state',
    impact: 'Creates unnecessary re-renders, stale closure bugs, and infinite loop risks — interviewers probe whether you understand when state should be computed inline.',
    fix: 'Derive values during render when possible; reserve useEffect for syncing with external systems (APIs, subscriptions, DOM).',
  },
  {
    mistake: 'Sprinkling memoization without profiling',
    impact: 'React.memo, useMemo, and useCallback add complexity and can hurt performance when applied blindly — signals shallow optimization knowledge.',
    fix: 'Profile with React DevTools first; memoize only proven hot paths like large lists or expensive child trees.',
  },
  {
    mistake: 'Putting everything in Context',
    impact: 'A single provider value change re-renders all consumers — common cause of sluggish dashboards in live coding reviews.',
    fix: 'Split contexts by concern, memoise provider values, or use Zustand/Redux for high-frequency global state.',
  },
  {
    mistake: 'Using array index as list keys',
    impact: 'Breaks reconciliation when items reorder, insert, or delete — wrong inputs keep state and causes subtle UI bugs.',
    fix: 'Use stable unique ids from your data model; explain why keys matter in reconciliation answers.',
  },
  {
    mistake: 'Mutating state directly',
    impact: 'React misses updates because reference equality does not change — fails in useState and useReducer discussions.',
    fix: 'Always return new objects/arrays; use functional updates setState(prev => ...) when next state depends on previous.',
  },
  {
    mistake: 'Skipping JavaScript fundamentals',
    impact: 'Candidates recite hook rules but fail closures, async, and event loop questions — Round 1 eliminations happen on JS, not JSX.',
    fix: 'Spend 30% of React prep on vanilla JavaScript before advanced patterns; pair with our JavaScript topic questions.',
  },
] as const

export const REACT_30_DAY_ROADMAP = [
  {
    week: 'Week 1 (Days 1–7)',
    focus: 'Fundamentals',
    items: [
      'JSX, components, props, and one-way data flow',
      'useState, event handling, and conditional rendering',
      'Component composition and lifting state up',
      'Build a todo or counter app from scratch without tutorials',
    ],
  },
  {
    week: 'Week 2 (Days 8–14)',
    focus: 'Hooks',
    items: [
      'useEffect, dependency arrays, and cleanup functions',
      'useRef, useMemo, useCallback, and when each applies',
      'Custom hooks — extract reusable logic',
      'Rules of hooks and eslint-plugin-react-hooks',
    ],
  },
  {
    week: 'Week 3 (Days 15–21)',
    focus: 'Performance + APIs',
    items: [
      'React.memo, list keys, and profiling with DevTools',
      'Context API vs Redux/Zustand trade-offs',
      'fetch integration, loading/error states, and optimistic UI',
      'Code splitting and lazy loading with React.lazy',
    ],
  },
  {
    week: 'Week 4 (Days 22–28)',
    focus: 'Mocks',
    items: [
      'Next.js basics — SSR vs CSR, routing, data fetching',
      'Answer all curated questions aloud with trade-offs',
      '3 timed mock interviews on hooks and architecture',
      'Review common mistakes and refine weak follow-ups',
    ],
  },
] as const

export const REACT_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Hub' },
  { href: '/interview-questions/topics/javascript', label: 'JavaScript Questions' },
  { href: '/interview-questions/topics/typescript', label: 'TypeScript Questions' },
  { href: '/interview-questions/topics/html-css', label: 'HTML & CSS Questions' },
  { href: '/interview-questions/react-developer', label: 'React Developer Role Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Hub' },
  { href: '/interview-questions/companies/freshworks/frontend-developer', label: 'Freshworks Frontend Hub' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Topic Map' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Guide' },
  { href: '/tools/question-generator/frontend-developer', label: 'Question Generator' },
] as const

export const REACT_FAQ_ITEMS = [
  {
    question: 'How many React.js interview questions should I prepare?',
    answer:
      'Aim for 30–50 core React questions across hooks, rendering, state management, and performance — but depth beats volume. Master 20 concepts you can explain with code examples and trade-offs rather than memorizing API lists.',
  },
  {
    question: 'Are React hooks mandatory for interviews in India?',
    answer:
      'Yes for virtually all 2026 loops. Class components appear rarely in new codebases. Expect useState, useEffect, useContext, and custom hooks in every product-company frontend round.',
  },
  {
    question: 'What is the difference between Context API and Redux?',
    answer:
      'Context shares values without prop drilling but re-renders all consumers on change. Redux adds predictable global state, middleware, devtools, and selector patterns for complex apps. Use Context for theme/locale; Redux or Zustand for frequent updates.',
  },
  {
    question: 'How important is Next.js for React interviews?',
    answer:
      'Increasingly common at product companies. Understand SSR vs CSR, App Router basics, and data fetching patterns. Not always required for fresher loops, but differentiates candidates targeting Next.js teams.',
  },
  {
    question: 'Do React interviews include JavaScript fundamentals?',
    answer:
      'Always. Closures, promises, event loop, and array methods are tested alongside React. Weak JavaScript causes rejections even when React syntax is correct.',
  },
  {
    question: 'What React performance topics matter most?',
    answer:
      'Reconciliation and keys, unnecessary re-renders, React.memo/useMemo/useCallback trade-offs, code splitting, and list virtualization. Lead with profiling — interviewers want measurement-first thinking.',
  },
  {
    question: 'How do I explain the virtual DOM in interviews?',
    answer:
      'Describe it as an in-memory UI tree. On state change, React diffs the new tree against the previous one (reconciliation) and applies minimal DOM updates. Mention keys for list identity and that virtual DOM is not automatic speed for every case.',
  },
  {
    question: 'What state management should I learn for React interviews?',
    answer:
      'Start with useState and lifting state. Add Context for shared low-frequency values. Learn Redux Toolkit or Zustand basics for global state discussions. Be ready to compare trade-offs, not advocate one library dogmatically.',
  },
  {
    question: 'How long does React interview prep take?',
    answer:
      'With JavaScript fundamentals in place, 3–4 weeks of focused study covers most fresher loops. Experienced hires targeting senior React roles should add system design and performance profiling practice.',
  },
  {
    question: 'What salary should I expect as a React developer in India (2026)?',
    answer:
      'Fresher React/frontend roles range 4–12 LPA at service firms and 10–22+ LPA at product companies depending on city, DSA depth, and portfolio quality. Confirm level and ESOP separately.',
  },
  {
    question: 'Should I build projects or grind questions for React prep?',
    answer:
      'Both. Ship one project with hooks, API integration, and error states — then use curated questions to articulate trade-offs aloud. Interviewers probe decisions from your project, not tutorial clones.',
  },
  {
    question: 'How should I use mock interviews for React prep?',
    answer:
      'Start after Week 2 of structured study. Run at least 3 mocks before real loops — mix hooks depth, live component coding, and architecture discussion. Review whether you explained trade-offs and avoided common hook mistakes.',
  },
] as const

export function isReactHub(skillSlug: string): boolean {
  return skillSlug === 'react'
}
