import type { SeoQuestion } from './types'

export const WIPRO_JAVA_HERO_PATH = '/blog/wipro-java-developer-hero.webp'
export const WIPRO_JAVA_HERO_ALT =
  'Wipro Java Developer interview preparation guide 2026 — NLTH online test, Core Java, Spring Boot, JVM, collections, REST APIs, and HR interview for Java roles in India'
export const WIPRO_JAVA_HERO_WIDTH = 1536
export const WIPRO_JAVA_HERO_HEIGHT = 1024

export const WIPRO_JAVA_PROCESS_PATH = '/blog/wipro-java-developer-process-2026.webp'
export const WIPRO_JAVA_PROCESS_ALT =
  'Wipro Java Developer interview process flow 2026: Application, NLTH Online Test, Technical Java Interview, HR Round, and Offer'
export const WIPRO_JAVA_PROCESS_WIDTH = 1672
export const WIPRO_JAVA_PROCESS_HEIGHT = 941

export const WIPRO_JAVA_META_TITLE = 'Wipro Java Developer Interview Questions and Answers (2026)'
export const WIPRO_JAVA_CANONICAL_PATH = '/interview-questions/companies/wipro/java-developer'
export const WIPRO_JAVA_DESCRIPTION =
  'Wipro Java Developer interview questions for India 2026: NLTH, Core Java, Spring Boot, JVM, collections, salary ranges, 30-day roadmap, and expert sample answers.'
export const WIPRO_JAVA_EDITORIAL_NOTE =
  'Content reviewed and updated for current Wipro Java Developer hiring patterns — NLTH online assessment, fresher eligibility, Core Java and Spring Boot technical depth, JVM and collections probes, project discussion, HR evaluation, and ILP placement expectations in India.'
export const WIPRO_JAVA_READING_TIME = '26 min read'
export const WIPRO_JAVA_PUBLISHED_DATE = '2026-05-21'
export const WIPRO_JAVA_LAST_UPDATED = '2026-06-23'
export const WIPRO_JAVA_REVIEWED_DATE = '2026-06-23'
export const WIPRO_JAVA_AUTHOR_NAME = 'InterviewEra Team'
export const WIPRO_JAVA_REVIEWER_NAME = 'InterviewEra Editorial'

export const WIPRO_JAVA_TOC_SECTIONS = [
  { id: 'wipro-java-overview', label: 'What Wipro Asks Java Candidates' },
  { id: 'wipro-java-hiring-process', label: 'Wipro Hiring Process' },
  { id: 'wipro-java-eligibility', label: 'Eligibility Criteria' },
  { id: 'wipro-java-interview-pattern', label: 'Interview Pattern' },
  { id: 'wipro-java-skills-tested', label: 'Skills Tested' },
  { id: 'wipro-java-2026-trends', label: '2026 Hiring Trends' },
  { id: 'wipro-java-question-categories', label: 'Question Categories' },
  { id: 'wipro-java-company-insights', label: 'Company Insights' },
  { id: 'wipro-java-salary', label: 'Salary Guide' },
  { id: 'wipro-java-questions', label: 'Interview Questions' },
  { id: 'wipro-java-roadmap', label: '30-Day Roadmap' },
  { id: 'wipro-java-mistakes', label: 'Common Mistakes' },
  { id: 'wipro-java-checklist', label: 'Last-Minute Checklist' },
  { id: 'wipro-java-resources', label: 'Recommended Resources' },
  { id: 'wipro-java-vs-peers', label: 'Wipro vs TCS vs Infosys' },
  { id: 'wipro-java-faq', label: 'FAQs' },
  { id: 'wipro-java-mock-cta', label: 'Practice Mock Interview' },
  { id: 'wipro-java-related', label: 'Related Guides' },
] as const

export const WIPRO_JAVA_HIRING_STEPS = [
  {
    step: 'Step 1 — Application & resume screening',
    body: 'Register on Wipro careers or campus portal. Recruiters scan for Java/Spring Boot project depth, internships, CGPA, and measurable API or database outcomes. Highlight REST endpoints built, schema design, and performance fixes — not generic “worked on Java project” bullets.',
  },
  {
    step: 'Step 2 — NLTH (National Level Talent Hunt) online test',
    body: 'Timed assessment covering aptitude (quant, logical, verbal) and technical MCQs (Java fundamentals, OOP, collections, SQL basics). Many drives include one or two easy coding problems. Strong NLTH scores shortlist candidates for live Java technical panels.',
  },
  {
    step: 'Step 3 — Technical Java interview',
    body: 'Live round probing Core Java, collections, OOP, exception handling, multithreading basics, Spring Boot fundamentals, SQL, and coding (arrays, strings, HashMap patterns). Panels expect narrated answers — not silent memorized definitions.',
  },
  {
    step: 'Step 4 — HR round (often combined with technical)',
    body: 'Communication, relocation flexibility, salary expectations, and “why Wipro.” Research Wipro’s digital engineering practice, Java-heavy client accounts, and ILP training structure for credible company-specific answers.',
  },
  {
    step: 'Step 5 — Offer',
    body: 'Selected candidates receive offer with role band and CTC (typically ₹3.5–7.5 LPA for fresher Java tracks), joining location, and ILP training details. Confirm fixed vs variable split before accepting.',
  },
] as const

export const WIPRO_JAVA_ELIGIBILITY_CARDS = [
  {
    title: 'Educational background',
    body: 'B.Tech/B.E. (CS/IT/ECE), MCA, or B.Sc. Computer Science. Wipro hires Java profiles from engineering backgrounds for campus and off-campus drives. Spring Boot capstone or internship experience strengthens shortlists.',
  },
  {
    title: 'CGPA cutoff',
    body: 'Commonly 60–65% aggregate (or 6.0+ CGPA) with no active backlogs. Strong NLTH scores or a substantive Java API project can offset borderline academics in some seasons.',
  },
  {
    title: 'Core skills',
    body: 'Core Java, collections, OOP, exception handling, multithreading basics, Spring Boot REST APIs, SQL/JDBC, Git, and Agile awareness. JVM/GC overview is a differentiator at fresher level.',
  },
  {
    title: 'Experience level',
    body: 'Freshers via NLTH are the primary entry path. Lateral hires (1–3 years) face deeper Spring, microservices, and production-debugging questions with higher salary bands.',
  },
  {
    title: 'Freshers vs experienced',
    body: 'Freshers: NLTH + Core Java + one Spring Boot project. Experienced: module ownership, OOM triage, framework depth, and client-delivery scenarios. Both tracks value clear communication.',
  },
] as const

export const WIPRO_JAVA_INTERVIEW_ROUNDS = [
  {
    round: 'NLTH Online Test',
    duration: '60–90 min',
    format: 'Aptitude + Java MCQs + optional coding',
    evaluates: 'Speed, accuracy, Java fundamentals, and elimination before live panels.',
  },
  {
    round: 'Technical Java Interview',
    duration: '45–60 min',
    format: 'Core Java, Spring Boot, SQL, coding, project deep-dive',
    evaluates: 'Language depth, framework awareness, and resume authenticity.',
  },
  {
    round: 'HR / Managerial',
    duration: '15–25 min',
    format: 'Behavioral + fit + relocation + salary',
    evaluates: 'Communication, adaptability, motivation for Wipro, and professional attitude.',
  },
] as const

export const WIPRO_JAVA_SKILL_CARDS = [
  { skill: 'Core Java', weight: 'High', detail: '== vs .equals(), String immutability, access modifiers, and tracing simple program output under panel pressure.' },
  { skill: 'Collections', weight: 'High', detail: 'ArrayList vs LinkedList vs HashMap trade-offs, complexity awareness, and ConcurrentHashMap for threaded contexts.' },
  { skill: 'OOP / SOLID', weight: 'High', detail: 'Four pillars with examples, abstract class vs interface, and one-line SOLID application in project design.' },
  { skill: 'Exception Handling', weight: 'Medium–High', detail: 'Checked vs unchecked hierarchy, try-with-resources, and when custom exceptions make sense in services.' },
  { skill: 'Multithreading', weight: 'Medium', detail: 'synchronized vs volatile, thread lifecycle, and ExecutorService awareness — not deep lock-free theory at fresher level.' },
  { skill: 'JVM / GC', weight: 'Medium', detail: 'Heap vs stack, generational GC, minor vs major GC, and OOM triage basics.' },
  { skill: 'Spring Boot', weight: 'Medium–High', detail: 'Auto-configuration, REST controllers, dependency injection, JPA basics, and @ControllerAdvice error handling.' },
  { skill: 'SQL / JDBC', weight: 'Medium', detail: 'JOINs, indexing basics, and connection pooling concept for enterprise Java apps.' },
  { skill: 'REST APIs', weight: 'Medium', detail: 'HTTP methods, status codes, DTO pattern, and validation on Spring Boot endpoints.' },
  { skill: 'Communication', weight: 'High', detail: 'Explaining Spring project architecture in two minutes and structured HR answers.' },
] as const

export const WIPRO_JAVA_2026_TRENDS = [
  { title: 'NLTH remains the primary fresher gate', body: 'Campus Java shortlists still route through NLTH. Aptitude plus Java MCQ accuracy eliminates candidates before live Spring Boot discussions.' },
  { title: 'Spring Boot project depth rising', body: 'Wipro panels increasingly probe REST API design, layered architecture, and your specific module ownership — not only Core Java definitions.' },
  { title: 'Combined technical + HR rounds', body: 'Many drives compress Java technical and HR into one session. Prepare collections answers and “why Wipro” in the same mock.' },
  { title: 'JVM troubleshooting awareness', body: 'Fresher candidates who can discuss OOM triage and GC basics stand out in lateral and strong fresher panels.' },
] as const

export const WIPRO_JAVA_QUESTION_CATEGORIES = [
  { category: 'Core Java', count: '4 questions', focus: '== vs equals, Java 8, collections, HashMap' },
  { category: 'OOP / Design', count: '2 questions', focus: 'SOLID, exception hierarchy' },
  { category: 'Concurrency / JVM', count: '3 questions', focus: 'Multithreading, GC, OOM triage' },
  { category: 'Spring Boot', count: '2 questions', focus: 'Auto-configuration, project architecture' },
  { category: 'Behavioral / HR', count: '2 questions', focus: 'Spring project STAR, why Wipro Java' },
  { category: 'Situational', count: '1 question', focus: 'Production OOM scenario' },
] as const

export const WIPRO_JAVA_COMPANY_INSIGHTS = [
  { title: 'Java engineering practice', body: 'Wipro’s application development practice spans enterprise Java, Spring Boot microservices, and legacy modernization for BFSI, healthcare, retail, and telecom clients. Java developers work in blended onshore-offshore Agile teams.' },
  { title: 'Types of projects', body: 'Typical engagements: REST API development, ERP integrations, batch processing, cloud migration of Java monoliths, and maintenance of Spring-based client portals. Fresher projects start with supervised feature modules.' },
  { title: 'Tech stack', body: 'Java 8–17, Spring Boot, Spring Data JPA, Maven/Gradle, Oracle or SQL Server, Jenkins, REST/JSON, and occasionally Kafka or Redis on client accounts. Stack varies — adaptability matters.' },
  { title: 'Work culture', body: 'Service-delivery model with sprint deadlines, code review standards, and client reporting. ILP trains freshers before project allocation. Relocation flexibility is frequently tested in HR.' },
  { title: 'Career progression', body: 'Java Developer → Senior Developer → Tech Lead → Architect. Spring and cloud certifications accelerate promotion in Wipro engineering tracks.' },
] as const

export const WIPRO_JAVA_SALARY_TIERS = [
  { title: 'Fresher / campus', range: '₹3.5–7.5 LPA', note: 'NLTH campus offers for Java tracks. Spring Boot project evidence can push toward upper band.', tier: 'entry' as const },
  { title: '1–3 years', range: '₹6–12 LPA', note: 'Independent API module ownership, Spring/JPA fluency, and client-facing demos expected.', tier: 'mid' as const },
  { title: 'Senior Java (3–5 years)', range: '₹10–18 LPA', note: 'Leads module design, mentors juniors, owns release quality for Java services.', tier: 'senior' as const },
  { title: 'Lead / Architect', range: '₹15–24+ LPA', note: 'Solution design, microservices strategy, and cross-team technical ownership. Varies by city and account.', tier: 'lead' as const },
] as const

export const WIPRO_JAVA_ROADMAP_WEEKS = [
  { week: 'Week 1', focus: 'Core Java + aptitude', items: ['== vs .equals(), String, collections revision', 'ArrayList/HashMap complexity drills', 'Daily NLTH aptitude (quant + logical)'] },
  { week: 'Week 2', focus: 'OOP + exceptions + threads', items: ['SOLID one-liners with examples', 'Checked vs unchecked exception scenarios', 'synchronized vs volatile concept cards'] },
  { week: 'Week 3', focus: 'Spring Boot + SQL', items: ['REST controller + DTO + JPA revision', 'One JOIN query and indexing basics', 'Practice 2 NLTH-style Java MCQ mocks'] },
  { week: 'Week 4', focus: 'Mocks + HR + projects', items: ['Spring Boot project walkthrough rehearsal', 'Why Wipro Java + relocation answer', 'Full Wipro-style technical + HR mock on InterviewEra'] },
] as const

export const WIPRO_JAVA_MISTAKES = [
  'Ignoring NLTH aptitude — strong Core Java alone cannot save a failed online assessment.',
  'Using == on String objects expecting value equality.',
  'Claiming Spring Boot expertise but unable to explain dependency injection.',
  'Vague “best practices” project answers without DTO or exception-handler specifics.',
  'Claiming volatile makes i++ atomic in multithreading answers.',
  'Only increasing -Xmx for OOM without heap dump analysis.',
  'Using HashTable instead of ConcurrentHashMap without explaining trade-offs.',
  'Unable to walk through Spring Boot capstone architecture under follow-ups.',
  'Rambling HR answers without Wipro-specific research.',
  'Memorizing GC definitions without Eden/Old Gen flow.',
  'Weak SQL/JOIN answers on otherwise strong Java resumes.',
  'Copying generic Java answers without Wipro/NLTH context.',
] as const

export const WIPRO_JAVA_CHECKLIST = [
  'NLTH registration confirmed with correct academic details',
  'Resume lists Java version, Spring Boot modules owned, and API endpoints built',
  '== vs .equals() with String pool example rehearsed',
  'ArrayList vs HashMap use-case answer ready',
  'One Spring Boot project architecture diagram prepared',
  'SOLID principles with micro Java examples',
  'synchronized vs volatile distinction crisp',
  'Generational GC Eden → Old Gen flow explained',
  'STAR Spring project story with design decision',
  '“Why Wipro Java” answer with ILP and digital engineering research',
] as const

export const WIPRO_JAVA_VS_PEER_ROWS = [
  ['Entry assessment', 'NLTH (aptitude + Java MCQs + coding)', 'TCS NQT (strong aptitude)', 'InfyTQ + HackWithInfy'],
  ['Core Java depth', 'High — collections, OOP, exceptions', 'High', 'High'],
  ['Spring Boot expectation', 'Medium–High for fresher Java', 'Medium–High', 'Medium–High'],
  ['JVM / GC probes', 'Growing at fresher level', 'Moderate', 'Moderate to high'],
  ['Typical fresher package', '₹3.5–7.5 LPA Java band', '₹3.3–7 LPA (track dependent)', '₹3.6–9 LPA (track dependent)'],
  ['Interview difficulty', 'Easy to medium', 'Easy to medium', 'Easy to medium'],
] as const

export const WIPRO_JAVA_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/java-developer', label: 'Java Developer Interview Questions' },
  { href: '/interview-questions/topics/spring-boot', label: 'Spring Boot Interview Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Interview Questions' },
  { href: '/interview-questions/companies/wipro/software-engineer', label: 'Wipro Software Engineer Questions' },
  { href: '/interview-questions/companies/wipro/data-analyst', label: 'Wipro Data Analyst Questions' },
  { href: '/interview-questions/companies/wipro/qa-engineer', label: 'Wipro QA Engineer Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Interview Questions Hub' },
  { href: '/interview-questions/companies/infosys/java-developer', label: 'Infosys Java Questions' },
  { href: '/interview-questions/companies/tcs/java-developer', label: 'TCS Java Questions' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Method Guide' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Tips' },
  { href: '/tools/question-generator', label: 'AI Question Generator' },
  { href: '/signup', label: 'Free Mock Interview' },
] as const

export const WIPRO_JAVA_CONTEXTUAL_LINKS = [
  { href: '/interview-questions/java-developer', label: 'Java Developer Questions' },
  { href: '/interview-questions/companies/wipro/software-engineer', label: 'Wipro SWE Questions' },
  { href: '/interview-questions/companies/wipro/data-analyst', label: 'Wipro DA Questions' },
  { href: '/interview-questions/companies/wipro/qa-engineer', label: 'Wipro QA Questions' },
  { href: '/interview-questions/companies/wipro', label: 'Wipro Company Hub' },
  { href: '/interview-questions/topics/spring-boot', label: 'Spring Boot Questions' },
  { href: '/interview-questions/companies/infosys/java-developer', label: 'Infosys Java Questions' },
  { href: '/interview-questions/companies/tcs/java-developer', label: 'TCS Java Questions' },
  { href: '/interview-questions/topics/sql', label: 'SQL Questions' },
] as const

export const WIPRO_JAVA_FAQ_ITEMS = [
  { question: 'What does Wipro ask in Java Developer interviews?', answer: 'Wipro Java interviews typically cover NLTH online assessment (aptitude + Java MCQs + optional coding), Core Java (collections, OOP, exceptions), Spring Boot basics, SQL, JVM/GC overview, coding problems, and Spring project discussion. Fresher drives emphasize fundamentals over advanced microservices architecture.' },
  { question: 'Is Spring Boot mandatory for Wipro Java freshers?', answer: 'Strongly recommended. Most Java panels expect REST API basics, dependency injection, and JPA awareness even for freshers. A small Spring Boot project on your resume significantly improves technical round depth.' },
  { question: 'What is NLTH and is it mandatory for Wipro Java hiring?', answer: 'NLTH (National Level Talent Hunt) is Wipro’s online assessment for campus and off-campus fresher drives. It includes aptitude, Java technical MCQs, and sometimes coding. Most Java campus shortlists treat NLTH as mandatory.' },
  { question: 'How many rounds are in Wipro Java Developer interviews?', answer: 'Typically three: NLTH online test, technical Java interview (Core Java + Spring + project), and HR round — sometimes combined into one live session for off-campus hires.' },
  { question: 'What is the salary for Wipro Java Developer freshers?', answer: 'Fresher campus offers typically range ₹3.5–7.5 LPA depending on college tier and NLTH performance. With 1–3 years Spring experience, expect ₹6–12 LPA. Senior and architect roles reach ₹10–24+ LPA depending on city and client account.' },
  { question: 'Can freshers crack Wipro Java interviews?', answer: 'Yes. NLTH is designed for mass fresher hiring. Strong aptitude, Core Java fundamentals, a Spring Boot capstone project, and clear communication are the primary success factors.' },
  { question: 'Wipro vs Infosys Java — which is harder?', answer: 'Similar overall difficulty for fresher Java roles. Wipro routes through NLTH; Infosys uses InfyTQ/HackWithInfy. Both test Core Java and Spring Boot depth — compare both processes if applying to multiple employers.' },
  { question: 'What Java topics are most asked at Wipro?', answer: 'Core Java (OOP, collections, exceptions), multithreading basics, JVM/GC overview, Spring Boot fundamentals, SQL joins, and coding on arrays, strings, HashMap, and linked lists.' },
  { question: 'How difficult is the Wipro Java coding round?', answer: 'Easy to medium for mass-hiring fresher roles — usually one or two problems, not FAANG hard. Narrated approach and edge-case handling matter as much as optimal solutions.' },
  { question: 'Does Wipro ask microservices questions to freshers?', answer: 'At introductory depth — REST API design, service boundaries, and basic API gateway purpose. Deep distributed systems design is uncommon at entry level but differentiates strong candidates.' },
  { question: 'What projects should I prepare?', answer: 'Prepare one Spring Boot capstone with REST APIs, database layer, validation, and exception handling where you owned specific modules. Panels probe architecture and your personal contributions.' },
  { question: 'Does Wipro combine technical and HR rounds?', answer: 'Yes, frequently. Many drives use a single combined session covering Java questions followed by HR fit and relocation discussion.' },
  { question: 'Which Java version should I mention?', answer: 'Java 8 features (lambdas, Streams) are still common interview fodder; many Wipro client projects run Java 11 or 17. Match your resume and explain features you have actually used.' },
  { question: 'How do I prepare for Wipro Java in 30 days?', answer: 'Week 1: Core Java + aptitude. Week 2: OOP + exceptions + threads. Week 3: Spring Boot + SQL. Week 4: project walkthrough, Why Wipro, and full mocks. Follow the roadmap in this guide.' },
  { question: 'What is Wipro ILP for Java freshers?', answer: 'Initial Learning Program — structured training covering technology fundamentals, soft skills, and client-readiness before project allocation. Mention ILP positively in “why Wipro” answers.' },
  { question: 'Are CGPA cutoffs strict at Wipro for Java roles?', answer: 'Commonly 60–65% aggregate or 6.0+ CGPA with no active backlogs. Strong NLTH scores or Java internships can offset borderline academics in some drives.' },
  { question: 'Should I learn Hibernate or JPA for Wipro?', answer: 'Spring Data JPA is the modern default on Spring Boot projects. Understand entity mapping, repository interfaces, and lazy-loading pitfalls — panels rarely ask raw Hibernate XML configuration at fresher level.' },
  { question: 'How long until offer after final round?', answer: 'Typically 2–6 weeks from final HR round to offer letter, depending on batch scheduling and background verification.' },
] as const

export const WIPRO_JAVA_QUESTIONS: readonly SeoQuestion[] = [
  {
    question: 'What is the difference between `==` and `.equals()` in Java?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Reference vs value equality is a daily Java trap — Wipro panels use this to filter collection and String mishandling early.',
    evaluates: 'Whether you understand reference vs value equality and the equals/hashCode contract.',
    strategy: 'Define == first, then .equals(); give String pool vs new String example.',
    expertAnswer: '`==` compares references (memory addresses). `.equals()` compares logical content when overridden. `new String("a") == new String("a")` is false; `.equals()` is true. Always override hashCode when overriding equals for HashMap keys.',
    mistakes: 'Using == on wrapper objects or Strings expecting value match.',
    followUps: ['Integer cache and ==?', 'Why hashCode with equals?'],
    tip: 'String pool vs new String is the classic trap example.',
    keywords: ['reference equality', 'equals', 'String pool'],
  },
  {
    question: 'What are the key features introduced in Java 8?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2–3 min',
    whyAsked: 'Java 8 modern syntax appears in most Wipro client codebases — panels expect Stream and lambda fluency.',
    evaluates: 'Modern Java awareness beyond Java 7 syntax.',
    strategy: 'List lambda, Streams, Optional, java.time, default interface methods with one-line purpose each.',
    expertAnswer: 'Key Java 8 features: lambda expressions, Stream API for declarative collections processing, Optional for null-safe APIs, java.time replacing legacy Date, default/static interface methods, and CompletableFuture for async composition. Demonstrate a simple filter/map/collect Stream example.',
    mistakes: 'Naming Java 7 features as Java 8 or unable to write a basic lambda.',
    followUps: ['What is a functional interface?', 'Intermediate vs terminal Stream ops?'],
    tip: 'Streams and lambdas are the highest-yield Java 8 topics.',
    keywords: ['lambda', 'Stream API', 'Optional', 'java.time'],
  },
  {
    question: 'What is the difference between ArrayList and LinkedList in Java?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Collection selection judgment is tested in every Wipro Java technical round.',
    evaluates: 'Big-O reasoning and practical collection choice.',
    strategy: 'Compare random access vs insert/delete complexity; default to ArrayList.',
    expertAnswer: 'ArrayList: O(1) random access, O(n) middle insert/delete — backed by dynamic array. LinkedList: O(n) access, O(1) insert/delete at head/tail — doubly linked nodes. Use ArrayList by default; LinkedList only for frequent head/tail mutations without random access.',
    mistakes: 'Claiming LinkedList is faster for everything.',
    followUps: ['How does ArrayList grow?', 'When CopyOnWriteArrayList?'],
    tip: 'Default choice is ArrayList unless you have a specific LinkedList use case.',
    keywords: ['ArrayList', 'LinkedList', 'O(1)', 'random access'],
  },
  {
    question: 'What are checked and unchecked exceptions in Java? When do you use each?',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked: 'Exception hierarchy literacy is core to enterprise Java service code at Wipro clients.',
    evaluates: 'Throwable hierarchy understanding and practical error-handling judgment.',
    strategy: 'Draw hierarchy; one checked example (IOException) and one unchecked (NPE); avoid broad catch.',
    expertAnswer: 'Checked exceptions extend Exception (not RuntimeException) — compiler forces handle or declare (e.g. IOException). Unchecked extend RuntimeException — programming errors like NPE. Use checked for recoverable external failures; let unchecked propagate after validation. Never catch Exception broadly without rethrow or logging.',
    mistakes: 'Swallowing exceptions, catching Exception broadly, confusing Error with Exception.',
    followUps: ['try-with-resources?', 'Custom exception when?'],
    tip: 'Recoverable external failure = checked; programming bug = unchecked.',
    keywords: ['checked exception', 'RuntimeException', 'try-catch'],
  },
  {
    question: 'What are the SOLID principles? Give a one-line Java example for each.',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3–4 min',
    whyAsked: 'OOP design maturity — Wipro panels connect SOLID to Spring Boot layered architecture questions.',
    evaluates: 'Design principle application in real Java projects.',
    strategy: 'One sentence per principle plus micro Java violation vs fix example.',
    expertAnswer: 'S: one class one reason (split UserValidator from UserService). O: extend via new PaymentStrategy impl, not if-else edits. L: subclass Square must honor Rectangle contract. I: small interfaces (Readable, Writable) not one fat interface. D: inject PaymentGateway interface, not concrete Stripe class.',
    mistakes: 'Textbook recitation without code examples or mixing up L and I.',
    followUps: ['Which principle in your Spring project?', 'DI and Dependency Inversion?'],
    tip: 'Micro Java example per letter beats long definitions.',
    keywords: ['SOLID', 'single responsibility', 'dependency inversion'],
  },
  {
    question: 'What is multithreading in Java? Explain `synchronized`, `volatile`, and when you use each.',
    category: 'technical',
    difficulty: 'hard',
    answerTime: '3–4 min',
    whyAsked: 'Concurrency basics surface in Core Java blocks and production follow-ups at Wipro.',
    evaluates: 'Thread safety mechanisms and limits of volatile.',
    strategy: 'Define thread, synchronized monitor lock, volatile visibility — state volatile does not make i++ atomic.',
    expertAnswer: 'Multithreading runs concurrent tasks sharing process memory. synchronized acquires a monitor lock for mutual exclusion on blocks/methods. volatile ensures reads/writes go to main memory (visibility) but does not guarantee compound operation atomicity. Use volatile for flags; synchronized or java.util.concurrent for counters.',
    mistakes: 'Claiming volatile makes i++ atomic; nested locks causing deadlock.',
    followUps: ['ExecutorService vs raw Thread?', 'What is happens-before?'],
    tip: 'volatile = visibility, not atomicity for read-modify-write.',
    keywords: ['synchronized', 'volatile', 'thread safety'],
  },
  {
    question: 'Explain Spring Boot auto-configuration. How does it work under the hood?',
    category: 'technical',
    difficulty: 'hard',
    answerTime: '3–4 min',
    whyAsked: 'Spring Boot depth beyond annotations — Wipro Java panels probe framework understanding on resume claims.',
    evaluates: 'Convention-over-configuration mechanics and conditional bean registration.',
    strategy: 'Trace @SpringBootApplication → @EnableAutoConfiguration → @ConditionalOnClass/MissingBean via starters.',
    expertAnswer: '@SpringBootApplication includes @EnableAutoConfiguration. Spring Boot scans META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports (or spring.factories on older versions), loads @Configuration classes conditionally via @ConditionalOnClass, @ConditionalOnMissingBean, etc. Starters bundle dependencies + auto-config for DataSource, Web MVC, JPA without XML.',
    mistakes: 'Saying “everything is automatic” with no mention of conditions or starters.',
    followUps: ['Exclude auto-configuration?', '@ConditionalOnProperty example?'],
    tip: 'Mention conditional beans — not magic defaults.',
    keywords: ['auto-configuration', '@ConditionalOnClass', 'starter'],
  },
  {
    question: 'Tell me about a Spring Boot application you built. What design decisions are you most proud of?',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '4 min',
    whyAsked: 'Project ownership validation — Wipro panels probe resume Spring claims with architecture follow-ups.',
    evaluates: 'Architectural reasoning and specific technical trade-offs.',
    strategy: 'STAR: problem → layered design/DTO/@ControllerAdvice choice → measurable outcome.',
    expertAnswer: 'Example: built employee API with controller-service-repository layers, DTOs to hide entities, @ControllerAdvice for consistent error JSON, Bean Validation on inputs, and PostgreSQL indexes cutting list query latency 40%. Prepare which modules you personally owned and what you would refactor.',
    mistakes: 'Vague “best practices” without DTO, validation, or error-handling specifics.',
    followUps: ['What would you refactor?', 'How handle transactions?'],
    tip: 'Name one concrete design choice — DTO, advice, validation.',
    keywords: ['Spring Boot', 'DTO', 'REST', 'architecture'],
  },
  {
    question: 'A Java service is throwing OutOfMemoryError in production at peak traffic. What is your approach?',
    category: 'situational',
    difficulty: 'hard',
    answerTime: '3–4 min',
    whyAsked: 'Production debugging maturity — relevant for Wipro client maintenance and lateral Java hires.',
    evaluates: 'Structured OOM triage vs panic heap tuning.',
    strategy: 'Stabilize (heap dump, controlled restart) → analyze retained objects → fix root cause → validate under load.',
    expertAnswer: 'Immediate: capture heap dump (jmap or -XX:+HeapDumpOnOutOfMemoryError), consider controlled restart if SLA at risk. Analyze with Eclipse MAT or VisualVM — find largest retained set. Common causes: unbounded caches, session leaks, loading huge result sets. Fix root cause; do not only increase -Xmx without analysis.',
    mistakes: 'Only bumping -Xmx, ignoring GC logs and heap evidence.',
    followUps: ['Tools besides MAT?', 'Prevent recurrence?'],
    tip: 'Heap dump analysis before permanent -Xmx increases.',
    keywords: ['OutOfMemoryError', 'heap dump', 'MAT'],
  },
  {
    question: 'What is garbage collection in Java? Explain generational GC.',
    category: 'technical',
    difficulty: 'medium',
    answerTime: '3 min',
    whyAsked: 'JVM memory model connects to performance questions in Wipro Java panels.',
    evaluates: 'Generational hypothesis and GC impact awareness.',
    strategy: 'Explain automatic reclamation, young vs old gen, Eden → Survivor → Old Gen, G1GC as modern default.',
    expertAnswer: 'GC reclaims unreachable heap objects automatically. Generational GC exploits that most objects die young: Young Gen (Eden + Survivor) uses fast minor GC; long-lived objects promote to Old Gen for major GC. G1GC (Java 9+ default) uses regions for more predictable pauses than legacy collectors.',
    mistakes: 'Calling System.gc() as fix; unable to distinguish minor vs major GC.',
    followUps: ['What triggers Full GC?', 'Tune for low latency?'],
    tip: 'Walk Eden → Survivor → Old Gen flow aloud.',
    keywords: ['GC', 'Eden', 'G1GC', 'minor GC'],
  },
  {
    question: 'What is the difference between HashMap and HashTable in Java?',
    category: 'technical',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'Map implementation and thread-safety trade-offs — frequent collections follow-up at Wipro.',
    evaluates: 'Synchronization policy, null key rules, and modern concurrent alternatives.',
    strategy: 'Compare sync, null keys, performance; recommend ConcurrentHashMap for threads.',
    expertAnswer: 'HashMap is non-synchronized, allows one null key, faster for single-threaded use. HashTable is synchronized on every operation — thread-safe but slow, no null keys. Prefer ConcurrentHashMap for multithreaded access: fine-grained locking or CAS without full-table synchronization.',
    mistakes: 'Using HashTable “because thread-safe” without performance cost awareness.',
    followUps: ['HashMap collision handling?', 'Load factor?'],
    tip: 'ConcurrentHashMap over HashTable in modern code.',
    keywords: ['HashMap', 'HashTable', 'ConcurrentHashMap'],
  },
  {
    question: 'Java vs Python — for a high-throughput, low-latency backend service, which would you choose and why?',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2–3 min',
    whyAsked: 'Technology trade-off reasoning — Wipro HR and technical panels test judgment, not language loyalty.',
    evaluates: 'Workload-aware language selection.',
    strategy: 'Define CPU-bound vs I/O-bound workload, then match Java JVM/concurrency or Python async fit.',
    expertAnswer: 'For CPU-bound, high-throughput services: Java — JVM JIT optimization, mature concurrency, strong typing. Python GIL limits CPU parallelism in CPython; asyncio excels for I/O-bound APIs. Neither is universal — choose based on team skill, latency SLA, and ecosystem (Spring vs FastAPI).',
    mistakes: 'Declaring Java always wins or ignoring GIL/async distinctions.',
    followUps: ['When pick Python?', 'JVM benefit for long-running services?'],
    tip: 'Match language to workload type — CPU vs I/O bound.',
    keywords: ['JVM', 'GIL', 'latency', 'throughput'],
  },
  {
    question: 'Why do you want to join Wipro as a Java Developer?',
    category: 'hr',
    difficulty: 'easy',
    answerTime: '2 min',
    whyAsked: 'HR and combined rounds test motivation, relocation fit, and company research for Java track.',
    evaluates: 'Genuine interest and structured communication.',
    strategy: 'Wipro Java project exposure + ILP + your Spring stack fit + year-one skill goal.',
    expertAnswer: 'Anchor on Wipro’s enterprise Java delivery across industries, structured ILP training, opportunity to grow from Core Java to Spring Boot on client accounts, and alignment with my capstone REST API project. Confirm relocation flexibility and goal to deepen Spring/JPA skills in year one.',
    mistakes: 'Generic MNC praise without Java practice or ILP mention.',
    followUps: ['Willing to relocate?', 'Salary expectations?'],
    tip: 'Mention ILP and one Wipro digital engineering initiative.',
    keywords: ['why Wipro', 'Java Developer', 'ILP'],
  },
  {
    question: 'Walk me through the architecture of a REST API you built with Spring Boot.',
    category: 'behavioral',
    difficulty: 'medium',
    answerTime: '4 min',
    whyAsked: 'Wipro Java panels verify you can explain layered design — not only run tutorials.',
    evaluates: 'Controller-service-repository flow, DTO usage, persistence, and error handling.',
    strategy: 'Client → Controller → Service → Repository → DB; mention validation, DTOs, exception handler.',
    expertAnswer: 'Structure: REST controller exposes /api/resources, validates input with Bean Validation, service layer holds business rules and transactions, JPA repository talks to PostgreSQL. DTOs decouple API from entities. @ControllerAdvice maps exceptions to consistent JSON errors. Mention auth approach (JWT/session) if applicable.',
    mistakes: 'Skipping service layer or unable to explain why DTOs exist.',
    followUps: ['How handle pagination?', 'Transaction boundaries where?'],
    tip: 'Draw layers: Controller → Service → Repository → DB.',
    keywords: ['REST API', 'Spring Boot', 'layered architecture', 'JPA'],
  },
]

export function isWiproJavaDeveloperHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'wipro' && roleSlug === 'java-developer'
}
