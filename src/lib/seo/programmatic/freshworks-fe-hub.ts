import type { SeoQuestion } from '@/lib/seo/programmatic/types'

export const FRESHWORKS_FE_HERO_PATH = '/blog/freshworks-frontend-developer-hero.png'
export const FRESHWORKS_FE_HERO_ALT =
  'Freshworks Frontend Developer interview preparation guide covering JavaScript, React, browser internals, CSS, performance optimization, and product thinking'
export const FRESHWORKS_FE_HERO_WIDTH = 1536
export const FRESHWORKS_FE_HERO_HEIGHT = 1024
export const FRESHWORKS_FE_PROCESS_PATH = '/blog/freshworks-frontend-developer-process-2026.png'
export const FRESHWORKS_FE_PROCESS_ALT =
  'Freshworks Frontend Developer hiring process flow 2026: Application, Online Coding, Frontend Round 1, Frontend Round 2, HR Interview, and Offer'
export const FRESHWORKS_FE_PROCESS_WIDTH = 1672
export const FRESHWORKS_FE_PROCESS_HEIGHT = 941
export const FRESHWORKS_FE_META_TITLE = 'Freshworks Frontend Interview Questions (2026)'
export const FRESHWORKS_FE_CANONICAL_PATH = '/interview-questions/companies/freshworks/frontend-developer'
export const FRESHWORKS_FE_DESCRIPTION =
  'Freshworks frontend interview prep for India 2026: JavaScript, React, browser internals, CSS, performance, product thinking, hiring process, and model answers.'
export const FRESHWORKS_FE_EDITORIAL_NOTE =
  'Content reviewed and updated for current Freshworks Frontend Developer hiring patterns — JavaScript depth, React component design, browser internals, CSS architecture, performance optimization, product thinking, and Chennai/Bengaluru product engineering expectations in India.'
export const FRESHWORKS_FE_READING_TIME = '26 min read'
export const FRESHWORKS_FE_PUBLISHED_DATE = '2026-06-06'
export const FRESHWORKS_FE_LAST_UPDATED = '2026-06-06'
export const FRESHWORKS_FE_REVIEWED_DATE = '2026-06-06'
export const FRESHWORKS_FE_AUTHOR_NAME = 'InterviewEra Team'
export const FRESHWORKS_FE_REVIEWER_NAME = 'InterviewEra Editorial'

export const FRESHWORKS_FE_TOC_SECTIONS = [
  { id: 'fw-why-different', label: 'Why Freshworks Frontend Interviews Are Different' },
  { id: 'fw-hiring-process', label: 'Freshworks Hiring Process' },
  { id: 'fw-javascript', label: 'JavaScript Fundamentals' },
  { id: 'fw-react', label: 'React Interviews' },
  { id: 'fw-react-architecture', label: 'React Architecture' },
  { id: 'fw-browser-internals', label: 'Browser Internals' },
  { id: 'fw-css-responsive', label: 'CSS & Responsive Design' },
  { id: 'fw-performance', label: 'Frontend Performance' },
  { id: 'fw-product-thinking', label: 'Product Thinking' },
  { id: 'fw-project-discussion', label: 'Frontend Project Discussion' },
  { id: 'fw-resume-examples', label: 'Resume Examples' },
  { id: 'fw-roadmap', label: 'Preparation Roadmap' },
  { id: 'fw-contextual-links', label: 'Related Preparation Guides' },
  { id: 'fw-questions', label: 'Interview Questions' },
  { id: 'fw-faq', label: 'FAQs' },
] as const

export const FRESHWORKS_PROCESS_FLOW_STEPS = [
  'Application',
  'Online Coding',
  'Frontend Round 1',
  'Frontend Round 2',
  'HR Interview',
  'Offer',
] as const

export const FRESHWORKS_HIRING_STEPS = [
  {
    step: 'Step 1 — Resume screening',
    body: 'Recruiters scan for React project depth, measurable UX impact, and product awareness. Highlight Freshdesk-adjacent work — real-time UI, complex forms, accessibility wins, and performance improvements with numbers.',
  },
  {
    step: 'Step 2 — Online coding round',
    body: 'Timed assessment covering JavaScript fundamentals, DSA basics (arrays, strings, objects), and sometimes React MCQs. Expect 60–90 minutes. Practice under clock pressure — many candidates are filtered here before live panels.',
  },
  {
    step: 'Step 3 — Technical interview 1',
    body: 'React concepts, component design, hooks, state management, and live UI implementation tasks. Panels expect you to explain trade-offs aloud while coding — not silent typing. Often includes a small component build (form, list, modal).',
  },
  {
    step: 'Step 4 — Technical interview 2',
    body: 'Browser internals, performance optimization, CSS architecture, and frontend system design. May include “how would you architect this feature?” discussions for Freshdesk-scale SaaS surfaces. Deeper than Round 1.',
  },
  {
    step: 'Step 5 — HR round',
    body: 'Behavioral questions, motivation, cultural fit, and role expectations. Prepare “why Freshworks,” product awareness (Freshdesk, Freshchat, Freshsales), and a concise story about a frontend challenge you solved.',
  },
  {
    step: 'Step 6 — Offer',
    body: 'Selected candidates receive the offer letter followed by onboarding and documentation. Compensation typically ranges 10–22 LPA depending on experience and level. Negotiate the full package after level confirmation.',
  },
] as const

export const FRESHWORKS_JS_TOPICS = [
  {
    topic: 'Closures',
    evaluates: 'Whether you understand lexical scope, can explain why closures retain outer variables, and apply them in real patterns (debounce, module pattern, React hooks).',
    mistakes: 'Describing closures as “functions inside functions” without explaining scope chain, or unable to debug stale closure bugs in async callbacks.',
    tips: 'Practice explaining: outer function returns inner function; inner function closes over outer variables. Write a debounce from scratch and trace which variables persist.',
  },
  {
    topic: 'Hoisting',
    evaluates: 'Understanding of temporal dead zone, function vs variable hoisting, and whether you can predict output of hoisting edge cases.',
    mistakes: 'Saying “everything moves to the top” without distinguishing `var`, `let`, `const`, and function declarations.',
    tips: 'Memorize: `var` hoists undefined; `let`/`const` hoist but stay in TDZ until declaration; function declarations hoist fully. Trace 3 hoisting quiz snippets aloud.',
  },
  {
    topic: 'Event Loop',
    evaluates: 'Call stack, microtask vs macrotask queue ordering, and whether you can explain why `setTimeout(0)` runs after a Promise.',
    mistakes: 'Conflating event loop with multi-threading, or unable to explain why UI freezes during long synchronous loops.',
    tips: 'Draw the loop: sync code → microtasks (Promises) → macrotasks (setTimeout). Explain how this affects React batching and async state updates.',
  },
  {
    topic: 'Promises',
    evaluates: 'Promise chaining, error propagation, `Promise.all` vs `Promise.allSettled`, and composing async flows without callback hell.',
    mistakes: 'Forgetting to return promises in chains, swallowing errors without `.catch`, or nesting `.then` instead of flattening.',
    tips: 'Practice converting callback APIs to Promises, handling parallel fetches with `Promise.all`, and explaining rejection propagation.',
  },
  {
    topic: 'Async/Await',
    evaluates: 'Clean async code structure, error handling with try/catch, and understanding that await yields to the event loop.',
    mistakes: 'Using await inside loops sequentially when parallel execution is needed, or missing try/catch around awaited calls.',
    tips: 'Rewrite Promise chains as async/await. Know when to use `Promise.all` with mapped async functions for parallel work.',
  },
  {
    topic: 'Scope',
    evaluates: 'Block vs function scope, closure implications, and avoiding global namespace pollution in large codebases.',
    mistakes: 'Using `var` in loops with setTimeout, or creating accidental globals by omitting `const`/`let`.',
    tips: 'Revise scope chain lookup, IIFE/module patterns, and how ES modules provide file-level scope in modern bundlers.',
  },
] as const

export const FRESHWORKS_REACT_TOPICS = [
  {
    topic: 'Virtual DOM',
    evaluates: 'Understanding reconciliation, diffing algorithm basics, and why React batches DOM updates instead of touching the real DOM on every state change.',
    mistakes: 'Calling it “a copy of the DOM” without explaining diffing, keys, or why unnecessary re-renders still cost performance.',
    tips: 'Explain: JSX → virtual tree → diff against previous tree → minimal real DOM patches. Mention keys in lists and why index keys break on reorder.',
  },
  {
    topic: 'Hooks',
    evaluates: 'Rules of hooks, custom hook extraction, and correct use of useState, useEffect, useRef, useMemo, and useCallback.',
    mistakes: 'Calling hooks conditionally, overusing useEffect for derived state, or missing cleanup in subscriptions/timers.',
    tips: 'Build a custom `useDebounce` or `useFetch` hook. Explain dependency array pitfalls and stale closure fixes.',
  },
  {
    topic: 'State Management',
    evaluates: 'When local state suffices vs Context vs external stores (Redux, Zustand). Freshworks panels probe trade-offs at SaaS scale.',
    mistakes: 'Putting everything in global state, or using Context for high-frequency updates that cause full-tree re-renders.',
    tips: 'State colocation first. Context for theme/auth. External store when many distant components share mutable state with middleware needs.',
  },
  {
    topic: 'Controlled Components',
    evaluates: 'Form state ownership, single source of truth, and validation patterns in complex multi-step forms (common in Freshdesk admin UI).',
    mistakes: 'Mixing controlled and uncontrolled inputs, or fighting React with direct DOM manipulation for form values.',
    tips: 'Default to controlled inputs. Explain when refs make sense (file inputs, third-party widgets). Show validation on blur vs submit.',
  },
  {
    topic: 'Context API',
    evaluates: 'Provider composition, avoiding unnecessary re-renders with split contexts or memoized values, and when Context is the wrong tool.',
    mistakes: 'One giant context object that re-renders the entire app on any field change.',
    tips: 'Split contexts by update frequency. Memoize provider values. Compare with prop drilling limits at 3+ levels.',
  },
  {
    topic: 'Performance Optimization',
    evaluates: 'React.memo, useMemo, useCallback, code splitting, list virtualization, and profiling with React DevTools.',
    mistakes: 'Premature memoization everywhere, or optimizing before measuring. Wrapping every callback in useCallback without profiling.',
    tips: 'Measure first with Profiler. Memoize expensive computations and stable callbacks passed to memoized children. Lazy-load route-level chunks.',
  },
] as const

export const FRESHWORKS_REACT_ARCHITECTURE_FLOW = [
  'User Action',
  'Component',
  'State Update',
  'Virtual DOM',
  'Diffing',
  'Real DOM Update',
] as const

export const FRESHWORKS_REACT_RECONCILIATION_POINTS = [
  'React schedules a re-render when state or props change — triggered by event handlers, effects, or parent updates.',
  'The component function runs again, producing a new virtual DOM tree (JSX compiled to React.createElement calls).',
  'React compares the new tree with the previous snapshot (diffing). It walks both trees node-by-node, using keys to match list items.',
  'Only nodes with actual changes are marked for update — unchanged subtrees are skipped entirely.',
  'React batches DOM mutations and applies minimal patches to the real DOM in a single commit phase.',
  'Concurrent features (React 18+) can interrupt, resume, or discard renders — but the diff-and-patch model remains the same.',
] as const

export const FRESHWORKS_PROJECT_DISCUSSION_TOPICS = [
  {
    area: 'Component Architecture',
    cover: 'How you split UI into reusable, single-responsibility components. Folder structure, container vs presentational patterns, and prop interface design.',
    questions: [
      'Walk me through how you structured components in your last project.',
      'When would you extract a custom hook vs a child component?',
      'How do you prevent prop drilling in a dashboard with 5+ nesting levels?',
    ],
  },
  {
    area: 'API Integration',
    cover: 'Fetching, caching, error handling, and loading states. REST vs GraphQL trade-offs, optimistic updates, and retry logic for SaaS admin panels.',
    questions: [
      'How did you handle API errors and loading states in your project?',
      'What happens if the user navigates away mid-fetch?',
      'How would you design data fetching for a paginated ticket list?',
    ],
  },
  {
    area: 'State Management',
    cover: 'Local vs global state decisions, Context vs external stores, and where server state (React Query/SWR) fits alongside client state.',
    questions: [
      'Why did you choose that state management approach?',
      'What state lived locally vs globally, and why?',
      'How did you handle form state across multi-step wizards?',
    ],
  },
  {
    area: 'Performance Optimization',
    cover: 'Profiling evidence, memoization decisions, code splitting, list virtualization, and bundle size impact — with before/after metrics.',
    questions: [
      'What was the slowest part of your app and how did you fix it?',
      'Did you use React.memo or useMemo? What did profiling show?',
      'How would you optimize rendering 10,000 rows in a table?',
    ],
  },
  {
    area: 'Accessibility',
    cover: 'Semantic HTML, keyboard navigation, ARIA usage, focus management, color contrast, and screen reader testing on real flows.',
    questions: [
      'How did you ensure your app was accessible?',
      'Walk me through focus management in your modal or drawer component.',
      'What accessibility audit tools did you use and what did you fix?',
    ],
  },
  {
    area: 'Testing',
    cover: 'Unit tests for utilities/hooks, component tests with React Testing Library, integration tests for critical flows, and what you chose not to test.',
    questions: [
      'What testing strategy did you follow and why?',
      'How do you test a component that fetches data on mount?',
      'What is the difference between testing implementation details vs user behaviour?',
    ],
  },
] as const

export const FRESHWORKS_BROWSER_TOPICS = [
  {
    topic: 'Rendering Pipeline',
    evaluates: 'Parse HTML → DOM, parse CSS → CSSOM, render tree, layout, paint, composite. Understanding where JS can block rendering.',
    mistakes: 'Treating “render” as a single step, or unable to explain why CSS in `<head>` matters for first paint.',
    tips: 'Walk through critical rendering path. Explain `defer` vs `async` scripts and how they affect DOMContentLoaded vs load.',
  },
  {
    topic: 'Reflow',
    evaluates: 'Layout-triggering properties (width, height, position) and strategies to batch DOM reads/writes to avoid layout thrashing.',
    mistakes: 'Interleaving offset reads with style writes in loops, causing forced synchronous layouts.',
    tips: 'Batch reads then writes. Use `transform` and `opacity` for animations — they skip layout. Mention DocumentFragment for bulk inserts.',
  },
  {
    topic: 'Repaint',
    evaluates: 'Paint-only changes vs reflow, and which CSS properties trigger which rendering stages.',
    mistakes: 'Assuming all style changes are equal cost, or animating `top`/`left` instead of `transform`.',
    tips: 'Use compositor-only properties for 60fps animations. Explain `will-change` sparingly and layer promotion trade-offs.',
  },
  {
    topic: 'Event Loop (Browser)',
    evaluates: 'How browser event loop interacts with rendering — requestAnimationFrame, microtasks starving macrotasks, and long task impact on INP.',
    mistakes: 'Blocking the main thread with heavy sync work and wondering why the UI freezes during scroll.',
    tips: 'Chunk long work with `requestIdleCallback` or Web Workers. Schedule visual updates in rAF callbacks.',
  },
  {
    topic: 'Memory Management',
    evaluates: 'Garbage collection basics, common leak patterns (detached DOM nodes, forgotten listeners, closures holding large objects).',
    mistakes: 'Adding event listeners without cleanup in SPAs, or retaining references in module-level caches indefinitely.',
    tips: 'Always remove listeners in useEffect cleanup. Use WeakMap for caches keyed by DOM. Profile heap snapshots in DevTools.',
  },
] as const

export const FRESHWORKS_CSS_TOPICS = [
  {
    topic: 'Flexbox',
    evaluates: 'Main/cross axis, flex-grow/shrink/basis, and building responsive nav bars, card rows, and centering without hacks.',
    mistakes: 'Using flex without understanding `flex: 1` shorthand, or fighting `min-width: auto` overflow in flex children.',
    tips: 'Practice holy-grail layout, sticky footer, and equal-height cards. Know when flex beats grid (1D layouts).',
  },
  {
    topic: 'CSS Grid',
    evaluates: 'Grid template areas, fr units, auto-fill/minmax for responsive grids, and combining grid with flex for complex dashboards.',
    mistakes: 'Using grid for simple single-axis layouts, or hardcoding column counts instead of responsive `auto-fit` patterns.',
    tips: 'Build a Freshdesk-style ticket list grid. Use `grid-template-areas` for page shells. Combine subgrid where supported.',
  },
  {
    topic: 'Responsive Design',
    evaluates: 'Mobile-first breakpoints, fluid typography, container queries awareness, and content-driven breakpoints over device widths.',
    mistakes: 'Desktop-first CSS with excessive overrides, or fixed pixel breakpoints copied from Bootstrap defaults.',
    tips: 'Start mobile-first with `min-width` media queries. Use `clamp()` for fluid type. Test at 320px, 768px, and 1440px.',
  },
  {
    topic: 'Accessibility',
    evaluates: 'Semantic HTML, ARIA when necessary, keyboard navigation, focus management, color contrast, and screen reader compatibility.',
    mistakes: 'Div soup with onClick instead of buttons, missing alt text, or aria-label on everything instead of proper semantics.',
    tips: 'Audit with axe DevTools. Tab through your app without a mouse. Manage focus on modal open/close. WCAG AA contrast minimum.',
  },
  {
    topic: 'Mobile First Design',
    evaluates: 'Progressive enhancement, touch targets (44px minimum), performance on low-end devices, and network-aware loading.',
    mistakes: 'Shipping desktop-sized bundles to mobile, or hiding critical content behind hover-only interactions.',
    tips: 'Design core flows for 375px first. Lazy-load below-fold content. Test on real mid-range Android devices, not just Chrome DevTools.',
  },
] as const

export const FRESHWORKS_PERFORMANCE_TOPICS = [
  {
    topic: 'Code Splitting',
    evaluates: 'Route-level and component-level splitting with dynamic import, webpack/vite chunk strategy, and prefetching critical routes.',
    mistakes: 'One monolithic bundle for the entire app, or splitting so aggressively that waterfall loading hurts UX.',
    tips: 'Split by route with React.lazy + Suspense. Prefetch likely next routes on hover or idle. Analyze bundle with webpack-bundle-analyzer.',
  },
  {
    topic: 'Lazy Loading',
    evaluates: 'Images (loading="lazy"), components, and data — knowing when lazy hurts LCP vs when it saves bandwidth.',
    mistakes: 'Lazy-loading above-the-fold hero images, or lazy-loading components needed for first interaction.',
    tips: 'Eager-load LCP image with fetchpriority="high". Lazy-load below-fold images and heavy modals. Intersection Observer for custom lazy patterns.',
  },
  {
    topic: 'Memoization',
    evaluates: 'When to memoize computations (useMemo), callbacks (useCallback), and components (React.memo) — with measurement evidence.',
    mistakes: 'Memoizing cheap operations, or creating new object references in render that defeat memoization.',
    tips: 'Profile before memoizing. Stabilize object/array deps with useMemo. Extract static objects outside components.',
  },
  {
    topic: 'Bundle Optimization',
    evaluates: 'Tree shaking, dead code elimination, analyzing bundle size, replacing heavy libraries, and modern build tooling.',
    mistakes: 'Importing entire lodash/moment libraries, or shipping duplicate dependencies across chunks.',
    tips: "Use `import { debounce } from lodash-es`. Replace moment with date-fns. Set bundle size budgets in CI.",
  },
  {
    topic: 'Lighthouse',
    evaluates: 'Core Web Vitals (LCP, INP, CLS), interpreting Lighthouse audits, and translating scores into actionable fixes.',
    mistakes: 'Chasing 100 score without fixing real user metrics, or optimizing lab scores while field data stays poor.',
    tips: 'Focus on LCP element, reduce JS execution time for INP, reserve space for images/fonts for CLS. Compare lab vs CrUX field data.',
  },
] as const

export const FRESHWORKS_PRODUCT_THINKING_TOPICS = [
  {
    title: 'How would you improve Freshdesk?',
    body: 'Freshdesk is a customer support platform used by thousands of agents daily. Strong answers identify a specific agent pain point — ticket triage overload, context switching between channels, or slow search — then propose a measurable UX improvement with clear success metrics (time-to-first-response, tickets closed per hour).',
  },
  {
    title: 'How would you improve Freshchat?',
    body: 'Freshchat handles live messaging and chatbots. Interviewers want user-journey thinking: reduce visitor-to-agent handoff friction, improve chat widget load time on third-party sites, or design better bot-to-human escalation UX. Tie ideas to Freshworks’ multi-product ecosystem.',
  },
  {
    title: 'How would you improve onboarding UX?',
    body: 'SaaS onboarding determines activation and retention. Discuss progressive disclosure, empty states, contextual tooltips vs modal tours, and measuring time-to-first-value. Reference how Freshworks products onboard new admin users without overwhelming them.',
  },
] as const

export const FRESHWORKS_PRODUCT_THINKING_EVALUATES = [
  'User empathy — do you start from a real persona pain point, not a feature wishlist?',
  'Prioritization — can you pick one improvement and defend why it beats alternatives?',
  'Metrics — do you define how you would measure success (activation rate, task completion time, NPS)?',
  'Technical feasibility — do you acknowledge engineering constraints and phased rollout?',
  'Product awareness — do you reference Freshworks products and their user base authentically?',
] as const

export const FRESHWORKS_RESUME_EXAMPLES = [
  {
    title: 'Performance gains',
    bad: '“Improved application performance using React.”',
    good: '“Reduced dashboard initial load from 4.2s to 1.8s (57% faster) by code-splitting routes, lazy-loading charts, and memoizing expensive filter computations — Lighthouse performance score 38 → 82.”',
  },
  {
    title: 'Accessibility',
    bad: '“Made the website accessible.”',
    good: '“Refactored checkout flow to WCAG 2.1 AA — added keyboard navigation, ARIA live regions for form errors, and 4.5:1 contrast fixes — reducing accessibility-related support tickets 31%.”',
  },
  {
    title: 'UX impact',
    bad: '“Built a new UI for the admin panel.”',
    good: '“Redesigned ticket assignment UI with drag-and-drop and inline previews — cut average triage time from 45s to 18s per ticket across 200 daily active agents.”',
  },
  {
    title: 'Measurable outcomes',
    bad: '“Worked on responsive design for mobile users.”',
    good: '“Shipped mobile-first responsive redesign for 12 core pages — mobile bounce rate dropped 22% and mobile conversion increased 15% over 6 weeks (12k MAU).”',
  },
] as const

export const FRESHWORKS_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'JavaScript',
    items: [
      'Closures, hoisting, scope — write and explain 5 code snippets aloud.',
      'Event loop, Promises, async/await — trace execution order on paper.',
      'ES6+ features: destructuring, spread, optional chaining, modules.',
      'Practice 10 OA-style JS problems (arrays, objects, strings).',
    ],
  },
  {
    week: 'Week 2',
    focus: 'React',
    items: [
      'Hooks deep dive — custom hooks, useEffect cleanup, dependency arrays.',
      'Controlled forms, Context API, state management trade-offs.',
      'Build 2 components live: searchable list + multi-step form.',
      'React DevTools Profiler — find and fix one unnecessary re-render.',
    ],
  },
  {
    week: 'Week 3',
    focus: 'Browser + CSS',
    items: [
      'Rendering pipeline, reflow/repaint, event loop interaction with rAF.',
      'Flexbox + Grid layouts — rebuild a dashboard shell from scratch.',
      'Responsive mobile-first CSS, accessibility audit with axe.',
      'Lighthouse audit — fix LCP, INP, and CLS on a personal project.',
    ],
  },
  {
    week: 'Week 4',
    focus: 'Mock Interviews + Product Thinking',
    items: [
      'Run 2 timed mock technical rounds (component build + JS deep dive).',
      'Prepare 3 product improvement answers (Freshdesk, Freshchat, onboarding).',
      'Polish resume bullets with metrics — performance, a11y, UX impact.',
      'HR prep: “why Freshworks,” project stories, and salary research.',
    ],
  },
] as const

export const FRESHWORKS_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Interview Questions' },
  { href: '/interview-questions/topics/javascript', label: 'JavaScript Interview Questions' },
  { href: '/interview-questions/topics/react', label: 'React Interview Questions' },
  { href: '/interview-questions/topics/html-css', label: 'HTML & CSS Interview Questions' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Interview Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
] as const

export const FRESHWORKS_FE_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/topics/react', label: 'React Interview Questions' },
  { href: '/interview-questions/topics/javascript', label: 'JavaScript Interview Questions' },
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Questions' },
  { href: '/interview-questions/topics/html-css', label: 'HTML & CSS Interview Questions' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
  { href: '/interview-questions/companies/freshworks/software-engineer', label: 'Freshworks SWE Questions' },
  { href: '/interview-questions/companies/tcs/frontend-developer', label: 'TCS Frontend Questions' },
  { href: '/interview-questions/companies/accenture/frontend-developer', label: 'Accenture Frontend Questions' },
  { href: '/interview-questions/companies/zoho/frontend-developer', label: 'Zoho Frontend Questions' },
  { href: '/interview-questions/companies/freshworks', label: 'Freshworks Company Hub' },
  { href: '/interview-questions/companies/amazon/software-engineer', label: 'Amazon SWE Questions' },
  { href: '/interview-questions/companies/microsoft/software-engineer', label: 'Microsoft SWE Questions' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Interview Questions' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Behavioral Interview Questions' },
  { href: '/interview-questions/topics/html-css', label: 'HTML & CSS Interview Questions' },
] as const

export const FRESHWORKS_FE_QUESTIONS: readonly SeoQuestion[] = [
  {
    question: 'What is the difference between `==` and `===` in JavaScript?',
    category: 'technical',
    difficulty: 'easy',
    tip: '`==` uses type coercion (0 == "0" is true). `===` checks both value and type (0 === "0" is false). Always prefer `===` in production code to avoid subtle bugs.',
    keywords: ['type coercion', 'strict equality', 'loose equality', 'JavaScript'],
    evaluates: 'Whether you understand JavaScript type coercion rules and default to strict equality in production code.',
    strategy: 'Define both operators, give one coercion example (`null == undefined` is true), one strict example (`NaN === NaN` is false), then state your production default.',
    mistakes: 'Saying they are identical, or being unable to explain when `==` might still appear in legacy codebases.',
    followUps: ['What about `Object.is()` vs `===`?', 'What happens with `[] == false`?'],
  },
  {
    question: 'What is the virtual DOM in React and why does it exist?',
    category: 'technical',
    difficulty: 'easy',
    tip: 'It is an in-memory representation of the real DOM. React diffs the virtual DOM before touching the real DOM, minimising expensive repaints and reflows.',
    keywords: ['virtual DOM', 'reconciliation', 'diffing', 'performance'],
    evaluates: 'Understanding of reconciliation, diffing, and why batched DOM updates matter for performance.',
    strategy: 'Explain JSX → virtual tree → diff → minimal DOM patches. Mention keys in lists. Contrast with direct DOM manipulation cost.',
    mistakes: 'Claiming virtual DOM is always faster than direct DOM, or unable to explain what happens during a re-render.',
    followUps: ['What role do keys play in reconciliation?', 'When would you bypass React and touch the DOM directly?'],
  },
  {
    question: 'Explain CSS specificity. Which rule wins: an ID selector or a class selector?',
    category: 'technical',
    difficulty: 'easy',
    tip: 'Specificity order: inline style > ID > class/pseudo-class/attribute > element. An ID selector (0,1,0,0) beats a class selector (0,0,1,0). Use the three-number notation to explain.',
    keywords: ['CSS specificity', 'ID selector', 'class selector', 'cascade'],
    evaluates: 'Cascade and specificity reasoning — critical for debugging styling conflicts in large SaaS codebases.',
    strategy: 'State specificity tiers, compute scores for ID vs class example, mention `!important` as escape hatch and why to avoid it.',
    mistakes: 'Saying “whichever comes last in the file wins” without mentioning specificity, or confusing inheritance with specificity.',
    followUps: ['How does `:not()` affect specificity?', 'What beats an inline style?'],
  },
  {
    question: 'What is event bubbling in JavaScript? How do you stop it?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Events bubble up from the target element to the root. Use `event.stopPropagation()` to stop bubbling. Distinguish this from `event.preventDefault()` which stops default browser behaviour.',
    keywords: ['event bubbling', 'stopPropagation', 'event delegation', 'DOM'],
    evaluates: 'DOM event model understanding and practical use of event delegation for performance.',
    strategy: 'Describe capture → target → bubble phases. Explain stopPropagation vs preventDefault. Give event delegation example on a list.',
    mistakes: 'Confusing preventDefault with stopPropagation, or not knowing about the capture phase.',
    followUps: ['What is event delegation and when is it useful?', 'How do React synthetic events relate to native bubbling?'],
  },
  {
    question: 'What are the differences between `let`, `const`, and `var`?',
    category: 'technical',
    difficulty: 'easy',
    tip: '`var`: function-scoped, hoisted. `let`: block-scoped, not hoisted to usable state. `const`: block-scoped, must be initialised, cannot be reassigned (but object properties can mutate).',
    keywords: ['let', 'const', 'var', 'hoisting', 'block scope'],
    evaluates: 'ES6 scoping knowledge and whether you write modern JavaScript by default.',
    strategy: 'Compare scope, hoisting, and reassignment for each. Give the classic `var` in for-loop + setTimeout bug example.',
    mistakes: 'Saying const makes objects immutable, or being unable to explain temporal dead zone.',
    followUps: ['What is the temporal dead zone?', 'When would you still see var in a codebase?'],
  },
  {
    question: 'What is the difference between controlled and uncontrolled components in React?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Controlled: form data driven by React state via `value` + `onChange`. Uncontrolled: form data handled by the DOM itself, accessed via a ref. Prefer controlled for complex forms.',
    keywords: ['controlled component', 'uncontrolled component', 'React state', 'form'],
    evaluates: 'Form architecture decisions — Freshdesk has complex multi-field admin forms where this matters daily.',
    strategy: 'Define both with code sketch. State when to prefer each (controlled for validation/multi-step; uncontrolled for simple/file inputs).',
    mistakes: 'Mixing controlled and uncontrolled on the same input, or defaulting to uncontrolled without justification.',
    followUps: ['How would you build a multi-step form?', 'How do you validate on blur vs on submit?'],
  },
  {
    question: 'How do you optimise the performance of a React application?',
    category: 'technical',
    difficulty: 'hard',
    tip: 'Key strategies: React.memo/useMemo/useCallback to prevent unnecessary re-renders; code splitting with lazy(); virtualising long lists with react-virtual; avoiding inline function definitions in JSX.',
    keywords: ['React.memo', 'useMemo', 'useCallback', 'code splitting', 'lazy loading'],
    evaluates: 'Breadth of performance toolkit and whether you measure before optimizing.',
    strategy: 'Start with “profile first.” Cover memoization, code splitting, list virtualization, bundle size, and image optimization. Give one concrete before/after metric.',
    mistakes: 'Listing techniques without prioritization, or memoizing everything without profiling evidence.',
    followUps: ['When does useCallback hurt more than help?', 'How would you optimize a list of 10,000 tickets?'],
  },
  {
    question: 'How do you ensure cross-browser compatibility in your CSS and JavaScript?',
    category: 'technical',
    difficulty: 'medium',
    tip: 'Use caniuse.com to check feature support; Autoprefixer for vendor prefixes; Babel for JS transpilation; test in Chrome, Firefox, Safari. Mention fallback strategies.',
    keywords: ['cross-browser', 'Autoprefixer', 'Babel', 'caniuse', 'polyfill'],
    evaluates: 'Practical compatibility workflow — Freshworks products must work across browsers globally.',
    strategy: 'Feature detection over browser sniffing. Mention build tools (Babel, PostCSS/Autoprefixer), polyfills, progressive enhancement, and real device testing.',
    mistakes: 'Only testing in Chrome, or relying on user-agent sniffing instead of feature detection.',
    followUps: ['How do you handle Safari-specific bugs?', 'What is @supports used for?'],
  },
  {
    question: 'Tell me about a frontend component or feature you built that you are most proud of.',
    category: 'behavioral',
    difficulty: 'medium',
    tip: 'Be specific — name the component, the challenge it solved, and what you\'d do differently now. Showing genuine reflection impresses interviewers more than generic answers.',
    keywords: ['portfolio', 'technical depth', 'reflection'],
    evaluates: 'Ownership, technical depth, impact metrics, and self-awareness — not just resume recitation.',
    strategy: 'Use STAR: Situation (user problem), Task (your role), Action (technical decisions), Result (metrics). End with one thing you would improve today.',
    mistakes: 'Vague team stories with no personal contribution, or no metrics/outcome.',
    followUps: ['What was the hardest technical decision?', 'What would you refactor if you rebuilt it today?'],
  },
  {
    question: 'How would you approach building a fully responsive design from a desktop Figma mockup?',
    category: 'situational',
    difficulty: 'medium',
    tip: 'Mobile-first CSS, fluid typography with clamp(), CSS Grid for layouts, relative units (%, rem) over fixed pixels, media breakpoints at content-break points not device widths.',
    keywords: ['responsive design', 'mobile-first', 'CSS Grid', 'media queries', 'fluid typography'],
    evaluates: 'Real-world frontend workflow from design handoff to responsive implementation.',
    strategy: 'Mobile-first approach, identify breakpoints from content not devices, use Grid/Flexbox, fluid type with clamp(), test at key widths, collaborate with designer on edge cases.',
    mistakes: 'Scaling down desktop layout with zoom, or hardcoding iPhone-specific breakpoints.',
    followUps: ['How do container queries change this approach?', 'How do you handle responsive images?'],
  },
] as const

export const FRESHWORKS_FAQ_ITEMS = [
  {
    question: 'How many interview rounds does Freshworks have for Frontend Developer roles?',
    answer: 'Most Freshworks Frontend Developer loops in India have 3 core interview rounds after resume screening: an online coding assessment, two technical frontend rounds (React/JS + browser/performance), and an HR round. Total timeline from application to offer is typically 2–4 weeks.',
  },
  {
    question: 'Does Freshworks hire frontend developers as freshers?',
    answer: 'Freshworks primarily hires experienced frontend engineers (1–5+ years), though exceptional campus candidates with strong React portfolios and open-source contributions may be considered. Focus on demonstrable projects with measurable impact rather than CGPA alone.',
  },
  {
    question: 'What JavaScript concepts are most important for Freshworks frontend interviews?',
    answer: 'Closures, hoisting, event loop, Promises, async/await, and scope are tested most frequently. Panels expect you to explain concepts with code examples and trace execution order — not just recite definitions.',
  },
  {
    question: 'How much React knowledge is required for Freshworks frontend roles?',
    answer: 'Deep React knowledge is essential: hooks, virtual DOM, controlled components, Context API, state management trade-offs, and performance optimization. Expect live component-building tasks in technical Round 1.',
  },
  {
    question: 'Is DSA required for Freshworks frontend interviews?',
    answer: 'Yes, but at a moderate level. The online coding round tests arrays, strings, objects, and basic algorithms. Technical rounds focus more on frontend-specific problems than hard LeetCode mediums, but strong JS problem-solving helps.',
  },
  {
    question: 'What salary can a Frontend Developer expect at Freshworks in India?',
    answer: 'Freshworks Frontend Developer compensation typically ranges from 10–22 LPA depending on experience level, with senior engineers earning toward the higher end. Packages include base salary, RSUs, and benefits.',
  },
  {
    question: 'Does Freshworks ask system design questions for frontend roles?',
    answer: 'Technical Round 2 often includes frontend system design — architecting a feature like a real-time notification panel, infinite scroll ticket list, or multi-tenant widget system. It is lighter than backend system design but tests component architecture and data flow.',
  },
  {
    question: 'What products should I know before a Freshworks frontend interview?',
    answer: 'Know Freshdesk (customer support), Freshchat (live chat), Freshsales (CRM), and Freshservice (ITSM). Understanding their user personas — support agents, sales reps, IT admins — helps in product thinking and motivation answers.',
  },
  {
    question: 'How should I prepare for the Freshworks online coding round?',
    answer: 'Practice 30–40 JavaScript problems on arrays, strings, and objects under timed conditions. Review React MCQs on hooks, lifecycle, and state. Aim for 60–90 minutes of focused practice daily for two weeks before the assessment.',
  },
  {
    question: 'What makes Freshworks frontend interviews different from service companies?',
    answer: 'Freshworks is a product company — panels evaluate product thinking, UX impact, and performance optimization alongside JavaScript/React depth. Service company interviews focus more on framework trivia; Freshworks probes whether you can ship production-quality UI at SaaS scale.',
  },
  {
    question: 'Should I know Ruby on Rails for Freshworks frontend interviews?',
    answer: 'Ruby on Rails knowledge is a nice-to-have, not a requirement for frontend roles. Freshworks is migrating toward React frontends with modern backend services. Focus on JavaScript, React, CSS, and browser internals first.',
  },
  {
    question: 'How important is accessibility for Freshworks frontend interviews?',
    answer: 'Very important. Freshworks products serve global users including those using assistive technology. Expect questions on semantic HTML, ARIA, keyboard navigation, and WCAG compliance. Include accessibility wins in your resume bullets.',
  },
] as const

export function isFreshworksFrontendDeveloperHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'freshworks' && roleSlug === 'frontend-developer'
}

/**
 * Audit status (2026-06-06):
 * PRODUCTION READY — hero + process assets, sticky TOC, React architecture flow, project discussion section, E-E-A-T aside, 17 contextual internal links, expanded question cards.
 * SEO READY — self-canonical, index/follow, Article/FAQPage/BreadcrumbList/ItemList/@graph JSON-LD (WebSite, Organization, WebPage, ImageObject ×2, Person author + reviewer).
 * INDEXING READY — isIntersectionIndexable(freshworks, frontend-developer); questions-sitemap + IndexNow eligible.
 */
