import type { SeoQuestion } from './types'

export const WIPRO_DA_HERO_PATH = '/blog/wipro-data-analyst-hero.webp'
export const WIPRO_DA_HERO_ALT =
  'Wipro Data Analyst interview preparation guide 2026 — NLTH online test, SQL and Python technical round, case study, visualization, and HR interview for analytics roles in India'
export const WIPRO_DA_HERO_WIDTH = 1536
export const WIPRO_DA_HERO_HEIGHT = 1024

export const WIPRO_DA_PROCESS_PATH = '/blog/wipro-data-analyst-process-2026.webp'
export const WIPRO_DA_PROCESS_ALT =
  'Wipro Data Analyst interview process flow 2026: Application, NLTH Online Test, Technical Interview, HR Round, and Offer'
export const WIPRO_DA_PROCESS_WIDTH = 1672
export const WIPRO_DA_PROCESS_HEIGHT = 941

export const WIPRO_DA_META_TITLE = 'Wipro Data Analyst Interview Questions and Answers (2026)'
export const WIPRO_DA_CANONICAL_PATH = '/interview-questions/companies/wipro/data-analyst'
export const WIPRO_DA_DESCRIPTION =
  'Wipro Data Analyst interview questions for India 2026: NLTH online test, SQL, Python, statistics, case studies, salary ranges, 30-day roadmap, and expert sample answers.'
export const WIPRO_DA_EDITORIAL_NOTE =
  'Content reviewed and updated for current Wipro Data Analyst hiring patterns — NLTH online assessment structure, fresher eligibility, SQL and Python technical depth, statistics and visualization probes, project discussion, HR evaluation, and analytics practice placement expectations in India.'
export const WIPRO_DA_READING_TIME = '22 min read'
export const WIPRO_DA_PUBLISHED_DATE = '2026-05-21'
export const WIPRO_DA_LAST_UPDATED = '2026-06-23'
export const WIPRO_DA_REVIEWED_DATE = '2026-06-23'
export const WIPRO_DA_AUTHOR_NAME = 'InterviewEra Team'
export const WIPRO_DA_REVIEWER_NAME = 'InterviewEra Editorial'

export const WIPRO_DA_TOC_SECTIONS = [
  { id: 'wipro-da-overview', label: 'What Wipro Asks DA Candidates' },
  { id: 'wipro-da-hiring-process', label: 'Wipro Hiring Process' },
  { id: 'wipro-da-eligibility', label: 'Eligibility Criteria' },
  { id: 'wipro-da-interview-pattern', label: 'Interview Pattern' },
  { id: 'wipro-da-skills-tested', label: 'Skills Tested' },
  { id: 'wipro-da-2026-trends', label: '2026 Hiring Trends' },
  { id: 'wipro-da-question-categories', label: 'Question Categories' },
  { id: 'wipro-da-company-insights', label: 'Company Insights' },
  { id: 'wipro-da-salary', label: 'Salary Guide' },
  { id: 'wipro-da-questions', label: 'Interview Questions' },
  { id: 'wipro-da-roadmap', label: '30-Day Roadmap' },
  { id: 'wipro-da-mistakes', label: 'Common Mistakes' },
  { id: 'wipro-da-checklist', label: 'Last-Minute Checklist' },
  { id: 'wipro-da-resources', label: 'Recommended Resources' },
  { id: 'wipro-da-vs-peers', label: 'Wipro vs TCS vs Infosys' },
  { id: 'wipro-da-faq', label: 'FAQs' },
  { id: 'wipro-da-mock-cta', label: 'Practice Mock Interview' },
  { id: 'wipro-da-related', label: 'Related Guides' },
] as const

export const WIPRO_DA_HIRING_STEPS = [
  {
    step: 'Step 1 — Application & resume screening',
    body: 'Register on Wipro careers or campus portal with accurate academic details. Recruiters scan for analytics-relevant projects, SQL/Python mentions, internships, and CGPA. Highlight measurable outcomes — dashboards built, data cleaned, or insights delivered — not generic “good academic record” lines.',
  },
  {
    step: 'Step 2 — NLTH (National Level Talent Hunt) online test',
    body: 'Timed online assessment covering aptitude (quant, logical, verbal), technical MCQs (SQL basics, programming logic, statistics fundamentals), and sometimes a short coding or pseudocode section. Strong NLTH scores shortlist candidates for live technical panels.',
  },
  {
    step: 'Step 3 — Technical interview',
    body: 'One combined or split technical round probing SQL query writing, Python/pandas data manipulation, statistics concepts, Excel reporting, visualization tool familiarity, and project discussion. Panels expect narrated problem-solving — explain your approach before writing queries or code.',
  },
  {
    step: 'Step 4 — HR round (often combined with technical)',
    body: 'Communication, relocation flexibility, salary expectations, and “why Wipro.” Research Wipro’s analytics practice, Topcoder community, and sustainability initiatives for credible company-specific answers. STAR-format behavioral stories strengthen HR performance.',
  },
  {
    step: 'Step 5 — Offer',
    body: 'Selected candidates receive offer with role band, CTC breakdown (typically ₹3.5–6 LPA for fresher analytics tracks, higher for lateral hires with experience), joining location, and training period details. Confirm fixed vs variable split before accepting.',
  },
] as const

export const WIPRO_DA_ELIGIBILITY_CARDS = [
  {
    title: 'Educational background',
    body: 'B.Tech/B.E., BCA, MCA, B.Sc. (CS/Statistics/Mathematics), or MBA with analytics electives. Wipro hires DA profiles from engineering and quantitative backgrounds for campus and off-campus drives.',
  },
  {
    title: 'CGPA cutoff',
    body: 'Commonly 60–65% aggregate (or 6.0+ CGPA on 10-point scale) with no active backlogs at most campuses. Strong NLTH scores or internship experience can offset borderline academics in some seasons.',
  },
  {
    title: 'Core skills',
    body: 'SQL (joins, aggregations, subqueries), basic Python/pandas, statistics fundamentals, Excel pivot tables, and one visualization tool (Power BI or Tableau). Machine learning basics are a plus, not mandatory for fresher DA roles.',
  },
  {
    title: 'Experience level',
    body: 'Freshers via NLTH campus drives are the primary entry path. Lateral hires (1–3 years) face deeper SQL, case study, and domain-specific analytics questions with higher salary bands.',
  },
  {
    title: 'Freshers vs experienced',
    body: 'Freshers: NLTH + fundamentals + project discussion. Experienced: end-to-end case walkthroughs, stakeholder communication scenarios, and tool-depth probes. Both tracks value clear communication over memorized definitions.',
  },
] as const

export const WIPRO_DA_INTERVIEW_ROUNDS = [
  {
    round: 'NLTH Online Test',
    duration: '60–90 min',
    format: 'Aptitude + technical MCQs + optional coding',
    evaluates: 'Speed, accuracy, SQL/statistics fundamentals, and elimination filter before live panels.',
  },
  {
    round: 'Technical Interview',
    duration: '30–45 min',
    format: 'Live SQL queries, Python/pandas snippets, stats Q&A, project deep-dive',
    evaluates: 'Hands-on data skills, problem narration, and whether resume project claims hold under probing.',
  },
  {
    round: 'HR / Managerial',
    duration: '15–25 min',
    format: 'Behavioral + fit + relocation + salary discussion',
    evaluates: 'Communication clarity, adaptability, motivation for Wipro, and professional attitude.',
  },
] as const

export const WIPRO_DA_SKILL_CARDS = [
  {
    skill: 'SQL',
    weight: 'High',
    detail: 'JOINs, GROUP BY, subqueries, window functions, and query optimization basics. Expect live query writing on whiteboard or shared editor.',
  },
  {
    skill: 'Python',
    weight: 'Medium–High',
    detail: 'pandas groupby, missing value handling, basic data cleaning scripts. Full ML pipelines are rare at fresher level.',
  },
  {
    skill: 'Statistics',
    weight: 'Medium',
    detail: 'Mean/median/mode, distributions, hypothesis testing, p-values, and correlation vs causation.',
  },
  {
    skill: 'Probability',
    weight: 'Low–Medium',
    detail: 'Basic probability rules, conditional probability, and expected value — often via aptitude or conceptual MCQs.',
  },
  {
    skill: 'Data Cleaning',
    weight: 'Medium',
    detail: 'NULL handling, outlier treatment, deduplication, and imputation strategies with business justification.',
  },
  {
    skill: 'Excel',
    weight: 'Medium',
    detail: 'Pivot tables, VLOOKUP/INDEX-MATCH, conditional formatting, and quick ad-hoc analysis for reporting roles.',
  },
  {
    skill: 'Visualization',
    weight: 'Medium',
    detail: 'Power BI or Tableau chart selection, dashboard design principles, and explaining visuals to non-technical stakeholders.',
  },
  {
    skill: 'Business Cases',
    weight: 'Medium',
    detail: 'Structured case walkthroughs — define problem, gather data, analyze, recommend action with measurable KPIs.',
  },
  {
    skill: 'Communication',
    weight: 'High',
    detail: 'Translating analysis into business recommendations. Panels reject candidates who cannot explain “so what” behind numbers.',
  },
  {
    skill: 'Machine Learning basics',
    weight: 'Low',
    detail: 'Supervised vs unsupervised, overfitting awareness, and one project example. Deep ML theory is uncommon for entry DA.',
  },
] as const

export const WIPRO_DA_2026_TRENDS = [
  {
    title: 'NLTH remains the primary fresher gate',
    body: 'Campus and mass-hiring drives still route through NLTH online assessment. Aptitude plus technical MCQ weight has increased — weak fundamentals eliminate candidates before SQL live rounds.',
  },
  {
    title: 'Case study depth is rising',
    body: 'Panels increasingly ask “walk me through a business problem you would solve with data” instead of isolated trivia. Structure answers: problem → data → analysis → recommendation → impact.',
  },
  {
    title: 'Power BI emphasis in visualization rounds',
    body: 'Wipro client projects frequently use Microsoft stack. Mentioning Power BI dashboards, DAX basics, or Excel-to-Power BI workflows signals practical readiness.',
  },
  {
    title: 'Combined technical + HR rounds',
    body: 'Many drives compress technical and HR into one session. Prepare STAR stories and SQL answers in the same mock — stamina and communication matter as much as syntax.',
  },
] as const

export const WIPRO_DA_QUESTION_CATEGORIES = [
  { category: 'SQL', count: '3 questions', focus: 'Live query writing, JOINs, aggregations, ranking' },
  { category: 'Python', count: '2 questions', focus: 'pandas manipulation, missing values, groupby' },
  { category: 'Statistics', count: '2 questions', focus: 'Hypothesis testing, p-values, distributions' },
  { category: 'Excel', count: '1 question', focus: 'Lookup functions, pivot tables, reporting' },
  { category: 'Visualization', count: '1 question', focus: 'Chart selection, Power BI/Tableau' },
  { category: 'Case Study', count: '1 question', focus: 'Business problem structuring' },
  { category: 'Behavioral', count: '1 question', focus: 'STAR project stories with impact' },
  { category: 'HR', count: '1 question', focus: 'Why Wipro, relocation, salary' },
] as const

export const WIPRO_DA_COMPANY_INSIGHTS = [
  {
    title: 'Analytics teams & practice',
    body: 'Wipro’s data and analytics practice serves BFSI, retail, healthcare, and manufacturing clients. Data Analysts often work on reporting automation, dashboard delivery, and ad-hoc analysis within larger delivery teams.',
  },
  {
    title: 'Types of projects',
    body: 'Typical engagements: KPI dashboard builds, ETL support, customer churn analysis, operations reporting, and migration from Excel to Power BI. Fresher projects start with supervised reporting before independent module ownership.',
  },
  {
    title: 'Tech stack',
    body: 'SQL Server, Oracle, or PostgreSQL for querying; Python/pandas for scripting; Power BI and Tableau for visualization; Excel for rapid prototyping. Cloud exposure (Azure) grows with project assignment.',
  },
  {
    title: 'Work culture',
    body: 'Service-delivery model with client timelines and structured training (ILP). Expect rotational learning, documentation standards, and collaboration with onshore teams. Relocation flexibility is frequently tested in HR.',
  },
  {
    title: 'Career progression',
    body: 'Data Analyst → Senior DA → Lead Analyst / Analytics Consultant → Practice lead. Upskilling in cloud, advanced SQL, and domain expertise (BFSI, supply chain) accelerates promotion cycles.',
  },
] as const

export const WIPRO_DA_SALARY_TIERS = [
  {
    title: 'Fresher / campus',
    range: '₹3.5–6 LPA',
    note: 'NLTH campus offers for analytics and data roles. Strong NLTH percentile and internship experience can push toward upper band.',
    tier: 'entry' as const,
  },
  {
    title: '1–3 years',
    range: '₹5–9 LPA',
    note: 'Independent module ownership, client-facing reporting, and SQL/Python depth expected. Domain specialization adds premium.',
    tier: 'mid' as const,
  },
  {
    title: 'Senior DA (3–5 years)',
    range: '₹8–14 LPA',
    note: 'Leads small analytics workstreams, mentors juniors, and owns stakeholder communication for deliverables.',
    tier: 'senior' as const,
  },
  {
    title: 'Lead DA / Analytics Lead',
    range: '₹12–18+ LPA',
    note: 'Practice-level ownership, pre-sales support, and cross-functional leadership. Varies sharply by account and city.',
    tier: 'lead' as const,
  },
] as const

export const WIPRO_DA_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'SQL foundations',
    items: [
      'Master SELECT, JOINs, GROUP BY, HAVING, and subqueries',
      'Practice 15 live query problems (ranking, dedup, aggregations)',
      'Review NLTH aptitude quant and logical sections daily',
    ],
  },
  {
    week: 'Week 2',
    focus: 'Python + data cleaning',
    items: [
      'pandas groupby, merge, fillna, and value_counts drills',
      'Clean a messy CSV end-to-end with documented steps',
      'Complete 2 NLTH-style technical MCQ mock tests',
    ],
  },
  {
    week: 'Week 3',
    focus: 'Statistics + visualization',
    items: [
      'Revise p-values, hypothesis tests, correlation vs causation',
      'Build one Power BI or Tableau dashboard with 3 chart types',
      'Practice explaining a chart to a non-technical audience',
    ],
  },
  {
    week: 'Week 4',
    focus: 'Cases + mocks + HR',
    items: [
      'Walk through 3 structured business case scenarios aloud',
      'Prepare 2 STAR project stories with quantified impact',
      'Full Wipro-style technical + HR mock on InterviewEra',
    ],
  },
] as const

export const WIPRO_DA_MISTAKES = [
  'Memorizing SQL syntax without explaining query logic aloud during live rounds.',
  'Claiming ML expertise on resume but failing basic supervised vs unsupervised questions.',
  'Ignoring NLTH aptitude — strong SQL alone cannot save a failed online assessment.',
  'Answering p-value questions incorrectly by saying “97% chance the hypothesis is true.”',
  'Using pie charts for everything instead of matching chart type to analytical intent.',
  'Rambling project answers without STAR structure or measurable business impact.',
  'Saying “I don’t know” without offering a structured guess or follow-up plan.',
  'Skipping Excel prep because the role is “data” — Wipro clients still use spreadsheets daily.',
  'Not researching Wipro-specific context for “why this company” HR answers.',
  'Overstating salary expectations without tying to role scope and market range.',
  'Silent coding/query writing — panels expect narrated approach before typing.',
  'Copying generic DA answers from other company pages without Wipro/NLTH context.',
] as const

export const WIPRO_DA_CHECKLIST = [
  'NLTH registration confirmed with correct academic details',
  'Resume updated with SQL, Python, and one visualization tool — quantified project bullets',
  '10 SQL queries practiced live (JOINs, subqueries, ranking)',
  'pandas groupby and missing-value handling script ready to explain',
  'p-value and hypothesis testing answer rehearsed without common misinterpretations',
  'One Power BI or Tableau dashboard demo prepared',
  'Two STAR behavioral stories with business impact metrics',
  '“Why Wipro” answer with analytics practice and relocation willingness',
  'Salary range researched (₹3.5–6 LPA fresher band) with flexible framing',
  'Laptop, stable internet, and quiet space confirmed for online rounds',
] as const

export const WIPRO_DA_VS_PEER_ROWS = [
  ['Entry assessment', 'NLTH online test (aptitude + technical MCQs)', 'TCS NQT (strong aptitude weight)', 'InfyTQ certification + aptitude'],
  ['SQL depth', 'Medium — live queries expected', 'Medium — MCQ + panel queries', 'Medium — similar for analytics tracks'],
  ['Python expectation', 'pandas basics for DA roles', 'Varies by project assignment', 'Growing for data-heavy SE/DA paths'],
  ['Typical fresher package', '₹3.5–6 LPA analytics band', '₹3.3–7 LPA (Ninja/Digital tracks)', '₹3.6–4.5 LPA SE; DA similar'],
  ['HR style', 'Often combined with technical', 'Separate MR/HR common', 'Dedicated HR round typical'],
  ['Interview difficulty', 'Easy to medium for fresher DA', 'Easy to medium', 'Easy to medium'],
] as const

export const WIPRO_DA_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/topics/sql', label: 'SQL Interview Questions' },
  { href: '/interview-questions/topics/python', label: 'Python Interview Questions' },
  { href: '/interview-questions/data-analyst', label: 'Data Analyst Interview Questions' },
  { href: '/interview-questions/business-analyst', label: 'Business Analyst Questions' },
  { href: '/interview-questions/companies/tcs/data-analyst', label: 'TCS Data Analyst Questions' },
  { href: '/interview-questions/companies/infosys/data-analyst', label: 'Infosys Data Analyst Questions' },
  { href: '/interview-questions/companies/accenture/data-analyst', label: 'Accenture Data Analyst Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions Hub' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Tips' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Interview Guide' },
  { href: '/tools/question-generator', label: 'AI Question Generator' },
  { href: '/signup', label: 'Free Mock Interview' },
] as const

export const WIPRO_DA_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/companies/wipro', label: 'Wipro Careers Hub' },
  { href: '/interview-questions/companies/wipro/software-engineer', label: 'Wipro SWE Questions' },
  { href: '/interview-questions/companies/wipro/java-developer', label: 'Wipro Java Questions' },
  { href: '/interview-questions/companies/wipro/qa-engineer', label: 'Wipro QA Questions' },
  { href: '/interview-questions/companies/tcs/data-analyst', label: 'TCS DA Questions' },
  { href: '/interview-questions/companies/infosys/data-analyst', label: 'Infosys DA Questions' },
  { href: '/interview-questions/companies/accenture/data-analyst', label: 'Accenture DA Questions' },
  { href: '/interview-questions/companies/hcl/data-analyst', label: 'HCL DA Questions' },
  { href: '/interview-questions/companies/cognizant/data-analyst', label: 'Cognizant DA Questions' },
  { href: '/interview-questions/companies/amazon/data-scientist', label: 'Amazon Data Scientist Questions' },
  { href: '/interview-questions/business-analyst', label: 'Business Analyst Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Questions' },
  { href: '/interview-questions/topics/python', label: 'Python Questions' },
] as const

export const WIPRO_DA_FAQ_ITEMS = [
  {
    question: 'What does Wipro ask in Data Analyst interviews?',
    answer:
      'Wipro Data Analyst interviews typically cover NLTH online assessment (aptitude + technical MCQs), live SQL queries, Python/pandas basics, statistics concepts, Excel reporting, visualization tool familiarity, project discussion, and HR/behavioral questions. Fresher drives emphasize fundamentals over advanced machine learning.',
  },
  {
    question: 'Is SQL mandatory for Wipro Data Analyst interviews?',
    answer:
      'Yes. SQL is the highest-weight skill for Wipro DA roles. Expect live query writing — JOINs, GROUP BY, subqueries, and ranking problems. Candidates who cannot write basic queries are eliminated in technical rounds regardless of Python or ML knowledge.',
  },
  {
    question: 'Is Python compulsory for Wipro Data Analyst roles?',
    answer:
      'Python is strongly expected but not always tested as heavily as SQL. Panels probe pandas data manipulation, missing value handling, and groupby operations. You should be able to read and explain short Python scripts even if live coding is optional.',
  },
  {
    question: 'How difficult is the Wipro Data Analyst interview?',
    answer:
      'Easy to medium for fresher campus hires. NLTH filters aptitude first; technical rounds focus on foundational SQL, statistics, and communication — not competitive-programming difficulty. Lateral hires with 1–3 years face deeper case studies and domain questions.',
  },
  {
    question: 'How many rounds are in Wipro Data Analyst interviews?',
    answer:
      'Typically three stages: NLTH online test, technical interview (SQL/Python/stats/project), and HR round — sometimes combined into one live session. Off-campus drives may add a resume screening step before NLTH.',
  },
  {
    question: 'What is the salary for Wipro Data Analyst in India?',
    answer:
      'Fresher campus offers typically range ₹3.5–6 LPA. With 1–3 years experience, expect ₹5–9 LPA. Senior and lead analytics roles reach ₹8–18+ LPA depending on domain, city, and client account. Confirm fixed vs variable CTC split before accepting.',
  },
  {
    question: 'Can freshers crack Wipro Data Analyst interviews?',
    answer:
      'Yes. NLTH is designed for mass fresher hiring. Strong aptitude, SQL fundamentals, a quantified capstone project, and clear communication are the primary success factors. Internship or analytics coursework strengthens your profile significantly.',
  },
  {
    question: 'What is NLTH and is it mandatory for Wipro hiring?',
    answer:
      'NLTH (National Level Talent Hunt) is Wipro’s online assessment for campus and off-campus fresher drives. It includes aptitude, technical MCQs, and sometimes coding. Most analytics campus shortlists treat NLTH as mandatory — prepare as if you cannot skip it.',
  },
  {
    question: 'Does Wipro ask machine learning questions to Data Analysts?',
    answer:
      'Basic ML concepts — supervised vs unsupervised, overfitting awareness — may appear. Deep algorithm theory and model tuning are uncommon for entry-level DA. Focus on SQL, statistics, and business case communication first.',
  },
  {
    question: 'What CGPA cutoff does Wipro use for Data Analyst roles?',
    answer:
      'Commonly 60–65% aggregate or 6.0+ CGPA with no active backlogs. Cutoffs vary by college tier and hiring season. Strong NLTH scores or relevant internships can offset borderline academics in some drives.',
  },
  {
    question: 'Wipro vs TCS Data Analyst — which is harder?',
    answer:
      'Similar overall difficulty for fresher DA roles. Wipro routes through NLTH; TCS uses NQT with strong aptitude weight. Both test SQL and fundamentals. Compare both processes and prepare company-specific mocks in your final week.',
  },
  {
    question: 'What visualization tools should I mention for Wipro DA?',
    answer:
      'Power BI is the strongest mention for Wipro client work. Tableau, Excel charts, and Python matplotlib/seaborn are also valued. Explain chart selection logic — bar for comparison, line for trends, histogram for distributions.',
  },
  {
    question: 'How should I answer “Why Wipro” in the HR round?',
    answer:
      'Combine Wipro’s global analytics practice scale, structured training (ILP), client exposure across industries, and personal fit — relocation willingness and learning goals. Avoid generic brand-name answers without specific research.',
  },
  {
    question: 'How long does the Wipro Data Analyst offer process take?',
    answer:
      'Typically 2–6 weeks from final HR round to offer letter, depending on batch scheduling, background verification, and joining date alignment. Off-campus drives may take longer during low-hiring seasons.',
  },
  {
    question: 'What projects should I prepare for Wipro DA technical rounds?',
    answer:
      'Prepare one analytics capstone or internship project with clear problem statement, data sources, SQL/Python tools used, visualizations built, and quantified business impact. Panels probe whether you built the analysis or only followed a tutorial.',
  },
  {
    question: 'Does Wipro combine technical and HR rounds?',
    answer:
      'Yes, frequently. Many drives use a single combined session covering SQL/stats questions followed by HR fit and relocation discussion. Practice sustained communication — do not treat HR as an afterthought.',
  },
  {
    question: 'What statistics topics matter most for Wipro DA?',
    answer:
      'Mean/median/mode, distributions, correlation, hypothesis testing, p-value interpretation, and A/B test basics. The most common trap is misinterpreting p-values — study correct and incorrect phrasing before your panel.',
  },
  {
    question: 'How do I prepare for Wipro DA interviews in 30 days?',
    answer:
      'Week 1: SQL drills + NLTH aptitude. Week 2: Python/pandas + data cleaning. Week 3: statistics + Power BI dashboard. Week 4: case studies, STAR stories, and full mock interviews. Follow the week-by-week roadmap in this guide.',
  },
] as const

export const WIPRO_DA_QUESTIONS = [
  {
    question: 'Write a SQL query to find the second-highest salary from an Employee table.',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2–3 min',
    whyAsked:
      'SQL ranking problems appear in almost every Wipro DA technical round — they test subquery thinking and edge-case awareness under time pressure.',
    evaluates:
      'Subquery or window-function fluency, handling duplicate top salaries, and whether you explain logic before typing.',
    strategy:
      'State approach first (subquery with MAX or DENSE_RANK), write the query, then mention tie-handling for duplicate highest salaries.',
    expertAnswer:
      'Use a subquery: SELECT MAX(salary) FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee). For ties at second place, prefer DENSE_RANK() OVER (ORDER BY salary DESC) = 2. Always mention what happens when two employees share the highest salary.',
    mistakes:
      'Using LIMIT/OFFSET without specifying dialect, forgetting NULL salaries, or unable to explain the subquery logic aloud.',
    followUps: [
      'How would you find the Nth highest salary?',
      'What if multiple employees share the second-highest salary?',
    ],
    tip: 'Mention edge cases: duplicate top salaries and NULL handling.',
    keywords: ['SQL subquery', 'DENSE_RANK', 'second highest salary'],
  },
  {
    question: 'What is the difference between INNER JOIN and LEFT JOIN?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '1–2 min',
    whyAsked:
      'JOIN semantics are daily work for reporting analysts — Wipro panels use this to filter candidates who only memorized syntax.',
    evaluates:
      'Whether you understand matching vs preserving rows and can map JOINs to real reporting scenarios.',
    strategy:
      'Define each JOIN, draw a mental Venn diagram, then give one business example (e.g. all customers vs only customers with orders).',
    expertAnswer:
      'INNER JOIN returns only rows with matches in both tables. LEFT JOIN returns all rows from the left table, with NULLs where the right table has no match. Use INNER for intersection reports; LEFT when you must keep all records from the primary table (e.g. all customers including those without purchases).',
    mistakes:
      'Confusing LEFT and RIGHT JOIN, or unable to explain NULL behavior in unmatched rows.',
    followUps: ['When would you use FULL OUTER JOIN?', 'How do JOINs affect row counts in aggregations?'],
    tip: 'Draw a Venn diagram mentally as you explain.',
    keywords: ['INNER JOIN', 'LEFT JOIN', 'NULL', 'matching rows'],
  },
  {
    question: 'Use a window function to rank employees by salary within each department.',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3–4 min',
    whyAsked:
      'Window functions separate candidates who only know basic GROUP BY from those ready for ranking and running-total reports on client dashboards.',
    evaluates:
      'PARTITION BY usage, RANK vs DENSE_RANK vs ROW_NUMBER choice, and clean syntax under pressure.',
    strategy:
      'Name the function (RANK or DENSE_RANK), show PARTITION BY department, ORDER BY salary DESC, and explain tie behavior.',
    expertAnswer:
      'SELECT employee_id, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank FROM Employee. Use DENSE_RANK when ties should share rank without gaps; ROW_NUMBER when each row needs a unique rank.',
    mistakes:
      'Using GROUP BY instead of window functions, or picking RANK without explaining gap behavior after ties.',
    followUps: ['Difference between RANK and ROW_NUMBER?', 'How would you filter only top 3 per department?'],
    tip: 'Explain PARTITION BY before writing the full query.',
    keywords: ['window function', 'DENSE_RANK', 'PARTITION BY'],
  },
  {
    question: 'How do you handle missing values in a pandas DataFrame? Give at least three strategies.',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2–3 min',
    whyAsked:
      'Real client datasets are messy — Wipro panels want practical cleaning judgment, not textbook definitions alone.',
    evaluates:
      'When to drop vs impute vs model-fill, and whether you justify choices with data context.',
    strategy:
      'List three strategies with when-to-use: drop (low missing %), mean/median impute (numeric), forward-fill (time series), model-based (high stakes).',
    expertAnswer:
      'Drop rows/columns if missingness is below ~5% and random. Impute with median (skewed numeric) or mode (categorical). Forward-fill for time series. Flag imputed values in production pipelines so stakeholders know data quality limits.',
    mistakes:
      'Always dropping NULLs without checking bias, or imputing means on skewed distributions without mentioning median alternative.',
    followUps: ['How do you detect if missingness is random?', 'Would you impute before or after train/test split?'],
    tip: 'State when you would choose each strategy — context matters.',
    keywords: ['missing values', 'imputation', 'pandas', 'data cleaning'],
  },
  {
    question: 'How would you group sales data by region and compute monthly totals in pandas?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2–3 min',
    whyAsked:
      'groupby operations mirror daily reporting tasks — panels check if you can translate business questions into pandas code.',
    evaluates:
      'groupby syntax, aggregation choice, and date handling for monthly rollups.',
    strategy:
      'Mention parsing dates, creating a month column, then groupby region + month with sum on sales column.',
    expertAnswer:
      'df["month"] = pd.to_datetime(df["date"]).dt.to_period("M"); result = df.groupby(["region", "month"])["sales"].sum().reset_index(). Sort by region and month for readable output. Mention handling missing regions or null sales explicitly.',
    mistakes:
      'Forgetting to reset_index for flat output, or aggregating before filtering invalid dates.',
    followUps: ['How would you pivot this result for a dashboard?', 'How do you handle duplicate transactions?'],
    tip: 'Narrate the business question before writing groupby code.',
    keywords: ['pandas groupby', 'aggregation', 'monthly sales'],
  },
  {
    question: 'What does a p-value of 0.03 mean in a hypothesis test?',
    category: 'technical',
    difficulty: 'hard',
    answerTime: '2 min',
    whyAsked:
      'Misinterpreting p-values is a common analyst failure mode — Wipro panels use this to test statistical literacy.',
    evaluates:
      'Correct frequentist interpretation and awareness of common wrong phrasing.',
    strategy:
      'Define p-value under null hypothesis, give the 0.03 reading, explicitly state what it does NOT mean.',
    expertAnswer:
      'A p-value of 0.03 means: if the null hypothesis were true, there is a 3% probability of observing a result this extreme or more. It does NOT mean a 97% chance the alternative hypothesis is true. Compare against your chosen significance level (often 0.05) before rejecting the null.',
    mistakes:
      'Saying “97% probability the result is correct” or confusing p-value with effect size.',
    followUps: ['What is Type I error?', 'How is p-value different from confidence interval?'],
    tip: 'Never say “97% chance the hypothesis is correct” — that is wrong.',
    keywords: ['p-value', 'null hypothesis', 'significance level'],
  },
  {
    question: 'Explain the difference between supervised and unsupervised learning with one example each.',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '2 min',
    whyAsked:
      'Basic ML literacy is increasingly tested even for DA roles that are not ML-heavy — panels check conceptual clarity.',
    evaluates:
      'Label vs no-label understanding and ability to cite practical business examples.',
    strategy:
      'Define both, give one example each (classification/regression vs clustering), note when DA work stays supervised.',
    expertAnswer:
      'Supervised learning uses labeled data to learn a mapping — e.g. predicting churn (yes/no) from customer features. Unsupervised finds patterns without labels — e.g. customer segmentation via clustering. Most Wipro DA reporting work is supervised or descriptive statistics, not deep unsupervised pipelines.',
    mistakes:
      'Listing algorithms without explaining labels, or claiming all analytics is machine learning.',
    followUps: ['What is overfitting?', 'When would you use clustering in a business context?'],
    tip: 'Give one concrete business example for each type.',
    keywords: ['supervised learning', 'unsupervised learning', 'classification', 'clustering'],
  },
  {
    question: 'When would you use VLOOKUP vs INDEX-MATCH in Excel?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '1–2 min',
    whyAsked:
      'Excel remains ubiquitous in Wipro client reporting — panels test practical spreadsheet skills alongside SQL.',
    evaluates:
      'Lookup mechanics, column position limitations, and performance awareness on large tables.',
    strategy:
      'Explain VLOOKUP left-column lookup limit, INDEX-MATCH flexibility for any column, mention approximate vs exact match.',
    expertAnswer:
      'VLOOKUP searches the leftmost column and returns a value from a fixed column index — simple but breaks if lookup column is not leftmost. INDEX-MATCH pairs INDEX and MATCH for flexible lookups in any direction and is more robust when columns move. Use XLOOKUP on newer Excel if available.',
    mistakes:
      'Not mentioning VLOOKUP column-index rigidity, or unable to explain #N/A error causes.',
    followUps: ['What is the difference between exact and approximate match?', 'How would you handle duplicate keys?'],
    tip: 'Mention INDEX-MATCH when lookup column is not the leftmost.',
    keywords: ['VLOOKUP', 'INDEX-MATCH', 'Excel lookup'],
  },
  {
    question: 'How do you decide which chart type to use for a stakeholder dashboard?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked:
      'Visualization judgment reflects client-facing readiness — Wipro DAs present insights to non-technical managers.',
    evaluates:
      'Chart-intent mapping and ability to avoid misleading visuals.',
    strategy:
      'Map analytical intent to chart: comparison → bar, trend → line, distribution → histogram, part-to-whole → stacked bar (not pie unless few categories).',
    expertAnswer:
      'Match chart to the decision: bar charts for category comparison, line charts for time trends, histograms for distributions, scatter for correlation. Avoid pie charts with many slices. Always label axes, cite data source, and lead with the “so what” recommendation before showing the chart.',
    mistakes:
      'Defaulting to pie charts, using dual axes misleadingly, or showing charts without a narrative recommendation.',
    followUps: ['When is a stacked bar better than a grouped bar?', 'How do you handle seasonality in trend charts?'],
    tip: 'Mention Power BI or Tableau tools you have used with a real example.',
    keywords: ['chart selection', 'Power BI', 'Tableau', 'data visualization'],
  },
  {
    question: 'Walk me through how you would analyze customer churn for a subscription business.',
    category: 'situational',
    difficulty: 'hard',
    answerTime: '4–5 min',
    whyAsked:
      'Case studies test structured thinking — Wipro panels want problem framing, not jump-to-model answers.',
    evaluates:
      'Problem definition, metric choice, data needs, analysis approach, and actionable recommendations.',
    strategy:
      'Define churn metric → identify data sources → exploratory analysis → root causes → recommend interventions → mention how you would measure success.',
    expertAnswer:
      'Define churn rate (cancelled / active at period start). Pull subscription, usage, and support ticket data. Segment churn by tenure and plan. Compare behavioral features of churned vs retained users. Recommend targeted retention (onboarding fixes, usage alerts). Measure impact with a cohort A/B test or pre/post intervention tracking.',
    mistakes:
      'Jumping to ML without defining churn, ignoring data quality, or skipping actionable recommendations.',
    followUps: ['What features would you engineer?', 'How would you validate the analysis?'],
    tip: 'Structure: problem → data → analysis → recommendation → impact measurement.',
    keywords: ['case study', 'churn analysis', 'business analytics'],
  },
  {
    question: 'Tell me about a data analysis project you worked on. What was the business impact?',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked:
      'Resume verification — Wipro panels probe whether project claims are real and whether you can quantify outcomes.',
    evaluates:
      'STAR structure, ownership clarity, tool fluency, and quantified business impact.',
    strategy:
      'Situation → Task → Action (tools: SQL/Python/viz) → Result with a number (%, ₹ saved, time reduced).',
    expertAnswer:
      'Example: “For my capstone, sales data had 12% duplicate orders. I used SQL to dedupe and Python to flag anomalies, built a Power BI dashboard for weekly KPIs, and our demo showed a 15% reduction in manual reconciliation time for the operations team.” Adapt with your real project and honest metrics.',
    mistakes:
      'Vague “we analyzed data” without your role, no metrics, or unable to answer follow-ups on methodology.',
    followUps: ['What would you improve if you rebuilt it?', 'Which part did you personally implement?'],
    tip: 'Quantify impact wherever possible — percentages, time saved, or revenue influenced.',
    keywords: ['STAR method', 'business impact', 'project discussion'],
  },
  {
    question: 'Why do you want to join Wipro as a Data Analyst?',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked:
      'HR and combined rounds test motivation, relocation fit, and whether you researched Wipro beyond the job posting.',
    evaluates:
      'Company research depth, genuine motivation, relocation flexibility, and communication clarity.',
    strategy:
      'Combine Wipro analytics scale, training structure, industry exposure, and personal learning goals — avoid generic praise.',
    expertAnswer:
      'Anchor on Wipro’s multi-industry analytics exposure, structured ILP training, and opportunity to grow from reporting to client-facing insights. Mention relocation flexibility and a specific skill you will build (e.g. Power BI + SQL depth) in the first year. Tie to your project experience authentically.',
    mistakes:
      'Generic “brand name” answers, no mention of analytics practice, or sounding unprepared for relocation questions.',
    followUps: ['Are you willing to relocate?', 'What are your salary expectations?'],
    tip: 'Research Wipro analytics practice and mention one specific initiative.',
    keywords: ['why Wipro', 'HR interview', 'relocation'],
  },
] as const satisfies readonly SeoQuestion[]

export function isWiproDataAnalystHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'wipro' && roleSlug === 'data-analyst'
}
