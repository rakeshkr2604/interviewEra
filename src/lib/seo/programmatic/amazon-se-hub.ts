export const AMAZON_SE_HERO_PATH = '/blog/amazon-software-engineer-hero.webp'
export const AMAZON_SE_HERO_ALT =
  'Amazon Software Engineer interview preparation guide covering Online Assessment, Technical Rounds, Leadership Principles, Bar Raiser, and offer journey'
export const AMAZON_SE_HERO_WIDTH = 1536
export const AMAZON_SE_HERO_HEIGHT = 1024
export const AMAZON_SE_PROCESS_PATH = '/blog/amazon-software-engineer-process-2026.webp'
export const AMAZON_SE_PROCESS_ALT =
  'Amazon Software Engineer interview process flow 2026: Application, Recruiter Screen, Online Assessment, Technical Rounds, Behavioural Round, Bar Raiser, and Offer'
export const AMAZON_SE_PROCESS_WIDTH = 1728
export const AMAZON_SE_PROCESS_HEIGHT = 910
export const AMAZON_SE_META_TITLE = 'Amazon SDE Interview Questions (2026)'
export const AMAZON_SE_CANONICAL_PATH = '/interview-questions/companies/amazon/software-engineer'
export const AMAZON_SE_DESCRIPTION =
  'Amazon SDE interview prep for India 2026: OA, Leadership Principles, STAR method, Bar Raiser, technical rounds, and model answers.'
export const AMAZON_SE_EDITORIAL_NOTE =
  'Content reviewed and updated for current Amazon SDE hiring patterns, OA formats, and Bar Raiser evaluation trends in India.'
export const AMAZON_SE_READING_TIME = '26 min read'
export const AMAZON_SE_PUBLISHED_DATE = '2026-05-31'
export const AMAZON_SE_LAST_UPDATED = '2026-06-05'
export const AMAZON_SE_REVIEWED_DATE = '2026-06-05'
export const AMAZON_SE_AUTHOR_NAME = 'InterviewEra Team'
export const AMAZON_SE_REVIEWER_NAME = 'InterviewEra Editorial'

export const AMAZON_SE_TOC_SECTIONS = [
  { id: 'amazon-why-different', label: 'Why Amazon Interviews Are Different' },
  { id: 'amazon-hiring-philosophy', label: 'Amazon Hiring Philosophy' },
  { id: 'amazon-interview-process', label: 'Amazon Interview Process' },
  { id: 'amazon-resume-examples', label: 'Resume Examples' },
  { id: 'amazon-online-assessment', label: 'Online Assessment' },
  { id: 'amazon-technical-rounds', label: 'Technical Rounds' },
  { id: 'amazon-leadership-principles', label: 'Leadership Principles' },
  { id: 'amazon-star-method', label: 'STAR Method' },
  { id: 'amazon-bar-raiser', label: 'Bar Raiser Round' },
  { id: 'amazon-roadmap', label: 'Preparation Roadmap' },
  { id: 'amazon-prep-resources', label: 'Preparation Resources' },
  { id: 'amazon-company-comparison', label: 'Amazon vs Big Tech Interviews' },
  { id: 'amazon-questions', label: 'Common Amazon Questions' },
  { id: 'amazon-faq', label: 'FAQs' },
] as const

export const AMAZON_PREP_RESOURCE_LINKS = [
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Interview Questions' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Interview Questions' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Behavioural Interview Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Interview Questions' },
] as const

export const AMAZON_COMPANY_COMPARISON_ROWS = [
  ['Hiring Difficulty', 'High — LP depth + Bar Raiser veto', 'Very High — multi-round DSA + design', 'High — OA + structured loop panels', 'High — coding intensity + product sense'],
  ['DSA Depth', 'High — two live coding rounds', 'Very High — multiple onsite coding rounds', 'High — OA + technical panels', 'High — coding + analytical follow-ups'],
  ['Behavioral Weight', 'Very High — 16 Leadership Principles', 'Medium — Googleyness + collaboration', 'Medium — growth mindset narratives', 'Medium-High — values + impact stories'],
  ['System Design Weight', 'Common at SDE-2+; lighter at entry', 'Dedicated onsite design round', 'Common at senior levels', 'Heavy for senior IC tracks'],
  ['Culture Focus', 'Ownership + customer-backward decisions', 'Googleyness + intellectual humility', 'Growth mindset + inclusive collaboration', 'Move fast + measurable product impact'],
  ['Hiring Process', 'OA → Tech ×2 → LP → Bar Raiser', 'Recruiter → Phone → Onsite (4–5)', 'OA → 4–5 loop rounds', 'Recruiter → Technical → Behavioural'],
  ['Offer Timeline', '4–8 weeks', '4–8 weeks', '3–6 weeks', '4–10 weeks'],
] as const

export const AMAZON_SWE_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/companies/google/software-engineer', label: 'Google SWE Questions' },
  { href: '/interview-questions/companies/microsoft/software-engineer', label: 'Microsoft SWE Questions' },
  { href: '/interview-questions/software-engineer', label: 'Meta SWE Questions' },
  { href: '/interview-questions/ios-developer', label: 'Apple SWE Questions' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Questions' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Behavioral Questions' },
] as const

export const AMAZON_BAR_RAISER_CARDS = [
  {
    title: 'Why Amazon Uses Bar Raisers',
    body: 'Bar Raisers are trained interviewers from outside the hiring team who protect long-term hiring quality. They prevent local team pressure from lowering the bar and provide a consistent, cross-org calibration point for every loop.',
  },
  {
    title: 'What Bar Raisers Evaluate',
    body: 'Leadership Principles depth, decision quality under ambiguity, self-awareness, and whether you raise team standards — not just personal output. They probe follow-ups until your reasoning is explicit.',
  },
  {
    title: 'Common Rejection Reasons',
    body: 'Vague STAR stories, shallow metrics, blame-shifting in failure answers, rehearsed slogans without trade-offs, or strong technical scores with no ownership evidence.',
  },
  {
    title: 'How To Prepare',
    body: 'Prepare 10–12 stories across LPs, practise 3-level follow-ups, and rehearse “what would you do differently today?” for each story. Run at least one mock with LP-heavy behavioural focus before your loop.',
  },
] as const

export const AMAZON_RESUME_EXAMPLES = [
  {
    title: 'Ownership',
    bad: '“Worked on backend APIs with the team.”',
    good: '“Owned checkout API reliability for payment retries — designed idempotency keys, on-call runbooks, and post-incident fixes across 3 services.”',
  },
  {
    title: 'Metrics',
    bad: '“Improved application performance.”',
    good: '“Reduced p99 API latency from 420ms to 180ms (57% drop) by adding Redis caching and query batching on the orders service.”',
  },
  {
    title: 'Impact',
    bad: '“Built a feature users liked.”',
    good: '“Shipped one-click reorder flow that lifted repeat purchase rate 12% and cut cart-abandon support tickets 23% over 8 weeks.”',
  },
  {
    title: 'Technical depth',
    bad: '“Used AWS and databases in projects.”',
    good: '“Designed event-driven inventory sync on SQS + Lambda with DynamoDB conditional writes; handled 15k events/min with at-least-once delivery guarantees.”',
  },
] as const

export const AMAZON_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'DSA',
    items: ['40 timed medium problems (arrays, trees, graphs)', 'Binary search, sliding window, two pointers', 'Practice narrating approach before coding'],
  },
  {
    week: 'Week 2',
    focus: 'Online Assessment',
    items: ['2–3 full timed OA simulations per week', 'Work-style and debugging-style drills', 'Review misread prompts — OA penalizes interpretation errors'],
  },
  {
    week: 'Week 3',
    focus: 'Leadership Principles',
    items: ['Write 10 STAR stories mapped to top LPs', 'Add metrics, trade-offs, and lessons learned', 'Record answers and trim to 3–4 minutes each'],
  },
  {
    week: 'Week 4',
    focus: 'Mock Interviews and STAR',
    items: ['Full-loop mocks (technical + behavioural)', 'Bar Raiser follow-up drills', 'Polish resume bullets to match story evidence'],
  },
] as const

export const AMAZON_PROCESS_STEPS = [
  'Application',
  'Recruiter Screen',
  'Online Assessment',
  'Technical Round 1',
  'Technical Round 2',
  'Behavioural Round',
  'Bar Raiser',
  'Offer',
] as const

export const AMAZON_LP_CARDS = [
  {
    title: 'Customer Obsession',
    meaning: 'Start with the customer and work backwards. Decisions should improve customer outcomes even when inconvenient internally.',
    evaluates: 'Whether you optimize for users and measurable customer impact — not internal shortcuts or vanity metrics.',
    sampleQuestion: 'Tell me about a time you prioritized customer impact over internal convenience.',
    strongSignal: 'Names the customer segment, trade-off you rejected, and a quantified outcome tied to user experience.',
    weakSignal: 'Generic “we cared about users” with no metrics, no personal decision, and no cost accepted.',
  },
  {
    title: 'Ownership',
    meaning: 'Think long-term and act on behalf of the entire company — not just your team or ticket queue.',
    evaluates: 'End-to-end accountability including what happens after handoff — monitoring, follow-through, and unowned gaps you closed.',
    sampleQuestion: 'Describe a problem you owned beyond your formal responsibility.',
    strongSignal: 'Clear “I owned” actions, scope beyond your role, and sustained outcome after delivery.',
    weakSignal: 'Passive “the team handled it” with no personal agency or long-term follow-up.',
  },
  {
    title: 'Invent and Simplify',
    meaning: 'Find simpler solutions and challenge legacy complexity instead of copying how things were done before.',
    evaluates: 'Pragmatic invention — simpler design, less operational burden, without over-engineering for show.',
    sampleQuestion: 'Tell me about a time you simplified a process or system that others accepted as complex.',
    strongSignal: 'Before/after complexity comparison, why alternatives were rejected, and maintenance or cost saved.',
    weakSignal: 'Buzzwords about “innovation” with no simplification evidence or trade-off discussion.',
  },
  {
    title: 'Learn and Be Curious',
    meaning: 'Continuously improve and explore new ideas with genuine curiosity, not performative learning.',
    evaluates: 'Honest reflection after failure or surprise — what you changed in behaviour, not just what you read.',
    sampleQuestion: 'Tell me about a time you failed and what you changed afterward.',
    strongSignal: 'Specific failure, root cause you discovered, and concrete habit or process you changed.',
    weakSignal: 'Sanitized failure with no lesson, or “I always learn from mistakes” without examples.',
  },
  {
    title: 'Hire and Develop the Best',
    meaning: 'Raise the bar through coaching, feedback, and raising standards on teams you influence.',
    evaluates: 'Mentoring quality, candid feedback delivery, and whether you improved others’ performance measurably.',
    sampleQuestion: 'How have you helped someone on your team improve their performance?',
    strongSignal: 'Coaching actions you took, feedback you gave, and measurable improvement in the mentee’s output.',
    weakSignal: 'Vague “I’m a team player” with no development arc or outcomes for the other person.',
  },
  {
    title: 'Insist on Highest Standards',
    meaning: 'Do not accept “good enough” when quality, reliability, or customer trust is at stake.',
    evaluates: 'Examples where you caught issues early, blocked risky releases, or raised quality bars others ignored.',
    sampleQuestion: 'Tell me about a time you refused to ship something that did not meet your standards.',
    strongSignal: 'Quality criteria you enforced, pushback you faced, and customer or reliability outcome protected.',
    weakSignal: 'Perfectionism without stakes — or shipping despite known issues with no accountability.',
  },
  {
    title: 'Bias for Action',
    meaning: 'Move decisively when speed matters, while still using judgment — not reckless rushing.',
    evaluates: 'Decisions under incomplete data, how you de-risked quickly, and how you corrected course if wrong.',
    sampleQuestion: 'Describe a decision you made with incomplete information.',
    strongSignal: 'Time pressure stated, options weighed, action taken, and validation or rollback plan.',
    weakSignal: 'Reckless “move fast” with no risk assessment or learning loop afterward.',
  },
  {
    title: 'Earn Trust',
    meaning: 'Listen carefully, speak candidly, and treat others respectfully to build durable credibility.',
    evaluates: 'Conflict navigation, transparent communication, and rebuilding trust after disagreement.',
    sampleQuestion: 'Tell me about a time you earned trust from a skeptical stakeholder.',
    strongSignal: 'Stakeholder skepticism named, listening and candour shown, and trust rebuilt with evidence.',
    weakSignal: 'Conflict avoided or blamed on others; no demonstration of respectful disagreement.',
  },
  {
    title: 'Dive Deep',
    meaning: 'Stay connected to details, metrics, and root causes — especially when results look fine on the surface.',
    evaluates: 'Whether you validated assumptions with data and traced problems to root cause — not symptoms.',
    sampleQuestion: 'Tell me about a time data changed your understanding of a problem.',
    strongSignal: 'Metrics investigated, hypothesis overturned, and corrective action tied to root cause.',
    weakSignal: 'Surface-level fix with no investigation, or “I checked the logs” without conclusions.',
  },
  {
    title: 'Deliver Results',
    meaning: 'Focus on key inputs and deliver timely, high-quality outcomes despite obstacles.',
    evaluates: 'Measurable delivery against constraints — scope, timeline, quality, or resource limits.',
    sampleQuestion: 'Tell me about a goal you delivered despite significant constraints.',
    strongSignal: 'Constraint named, prioritization choices, delivery timeline, and quantified result.',
    weakSignal: 'Activity list without outcome, or missed goal blamed entirely on external factors.',
  },
] as const

export const AMAZON_FAQ_ITEMS = [
  {
    question: 'What is the Amazon Bar Raiser round?',
    answer:
      'A Bar Raiser is a trained interviewer from outside the hiring team who evaluates whether you raise Amazon’s hiring bar. They focus heavily on Leadership Principles, decision quality, and long-term ownership — and can veto a hire even if technical rounds were strong.',
  },
  {
    question: 'How many Leadership Principles does Amazon use in interviews?',
    answer:
      'Amazon uses 16 Leadership Principles company-wide. Interviewers map behavioural questions to specific LPs. For software engineer prep, master STAR stories that cover at least 8–10 principles with real metrics and trade-offs.',
  },
  {
    question: 'How difficult is the Amazon Online Assessment (OA)?',
    answer:
      'OA difficulty varies by level and region, but expect coding-style logic, work-simulation scenarios, and time pressure. It is designed to filter for structured problem-solving — not just memorized puzzle patterns. Practice under timed conditions.',
  },
  {
    question: 'Does Amazon hire freshers for software engineer roles in India?',
    answer:
      'Yes, but volume and bar vary by year and team. Campus and early-career pipelines exist, yet the process still includes OA, technical depth, and LP-heavy behavioural evaluation. Strong DSA fundamentals and polished STAR stories are essential.',
  },
  {
    question: 'How much does an employee referral help at Amazon?',
    answer:
      'Referrals can improve visibility and recruiter response, but they do not bypass the bar. You still complete OA, technical loops, behavioural interviews, and often a Bar Raiser. Treat referrals as momentum, not a guarantee.',
  },
  {
    question: 'How long does the Amazon interview process take?',
    answer:
      'Typically 4–8 weeks from application to offer, depending on team, level, and scheduling. Bar Raiser and panel coordination often add calendar time even when each round is only 45–60 minutes.',
  },
  {
    question: 'How many technical rounds are there for Amazon SDE roles?',
    answer:
      'Most loops include two technical interviews (DSA + CS fundamentals, sometimes system design for experienced candidates) plus behavioural LP rounds and a Bar Raiser. Exact count depends on level and org.',
  },
  {
    question: 'When should I negotiate Amazon salary?',
    answer:
      'After a verbal offer and level confirmation. Anchor on role scope, level, location, and competing offers. Amazon compensation includes base, RSUs, and sign-on — negotiate the full package, not just base salary.',
  },
  {
    question: 'What DSA topics matter most for Amazon technical rounds?',
    answer:
      'Arrays, strings, trees, graphs, heaps, binary search variants, sliding window, two pointers, recursion/backtracking, and dynamic programming fundamentals. Amazon also values clean communication and correct complexity analysis.',
  },
  {
    question: 'Is system design required for Amazon SDE interviews?',
    answer:
      'For SDE-2 and above, system design is common. For entry-level roles, focus on strong DSA, object-oriented fundamentals, and structured behavioural answers. Still learn basic scalability vocabulary for hybrid loops.',
  },
  {
    question: 'How should I prepare for Amazon behavioural interviews?',
    answer:
      'Build 10–12 STAR stories mapped to Leadership Principles. Each story needs context, your specific actions, metrics, and trade-offs. Practice aloud — Bar Raisers probe depth with follow-ups like “what would you do differently?”',
  },
  {
    question: 'Can I reuse stories across different Leadership Principles?',
    answer:
      'One project can support multiple LPs if you emphasize different decisions in each telling. Avoid repeating the same story verbatim across rounds — interviewers compare notes and depth matters more than volume.',
  },
] as const
