import type { SeoQuestion } from './types'

export const WIPRO_QA_HERO_PATH = '/blog/wipro-qa-engineer-hero.webp'
export const WIPRO_QA_HERO_ALT =
  'Wipro QA Engineer interview preparation guide 2026 — NLTH online test, manual and automation testing, Selenium, API testing, STLC, and HR interview for quality roles in India'
export const WIPRO_QA_HERO_WIDTH = 1536
export const WIPRO_QA_HERO_HEIGHT = 1024

export const WIPRO_QA_PROCESS_PATH = '/blog/wipro-qa-engineer-process-2026.webp'
export const WIPRO_QA_PROCESS_ALT =
  'Wipro QA Engineer interview process flow 2026: Application, NLTH Online Test, Technical QA Interview, HR Round, and Offer'
export const WIPRO_QA_PROCESS_WIDTH = 1672
export const WIPRO_QA_PROCESS_HEIGHT = 941

export const WIPRO_QA_META_TITLE = 'Wipro QA Engineer Interview Questions and Answers (2026)'
export const WIPRO_QA_CANONICAL_PATH = '/interview-questions/companies/wipro/qa-engineer'
export const WIPRO_QA_DESCRIPTION =
  'Wipro QA Engineer interview questions for India 2026: NLTH, manual testing, STLC, Selenium, API testing, salary ranges, 30-day roadmap, and expert sample answers.'
export const WIPRO_QA_EDITORIAL_NOTE =
  'Content reviewed and updated for current Wipro QA Engineer hiring patterns — NLTH online assessment, fresher eligibility, manual and automation testing depth, STLC and API probes, defect triage, project discussion, HR evaluation, and testing practice placement expectations in India.'
export const WIPRO_QA_READING_TIME = '22 min read'
export const WIPRO_QA_PUBLISHED_DATE = '2026-05-21'
export const WIPRO_QA_LAST_UPDATED = '2026-06-23'
export const WIPRO_QA_REVIEWED_DATE = '2026-06-23'
export const WIPRO_QA_AUTHOR_NAME = 'InterviewEra Team'
export const WIPRO_QA_REVIEWER_NAME = 'InterviewEra Editorial'

export const WIPRO_QA_TOC_SECTIONS = [
  { id: 'wipro-qa-overview', label: 'What Wipro Asks QA Candidates' },
  { id: 'wipro-qa-hiring-process', label: 'Wipro Hiring Process' },
  { id: 'wipro-qa-eligibility', label: 'Eligibility Criteria' },
  { id: 'wipro-qa-interview-pattern', label: 'Interview Pattern' },
  { id: 'wipro-qa-skills-tested', label: 'Skills Tested' },
  { id: 'wipro-qa-2026-trends', label: '2026 Hiring Trends' },
  { id: 'wipro-qa-question-categories', label: 'Question Categories' },
  { id: 'wipro-qa-company-insights', label: 'Company Insights' },
  { id: 'wipro-qa-salary', label: 'Salary Guide' },
  { id: 'wipro-qa-questions', label: 'Interview Questions' },
  { id: 'wipro-qa-roadmap', label: '30-Day Roadmap' },
  { id: 'wipro-qa-mistakes', label: 'Common Mistakes' },
  { id: 'wipro-qa-checklist', label: 'Last-Minute Checklist' },
  { id: 'wipro-qa-resources', label: 'Recommended Resources' },
  { id: 'wipro-qa-vs-peers', label: 'Wipro vs TCS vs Infosys' },
  { id: 'wipro-qa-faq', label: 'FAQs' },
  { id: 'wipro-qa-mock-cta', label: 'Practice Mock Interview' },
  { id: 'wipro-qa-related', label: 'Related Guides' },
] as const

export const WIPRO_QA_HIRING_STEPS = [
  {
    step: 'Step 1 — Application & resume screening',
    body: 'Register on Wipro careers or campus portal. Recruiters scan for testing projects, internships, STLC familiarity, Selenium or API tool mentions, and CGPA. Highlight measurable QA outcomes — bugs found pre-release, test cases authored, automation coverage — not generic “good academic record” lines.',
  },
  {
    step: 'Step 2 — NLTH (National Level Talent Hunt) online test',
    body: 'Timed assessment covering aptitude (quant, logical, verbal) and technical MCQs (testing fundamentals, basic programming logic, SQL basics). Strong NLTH scores shortlist candidates for live QA technical panels. Treat aptitude as seriously as testing theory — weak quant eliminates strong manual testers early.',
  },
  {
    step: 'Step 3 — Technical QA interview',
    body: 'Live round probing STLC, manual test case design, black-box vs white-box concepts, Selenium basics, API testing approach, defect severity/priority, and testing capstone or internship project discussion. Panels expect structured answers — define, example, trade-off.',
  },
  {
    step: 'Step 4 — HR round (often combined with technical)',
    body: 'Communication, relocation flexibility, salary expectations, and “why Wipro QA.” Research Wipro’s global delivery model, testing COE practice, and client industries. STAR-format bug-discovery stories strengthen HR performance.',
  },
  {
    step: 'Step 5 — Offer',
    body: 'Selected candidates receive offer with role band and CTC (typically ₹3.5–6 LPA for fresher manual QA, higher for automation-experienced laterals), joining location, and ILP training details. Confirm fixed vs variable split before accepting.',
  },
] as const

export const WIPRO_QA_ELIGIBILITY_CARDS = [
  {
    title: 'Educational background',
    body: 'B.Tech/B.E. (CS/IT/ECE), BCA, MCA, or B.Sc. Computer Science. Wipro hires QA profiles from engineering backgrounds for campus and off-campus drives. Testing certifications (ISTQB foundation) are a plus.',
  },
  {
    title: 'CGPA cutoff',
    body: 'Commonly 60–65% aggregate (or 6.0+ CGPA) with no active backlogs. Strong NLTH scores or a substantive testing internship can offset borderline academics in some seasons.',
  },
  {
    title: 'Core skills',
    body: 'STLC phases, test case design, manual testing, basic Selenium or API testing (Postman), SQL for data validation, Git basics, and defect lifecycle. Automation depth is a plus for fresher drives but not always mandatory.',
  },
  {
    title: 'Experience level',
    body: 'Freshers via NLTH are the primary entry path. Lateral hires (1–3 years) face deeper automation, API, and Agile workflow questions with higher salary bands.',
  },
  {
    title: 'Freshers vs experienced',
    body: 'Freshers: NLTH + STLC + manual testing + one tool. Experienced: framework design, CI integration, API automation depth, and release-management scenarios. Both tracks value clear defect communication.',
  },
] as const

export const WIPRO_QA_INTERVIEW_ROUNDS = [
  {
    round: 'NLTH Online Test',
    duration: '60–90 min',
    format: 'Aptitude + testing/technical MCQs',
    evaluates: 'Speed, accuracy, testing fundamentals, and elimination before live panels.',
  },
  {
    round: 'Technical QA Interview',
    duration: '30–45 min',
    format: 'STLC, test cases, Selenium/API concepts, project deep-dive',
    evaluates: 'Testing theory depth, practical judgment, and whether resume claims hold under probing.',
  },
  {
    round: 'HR / Managerial',
    duration: '15–25 min',
    format: 'Behavioral + fit + relocation + salary',
    evaluates: 'Communication, adaptability, motivation for Wipro, and professional attitude.',
  },
] as const

export const WIPRO_QA_SKILL_CARDS = [
  { skill: 'STLC', weight: 'High', detail: 'All phases from requirement analysis to test closure. Expect scenario questions on when each phase applies.' },
  { skill: 'Manual Testing', weight: 'High', detail: 'Test case design, equivalence partitioning, boundary values, exploratory testing, and defect reporting.' },
  { skill: 'Selenium / Automation', weight: 'Medium–High', detail: 'WebDriver basics, locators, explicit waits, Page Object Model awareness. Playwright mention signals modern readiness.' },
  { skill: 'API Testing', weight: 'Medium', detail: 'Status codes, JSON schema validation, auth edge cases. Tools: Postman, REST Assured, or pytest requests.' },
  { skill: 'SQL for QA', weight: 'Medium', detail: 'Data validation queries, JOINs for backend checks, and verifying DB state after test runs.' },
  { skill: 'Git', weight: 'Low–Medium', detail: 'Branching basics, pull requests, and collaborating with dev teams on test code.' },
  { skill: 'Bug Triage', weight: 'High', detail: 'Severity vs priority, reproducible steps, environment details, and escalation judgment.' },
  { skill: 'Agile / Scrum', weight: 'Medium', detail: 'Sprint ceremonies, definition of done, and QA role in continuous delivery.' },
  { skill: 'Performance basics', weight: 'Low', detail: 'Load vs stress testing concepts — rarely deep at fresher level but good differentiator.' },
  { skill: 'Communication', weight: 'High', detail: 'Writing clear bug reports and explaining risk to non-technical stakeholders.' },
] as const

export const WIPRO_QA_2026_TRENDS = [
  { title: 'NLTH aptitude weight increased', body: 'Campus QA shortlists still route through NLTH. Aptitude plus testing MCQ accuracy matters as much as interview charisma — prepare timed mocks weekly.' },
  { title: 'API-first testing emphasis', body: 'Wipro client projects increasingly probe REST API validation alongside UI testing. Mention Postman collections and status-code matrices in answers.' },
  { title: 'Playwright awareness rising', body: 'While Selenium remains common in legacy suites, panels appreciate candidates who know Playwright auto-waiting and modern browser automation trade-offs.' },
  { title: 'Combined technical + HR rounds', body: 'Many drives compress QA technical and HR into one session. Prepare STAR bug stories and STLC answers in the same mock — stamina matters.' },
] as const

export const WIPRO_QA_QUESTION_CATEGORIES = [
  { category: 'Manual / STLC', count: '3 questions', focus: 'Functional vs non-functional, STLC phases, test case attributes' },
  { category: 'Automation', count: '3 questions', focus: 'Selenium, regression, manual vs automation ROI' },
  { category: 'API', count: '1 question', focus: 'REST validation, tools, edge cases' },
  { category: 'Testing theory', count: '2 questions', focus: 'Black-box vs white-box, TDD vs BDD' },
  { category: 'Behavioral', count: '1 question', focus: 'Critical bug STAR story' },
  { category: 'Situational', count: '1 question', focus: 'Pre-release production bug' },
  { category: 'HR', count: '1 question', focus: 'Why Wipro QA' },
  { category: 'Project', count: '2 questions', focus: 'Testing capstone, NLTH prep' },
] as const

export const WIPRO_QA_COMPANY_INSIGHTS = [
  { title: 'Testing practice & delivery', body: 'Wipro’s quality engineering practice spans manual, automation, and performance testing for BFSI, healthcare, retail, and telecom clients. QA engineers often work in blended onshore-offshore teams with defined SLAs.' },
  { title: 'Types of projects', body: 'Typical engagements: regression automation for enterprise apps, API test suites, UAT support, defect triage for production releases, and migration testing (cloud, ERP). Fresher projects start with supervised manual cycles.' },
  { title: 'Tech stack', body: 'Selenium/Java or Python, TestNG or pytest, Postman, Jira, SQL Server or Oracle for validation, Jenkins for CI hooks. Client stacks vary — adaptability matters more than one-tool loyalty.' },
  { title: 'Work culture', body: 'Service-delivery model with sprint deadlines, documentation standards, and client reporting. Relocation flexibility and shift readiness are frequently tested in HR.' },
  { title: 'Career progression', body: 'QA Engineer → Senior QA → Test Lead → QA Manager / Automation Architect. Upskilling in API automation and CI/CD accelerates promotion in Wipro testing COEs.' },
] as const

export const WIPRO_QA_SALARY_TIERS = [
  { title: 'Fresher / campus', range: '₹3.5–6 LPA', note: 'NLTH campus offers for manual QA tracks. Automation project evidence can push toward upper band.', tier: 'entry' as const },
  { title: '1–3 years', range: '₹5–9 LPA', note: 'Independent test module ownership, Selenium/API automation, and client-facing defect communication expected.', tier: 'mid' as const },
  { title: 'Senior QA (3–5 years)', range: '₹8–14 LPA', note: 'Leads test planning, mentors juniors, owns release sign-off for modules.', tier: 'senior' as const },
  { title: 'Lead / Automation Architect', range: '₹12–16+ LPA', note: 'Framework design, CI integration, and cross-team quality strategy. Varies by account and city.', tier: 'lead' as const },
] as const

export const WIPRO_QA_ROADMAP_WEEKS = [
  { week: 'Week 1', focus: 'STLC + manual testing', items: ['Revise all STLC phases with examples', 'Write 10 test cases for a sample login module', 'Daily NLTH aptitude drills (quant + logical)'] },
  { week: 'Week 2', focus: 'Testing theory + defects', items: ['Black-box vs white-box scenarios', 'Severity vs priority triage drills', 'Practice 2 NLTH-style technical MCQ mocks'] },
  { week: 'Week 3', focus: 'Selenium + API', items: ['Selenium locators and explicit waits', 'Postman collection for a sample REST API', 'SQL validation queries for test data checks'] },
  { week: 'Week 4', focus: 'Mocks + HR + projects', items: ['STAR story for critical bug found', 'Why Wipro QA + relocation answer', 'Full Wipro-style technical + HR mock on InterviewEra'] },
] as const

export const WIPRO_QA_MISTAKES = [
  'Treating QA as “easy” and skipping NLTH aptitude prep.',
  'Listing STLC phases without explaining QA involvement in each.',
  'Claiming Selenium expertise but unable to explain explicit vs implicit waits.',
  'Confusing severity and priority in defect triage answers.',
  'Saying “automation replaces manual testing” instead of discussing ROI and scope.',
  'Vague bug stories without reproducible steps or business impact.',
  'Ignoring API testing — many Wipro projects are service-heavy.',
  'Unable to walk through a testing capstone or internship project under follow-ups.',
  'Rambling HR answers without “why Wipro” research.',
  'Overstating automation on resume but failing basic manual test case design.',
  'Not knowing when to escalate a pre-release production bug.',
  'Copying generic QA answers without Wipro/NLTH context.',
] as const

export const WIPRO_QA_CHECKLIST = [
  'NLTH registration confirmed with correct academic details',
  'Resume lists STLC, test case count, tools (Selenium/Postman), and quantified bug impact',
  'STLC phases rehearsed with one example each',
  '5 manual test cases written for a sample feature',
  'Selenium locator types and explicit wait example ready',
  'Postman API test with status code assertions prepared',
  'Severity vs priority answer rehearsed with scenario',
  'STAR critical-bug story with business impact metric',
  '“Why Wipro QA” answer with testing practice research',
  'Salary range researched (₹3.5–6 LPA fresher band) with flexible framing',
] as const

export const WIPRO_QA_VS_PEER_ROWS = [
  ['Entry assessment', 'NLTH (aptitude + testing MCQs)', 'TCS NQT (strong aptitude)', 'InfyTQ + aptitude'],
  ['Manual testing depth', 'High — test case design expected', 'High', 'High'],
  ['Automation expectation', 'Medium — Selenium basics for fresher', 'Medium', 'Medium'],
  ['API testing', 'Growing emphasis in 2026', 'Varies by project', 'Growing'],
  ['Typical fresher package', '₹3.5–6 LPA QA band', '₹3.3–7 LPA (track dependent)', '₹3.6–4.5 LPA SE; QA similar'],
  ['Interview difficulty', 'Easy to medium', 'Easy to medium', 'Easy to medium'],
] as const

export const WIPRO_QA_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/qa-engineer', label: 'QA Engineer Interview Questions' },
  { href: '/interview-questions/topics/rest-api', label: 'REST API Interview Questions' },
  { href: '/interview-questions/companies/wipro/data-analyst', label: 'Wipro Data Analyst Questions' },
  { href: '/interview-questions/companies/wipro/software-engineer', label: 'Wipro Software Engineer Questions' },
  { href: '/interview-questions/companies/wipro/java-developer', label: 'Wipro Java Developer Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions Hub' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Tips' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Interview Guide' },
  { href: '/tools/question-generator', label: 'AI Question Generator' },
  { href: '/signup', label: 'Free Mock Interview' },
] as const

export const WIPRO_QA_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/qa-engineer', label: 'QA Engineer Questions' },
  { href: '/interview-questions/companies/wipro/data-analyst', label: 'Wipro DA Questions' },
  { href: '/interview-questions/companies/wipro/software-engineer', label: 'Wipro SWE Questions' },
  { href: '/interview-questions/companies/wipro/java-developer', label: 'Wipro Java Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Company Hub' },
  { href: '/interview-questions/topics/rest-api', label: 'REST API Questions' },
  { href: '/interview-questions/companies/tcs/software-engineer', label: 'TCS SWE Questions' },
  { href: '/interview-questions/companies/infosys/software-engineer', label: 'Infosys SWE Questions' },
  { href: '/interview-questions/business-analyst', label: 'Business Analyst Questions' },
] as const

export const WIPRO_QA_FAQ_ITEMS = [
  { question: 'What does Wipro ask in QA Engineer interviews?', answer: 'Wipro QA interviews typically cover NLTH online assessment (aptitude + testing MCQs), STLC and manual test case design, Selenium or automation basics, API testing concepts, defect severity/priority, behavioral bug-discovery stories, and HR fit questions. Fresher drives emphasize fundamentals over advanced framework design.' },
  { question: 'Is Selenium mandatory for Wipro QA interviews?', answer: 'Not always mandatory for fresher manual QA roles, but strongly expected. Panels probe WebDriver basics, locator strategies, and explicit waits. Candidates with automation project evidence stand out — prepare at least one Selenium example even if your role is manual-heavy initially.' },
  { question: 'Is automation required for Wipro QA freshers?', answer: 'Freshers are primarily evaluated on manual testing, STLC, and test case design. Basic Selenium or Postman awareness is a differentiator. Full automation framework expertise is expected only for lateral automation QA hires with 1–3 years experience.' },
  { question: 'Manual vs automation — what does Wipro expect?', answer: 'Wipro expects you to know when manual testing wins (exploratory, usability, short-lived features) versus when automation wins (regression, smoke, data-driven suites). Articulate ROI — not tool preference alone.' },
  { question: 'How many rounds are in Wipro QA Engineer interviews?', answer: 'Typically three: NLTH online test, technical QA interview (STLC, test cases, tools, project), and HR round — sometimes combined into one live session for off-campus lateral hires.' },
  { question: 'What is tested in NLTH for QA roles?', answer: 'NLTH covers aptitude (quant, logical, verbal) and technical MCQs including testing fundamentals, basic programming logic, and sometimes SQL. Weak aptitude performance eliminates candidates before live QA panels regardless of interview skills.' },
  { question: 'What is the salary for Wipro QA Engineer freshers?', answer: 'Fresher campus offers typically range ₹3.5–6 LPA for manual QA tracks. With 1–3 years automation experience, expect ₹5–9 LPA. Senior and lead automation roles reach ₹8–16+ LPA depending on city and client account.' },
  { question: 'Can freshers crack Wipro QA interviews?', answer: 'Yes. NLTH is designed for mass fresher hiring. Strong aptitude, STLC clarity, test case writing practice, and a quantified testing project are the primary success factors. ISTQB foundation certification strengthens your profile.' },
  { question: 'How often does Wipro ask STLC questions?', answer: 'Very frequently — almost every technical round opens with STLC phase questions or scenario-based probes on test planning and closure. Know all phases with one real example each.' },
  { question: 'What API testing tools should I mention?', answer: 'Postman for manual API exploration and collections, REST Assured or pytest for automated API suites. Cover status codes (200, 401, 403, 404), JSON schema validation, and edge cases like empty payloads.' },
  { question: 'Wipro vs TCS QA — which is harder?', answer: 'Similar overall difficulty for fresher QA roles. Wipro routes through NLTH; TCS uses NQT with strong aptitude weight. Both test manual testing depth — compare both processes if applying to multiple employers.' },
  { question: 'Is coding required for Wipro QA interviews?', answer: 'Basic programming logic may appear in NLTH MCQs. Live coding is uncommon for manual QA freshers. Automation candidates may face simple Selenium or pseudocode snippets — focus on testing judgment first.' },
  { question: 'What testing projects should I prepare?', answer: 'Prepare one capstone or internship project where you authored test cases, logged defects with clear steps, and optionally automated a regression suite. Panels probe whether you built the test strategy or only executed scripts.' },
  { question: 'Does Wipro combine technical and HR rounds?', answer: 'Yes, frequently. Many drives use a single combined session covering STLC questions followed by HR fit and relocation discussion. Practice sustained communication across both.' },
  { question: 'What is the difference between bug severity and priority?', answer: 'Severity measures technical impact (crash = high). Priority measures business urgency for fixing (cosmetic bug on login page before launch = high priority, low severity). Wipro panels test both with release scenario examples.' },
  { question: 'Playwright vs Selenium — what should I say?', answer: 'Selenium is widely used in Wipro legacy suites with broad browser support. Playwright offers auto-waiting, faster execution, and better debugging. Mention you would pick based on project stack and team skill — not personal preference alone.' },
  { question: 'How do I prepare for Wipro QA in 30 days?', answer: 'Week 1: STLC + manual test cases + aptitude. Week 2: testing theory + defect triage. Week 3: Selenium + Postman API. Week 4: STAR stories, Why Wipro, and full mocks. Follow the week-by-week roadmap in this guide.' },
  { question: 'How long does the Wipro QA offer process take?', answer: 'Typically 2–6 weeks from final HR round to offer letter, depending on batch scheduling and background verification. Off-campus drives may take longer during low-hiring seasons.' },
] as const

export const WIPRO_QA_QUESTIONS = [
  {
    question: 'What is the difference between functional and non-functional testing?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Foundational QA literacy — Wipro panels use this to filter candidates who memorized tool names without understanding test types.',
    evaluates: 'Whether you distinguish what the system does from how well it performs under load, security, or usability constraints.',
    strategy: 'Define both, give one example each (login validation vs load test), note both are required in enterprise projects.',
    expertAnswer: 'Functional testing verifies what the system does — e.g. login accepts valid credentials. Non-functional testing verifies how well — performance under 10k users, security against SQL injection, accessibility compliance. Both are mandatory in Wipro client delivery; neither replaces the other.',
    mistakes: 'Listing only functional examples, or treating non-functional as optional nice-to-have.',
    followUps: ['Give a non-functional test for an e-commerce checkout', 'When would you run performance tests?'],
    tip: 'Functional: WHAT. Non-functional: HOW WELL. Give one example each.',
    keywords: ['functional testing', 'non-functional testing', 'performance', 'security'],
  },
  {
    question: 'What is the Software Testing Life Cycle (STLC)? List and explain each phase.',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '3 min',
    whyAsked: 'STLC is the backbone of every Wipro QA engagement — panels expect phase-by-phase clarity, not a single-word list.',
    evaluates: 'Process maturity, early QA involvement, and whether you connect phases to deliverables.',
    strategy: 'List all phases in order, one sentence each with a deliverable (test plan, test cases, execution report, closure summary).',
    expertAnswer: 'STLC phases: Requirement Analysis (understand scope), Test Planning (strategy, resources, schedule), Test Case Design (scripts and data), Environment Setup, Test Execution (run + log defects), Test Closure (metrics, lessons learned). QA should start at requirements — defects found late cost 10x more to fix.',
    mistakes: 'Skipping requirement analysis, or saying QA only starts after development completes.',
    followUps: ['What deliverable comes from test planning?', 'How do you handle changing requirements mid-cycle?'],
    tip: 'Mention QA starts at requirements — not only at the end.',
    keywords: ['STLC', 'test planning', 'test closure'],
  },
  {
    question: 'What is the difference between black-box and white-box testing?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Tests whether you understand test design approaches used across manual and automation work at Wipro.',
    evaluates: 'Knowledge vs code visibility and appropriate technique selection.',
    strategy: 'Define by internal code knowledge, map to functional/UAT (black-box) and unit/coverage (white-box).',
    expertAnswer: 'Black-box: no internal code knowledge — test against requirements (functional, UAT, exploratory). White-box: tester knows code structure — unit tests, branch coverage, path testing. Grey-box blends both (e.g. API testing with schema knowledge).',
    mistakes: 'Confusing black-box with “no documentation” or saying white-box is only for developers.',
    followUps: ['What is grey-box testing?', 'Which approach for API validation?'],
    tip: 'Draw a mental boundary: specs vs source code.',
    keywords: ['black-box', 'white-box', 'grey-box', 'UAT'],
  },
  {
    question: 'What is regression testing and when is it run?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Regression discipline is daily work in Wipro maintenance projects — panels test release-readiness thinking.',
    evaluates: 'Understanding of re-test scope after code changes and automation fit.',
    strategy: 'Define regression, state triggers (every build, pre-release), mention automated regression suites at scale.',
    expertAnswer: 'Regression testing re-runs existing test cases after code changes to ensure previously working functionality still works. Run after every significant change, especially before releases. Automated regression suites (Selenium, CI-triggered) make this practical at Wipro client scale.',
    mistakes: 'Only testing new features after a change, or unable to explain smoke vs full regression.',
    followUps: ['Smoke vs regression — difference?', 'How do you select regression test cases?'],
    tip: 'Mention automation for regression at scale.',
    keywords: ['regression testing', 'smoke test', 'automation'],
  },
  {
    question: 'What is Selenium WebDriver? What are its key limitations?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked: 'Selenium remains the most common automation stack in Wipro legacy suites — panels probe practical depth beyond buzzwords.',
    evaluates: 'WebDriver protocol understanding, flakiness awareness, and modern alternatives.',
    strategy: 'Define WebDriver, list limitations (timing, no built-in runner, speed), mention explicit waits and Playwright as evolution.',
    expertAnswer: 'Selenium WebDriver controls browsers via the W3C WebDriver protocol — simulates real user clicks and inputs. Limitations: flaky tests from timing (use explicit waits, never Thread.sleep), no native test runner or reporting, slower than component-level tests. Playwright addresses auto-waiting and debugging gaps.',
    mistakes: 'Saying Selenium has no limitations, or using Thread.sleep as best practice.',
    followUps: ['Explicit vs implicit wait?', 'When would you choose Playwright?'],
    tip: 'Mention explicit waits and flakiness — shows production awareness.',
    keywords: ['Selenium', 'WebDriver', 'explicit wait', 'Playwright'],
  },
  {
    question: 'What is the difference between TDD and BDD?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2 min',
    whyAsked: 'Agile Wipro projects often use BDD collaboration — panels check if you understand process vs coding practice.',
    evaluates: 'Distinction between developer TDD cycle and business-readable BDD scenarios.',
    strategy: 'TDD = red-green-refactor unit tests first. BDD = Given-When-Then Gherkin for cross-team alignment. Different audiences.',
    expertAnswer: 'TDD: developers write failing unit tests before implementation (red-green-refactor). BDD: define behaviour in Given-When-Then language (Gherkin) so business and QA share scenarios — often with Cucumber. TDD is a coding discipline; BDD is a collaboration process spanning roles.',
    mistakes: 'Using TDD and BDD interchangeably, or unable to give a Gherkin example.',
    followUps: ['Write a Given-When-Then for login', 'Does Wipro use Cucumber on your projects?'],
    tip: 'TDD = developer practice. BDD = team collaboration.',
    keywords: ['TDD', 'BDD', 'Gherkin', 'Cucumber'],
  },
  {
    question: 'How do you test a REST API? What aspects do you check and what tools do you use?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3–4 min',
    whyAsked: 'API-heavy Wipro client projects increasingly probe REST validation alongside UI testing.',
    evaluates: 'Status code matrix, schema validation, auth edges, and tool fluency.',
    strategy: 'Cover status codes, response body/schema, auth (401/403), edge cases, performance SLA. Tools: Postman, REST Assured, Newman in CI.',
    expertAnswer: 'Check: correct status codes (200, 201, 400, 401, 403, 404), response JSON schema, error message quality, auth and role boundaries, edge cases (empty body, oversized payload), and response time within SLA. Tools: Postman for exploration, REST Assured or pytest for automation, Newman in CI pipelines.',
    mistakes: 'Only checking 200 OK, ignoring auth scenarios, or no mention of negative test cases.',
    followUps: ['How do you validate JSON schema?', 'Test an endpoint that requires a Bearer token?'],
    tip: 'Always mention 401/403 auth cases and edge payloads.',
    keywords: ['REST API', 'Postman', 'status codes', 'REST Assured'],
  },
  {
    question: 'Tell me about the most critical bug you found. How did you find it and what was its impact?',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked: 'Validates real testing experience and impact awareness — Wipro panels probe resume claims with STAR follow-ups.',
    evaluates: 'Discovery method, impact quantification, and structured storytelling.',
    strategy: 'STAR format: Situation, Task, Action (exploratory test, edge case), Result (users/revenue protected).',
    expertAnswer: 'Example: “During exploratory testing of a payment module, I found duplicate charge on double-click submit. I reproduced with steps, logged severity-high defect, and blocked release. Fix prevented erroneous charges for ~8,000 daily transactions.” Adapt with your real project and honest metrics.',
    mistakes: 'Vague “found a critical bug” without steps, severity, or business impact.',
    followUps: ['How did you convince the team to delay release?', 'What would you improve in test coverage?'],
    tip: 'Quantify impact — users affected, revenue, or data integrity.',
    keywords: ['STAR', 'bug discovery', 'severity', 'impact'],
  },
  {
    question: 'You find a production-impacting bug 1 hour before a scheduled release. What do you do?',
    category: 'situational',
    difficulty: 'hard',
    answerTime: '3 min',
    whyAsked: 'Tests release judgment under pressure — common scenario in Wipro client delivery timelines.',
    evaluates: 'Escalation discipline, documentation quality, and team-first thinking.',
    strategy: 'Escalate immediately, document repro steps, assess severity/workaround, let release manager decide — do not silently fix or hide.',
    expertAnswer: 'Immediately notify the release manager and test lead with clear repro steps, severity, and affected scope. Assess if a workaround exists. Do not attempt an unauthorized hotfix in one hour. The team decides: delay release, ship with known limitation, or emergency patch. Your job is evidence and risk communication.',
    mistakes: 'Trying to fix alone, downplaying severity to avoid delay, or poor documentation under time pressure.',
    followUps: ['What if no workaround exists?', 'How do you write a release blocker email?'],
    tip: 'Escalate first — do not hide or solo-fix.',
    keywords: ['escalation', 'release decision', 'severity'],
  },
  {
    question: 'What makes a good test case? List the essential attributes.',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Test case quality is daily deliverable work — Wipro manual QA roles test documentation discipline.',
    evaluates: 'Completeness, traceability, and atomicity of test design.',
    strategy: 'List ID, title, preconditions, steps, expected result, priority. Add: unambiguous, repeatable, traceable, atomic.',
    expertAnswer: 'Essential attributes: unique ID, clear title, preconditions, step-by-step actions, expected result, actual result field, priority/severity, traceability to requirement. A good test case is unambiguous, repeatable, atomic (one behaviour), and maintainable when requirements change.',
    mistakes: 'Vague expected results like “should work”, or combined multiple behaviours in one case.',
    followUps: ['Write a test case for password reset', 'How do you trace tests to requirements?'],
    tip: 'Mention atomicity — one test, one behaviour.',
    keywords: ['test case', 'traceability', 'preconditions'],
  },
  {
    question: 'How do you prioritise which bugs to test and report first?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2 min',
    whyAsked: 'Triage judgment matters in fast-paced Wipro sprints with limited regression windows.',
    evaluates: 'Severity × frequency × business risk reasoning.',
    strategy: 'Severity (data loss > crash > functional > cosmetic) × user frequency. Align with PM on release goals.',
    expertAnswer: 'Prioritise by severity (data corruption and crashes first) multiplied by how many users or flows are affected. Align with product manager on release-critical paths. A cosmetic bug on the homepage may outrank a rare edge case if launch is imminent — context matters alongside severity tables.',
    mistakes: 'Reporting all bugs as high priority, or ignoring business context.',
    followUps: ['Severity vs priority — example?', 'How do you handle duplicate bugs?'],
    tip: 'Mention both severity and business frequency.',
    keywords: ['severity', 'priority', 'triage'],
  },
  {
    question: 'When do you choose manual testing over automation? Give two concrete examples.',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Wipro fresher QA roles are manual-heavy initially — panels reject “automation only” mindsets.',
    evaluates: 'ROI thinking and appropriate technique selection.',
    strategy: 'Manual: exploratory, usability, one-off features. Automation: regression, smoke, data-driven repeats. Give two examples each.',
    expertAnswer: 'Choose manual for exploratory testing (unknown defect hunting) and short-lived features where automation ROI is negative. Choose automation for regression suites, smoke tests on every build, and data-driven scenarios with stable UI. Example: usability review of a new checkout flow = manual; nightly regression of 200 login cases = automated.',
    mistakes: 'Saying manual is obsolete, or automating everything including exploratory work.',
    followUps: ['When is automation ROI negative?', 'How do you decide what to automate first?'],
    tip: 'Two concrete examples — one manual win, one automation win.',
    keywords: ['manual testing', 'automation ROI', 'exploratory'],
  },
  {
    question: 'Walk me through your testing capstone or internship project. What was your role?',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '4 min',
    whyAsked: 'Wipro panels verify project ownership — tutorial-following without personal contribution fails under probing.',
    evaluates: 'Test strategy ownership, tools used, defects found, and measurable outcomes.',
    strategy: 'Scope → your specific tasks → test types used → defects found → outcome. Be honest about team vs solo work.',
    expertAnswer: 'Structure: “The app was X. I owned test case design for module Y using boundary analysis, executed 45 cases, logged 12 defects (2 severity-high), and built a 20-case Selenium smoke suite. Release demo passed with zero critical open bugs.” Prepare follow-ups on your specific modules.',
    mistakes: 'Cannot explain test approach, or claiming full project credit for team work.',
    followUps: ['Which defects would you catch earlier today?', 'What would you automate if you had two more weeks?'],
    tip: 'Quantify test cases written and defects logged.',
    keywords: ['project discussion', 'test strategy', 'internship'],
  },
  {
    question: 'Why do you want to join Wipro as a QA Engineer?',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'HR and combined rounds test motivation, relocation fit, and company research depth.',
    evaluates: 'Genuine interest, relocation willingness, and structured communication.',
    strategy: 'Wipro testing scale + training + industry exposure + personal skill growth. Avoid generic brand praise.',
    expertAnswer: 'Anchor on Wipro’s multi-industry testing exposure, structured ILP training, opportunity to grow from manual to automation within global delivery teams, and your fit — e.g. capstone testing experience and willingness to relocate. Tie to a specific skill you will build in year one (API automation or CI integration).',
    mistakes: 'Generic “MNC name” answers, no mention of QA practice, or sounding unprepared for relocation.',
    followUps: ['Are you willing to relocate?', 'What are your salary expectations?'],
    tip: 'Research Wipro testing practice — mention one specific initiative.',
    keywords: ['why Wipro', 'HR interview', 'relocation'],
  },
] as const satisfies readonly SeoQuestion[]

export function isWiproQaEngineerHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'wipro' && roleSlug === 'qa-engineer'
}
