export const INFOSYS_JAVA_HERO_PATH = '/blog/infosys-java-developer-hero.webp'
export const INFOSYS_JAVA_HERO_ALT =
  'Infosys Java Developer interview preparation guide — Core Java, Spring Boot, microservices, REST APIs, coding round strategy, and Infosys hiring process'
export const INFOSYS_JAVA_HERO_WIDTH = 1693
export const INFOSYS_JAVA_HERO_HEIGHT = 929
export const INFOSYS_JAVA_PROCESS_PATH = '/blog/infosys-java-developer-process-2026.webp'
export const INFOSYS_JAVA_PROCESS_ALT =
  'Infosys Java Developer interview process flow 2026: Application, InfyTQ, Coding Assessment, Technical Round, HR Round, and Offer'
export const INFOSYS_JAVA_PROCESS_WIDTH = 1672
export const INFOSYS_JAVA_PROCESS_HEIGHT = 941
export const INFOSYS_JAVA_EDITORIAL_NOTE =
  'Content reviewed and updated for current Infosys Java Developer hiring patterns — InfyTQ, HackWithInfy, JVM internals, Spring Boot layered architecture, microservices topology, hiring process diagram, and fresher placement expectations in India.'
export const INFOSYS_JAVA_READING_TIME = '28 min read'
export const INFOSYS_JAVA_PUBLISHED_DATE = '2026-05-28'
export const INFOSYS_JAVA_LAST_UPDATED = '2026-06-05'
export const INFOSYS_JAVA_REVIEWED_DATE = '2026-06-05'
export const INFOSYS_JAVA_AUTHOR_NAME = 'InterviewEra Team'
export const INFOSYS_JAVA_REVIEWER_NAME = 'InterviewEra Editorial'

export const INFOSYS_JAVA_TOC_SECTIONS = [
  { id: 'infosys-why-different', label: 'Why Infosys Java Interviews Are Different' },
  { id: 'infosys-hiring-process', label: 'Infosys Hiring Process' },
  { id: 'infosys-java-skills', label: 'Java Skills Infosys Evaluates' },
  { id: 'infosys-jvm-internals', label: 'JVM Internals' },
  { id: 'infosys-spring-boot', label: 'Spring Boot Questions' },
  { id: 'infosys-spring-architecture', label: 'Spring Boot Project Architecture' },
  { id: 'infosys-microservices', label: 'Microservices Questions' },
  { id: 'infosys-microservices-arch', label: 'Microservices Architecture' },
  { id: 'infosys-coding-strategy', label: 'Coding Round Strategy' },
  { id: 'infosys-resume-examples', label: 'Resume Examples' },
  { id: 'infosys-vs-tcs', label: 'Infosys vs TCS' },
  { id: 'infosys-roadmap', label: 'Preparation Roadmap' },
  { id: 'infosys-questions', label: 'Interview Questions' },
  { id: 'infosys-faq', label: 'FAQs' },
] as const

export const INFOSYS_PROCESS_FLOW_STEPS = [
  'Application',
  'InfyTQ',
  'Coding Assessment',
  'Technical Round',
  'HR Round',
  'Offer',
] as const

export const INFOSYS_HIRING_STEPS = [
  {
    step: 'Step 1 — Resume screening',
    body: 'Recruiters scan for Java project depth, CGPA thresholds, and relevant internships. Highlight Spring Boot APIs, database work, and measurable outcomes — not generic “worked on Java project” bullets.',
  },
  {
    step: 'Step 2 — InfyTQ / HackWithInfy',
    body: 'InfyTQ is Infosys’s certification and shortlist platform for campus hires. Scoring 65%+ can fast-track System Engineer offers; HackWithInfy top performers may qualify for the Power Programmer track (₹8–9 LPA). Both test aptitude, reasoning, and coding fundamentals.',
  },
  {
    step: 'Step 3 — Technical interview',
    body: 'One or two technical rounds covering Core Java, collections, OOP, Spring Boot basics, REST APIs, SQL, and coding problems (arrays, strings, linked lists). Panels expect clear explanations — not memorized definitions alone.',
  },
  {
    step: 'Step 4 — HR round',
    body: 'Communication, relocation flexibility, salary expectations, and “why Infosys.” Research Springboard, Cobalt cloud practice, and ESG initiatives to show genuine company awareness.',
  },
  {
    step: 'Step 5 — Offer',
    body: 'Standard System Engineer (₹3.6–4.5 LPA) or SP/Power Programmer tracks for top performers. Offer letter includes training period details and joining location (Bengaluru, Mysuru, Hyderabad, Pune, Chennai).',
  },
] as const

export const INFOSYS_JAVA_SKILL_CARDS = [
  {
    title: 'Core Java',
    evaluates: 'Language fundamentals — data types, control flow, access modifiers, and whether you can explain code you wrote in projects.',
    mistakes: 'Confusing pass-by-value with reference semantics, or unable to trace simple program output.',
    tips: 'Revise String immutability, `==` vs `.equals()`, and write small programs that demonstrate each concept aloud.',
  },
  {
    title: 'Collections',
    evaluates: 'Choosing the right structure (ArrayList vs HashMap vs HashSet), complexity awareness, and iterator behaviour.',
    mistakes: 'Using LinkedList for random access, modifying collections during iteration, or ignoring `ConcurrentHashMap` in threaded contexts.',
    tips: 'Memorize time complexity for add/get/remove on ArrayList, HashMap, and TreeMap. Practice two HashMap patterns (frequency count, two-sum).',
  },
  {
    title: 'OOP',
    evaluates: 'Inheritance, polymorphism, encapsulation, abstraction — with real project examples, not textbook-only answers.',
    mistakes: 'Mixing up abstract class vs interface use cases, or shallow “OOP is inheritance” answers without design rationale.',
    tips: 'Prepare one example each for inheritance (IS-A) and interface (CAN-DO). Know SOLID at one-line depth.',
  },
  {
    title: 'Exception Handling',
    evaluates: 'Checked vs unchecked hierarchy, try-catch-finally flow, and when to create custom exceptions in services.',
    mistakes: 'Catching `Exception` broadly, swallowing errors without logging, or confusing Error with Exception.',
    tips: 'Walk through Throwable hierarchy on paper. Explain a real bug you fixed with proper exception handling.',
  },
  {
    title: 'Multithreading',
    evaluates: 'Thread lifecycle, `synchronized` vs `volatile`, and awareness of concurrency utilities at fresher level.',
    mistakes: 'Claiming `volatile` makes operations atomic, or ignoring race conditions in shared counters.',
    tips: 'Explain producer-consumer or thread-safe singleton. Know when to use `ExecutorService` over raw `Thread`.',
  },
  {
    title: 'JVM',
    evaluates: 'Class loading basics, heap vs stack, and how the JVM executes bytecode — enough to discuss production issues.',
    mistakes: 'Treating JVM as a black box with no awareness of heap sizing or classloader leaks.',
    tips: 'Review JVM memory areas and common JVM flags (`-Xms`, `-Xmx`). Connect to OutOfMemoryError debugging.',
  },
  {
    title: 'Garbage Collection',
    evaluates: 'Generational GC model, minor vs major GC, and why most objects die young — relevant for performance questions.',
    mistakes: 'Calling `System.gc()` as a fix, or confusing GC with manual memory management from C++.',
    tips: 'Explain Eden → Survivor → Old Gen flow. Know G1GC as default in modern Java and when tuning matters.',
  },
] as const

export const INFOSYS_JVM_INTERNALS_CARDS = [
  {
    title: 'Heap',
    detail: 'Stores object instances and arrays at runtime. Divided into Young Gen (Eden + Survivor) and Old Gen. OutOfMemoryError on heap usually means leaks or undersized `-Xmx`.',
  },
  {
    title: 'Stack',
    detail: 'Per-thread memory for method frames, local primitives, and references. StackOverflowError from deep recursion; each thread has its own stack — not shared like heap.',
  },
  {
    title: 'Metaspace',
    detail: 'Holds class metadata (replaced PermGen in Java 8+). Grows with loaded classes; classloader leaks can exhaust metaspace in long-running Spring apps.',
  },
  {
    title: 'Class Loader',
    detail: 'Loads `.class` bytecode into JVM — Bootstrap → Extension → Application loaders. Interviewers probe parent-delegation model and why duplicate class loading causes `LinkageError`.',
  },
  {
    title: 'Garbage Collection',
    detail: 'Reclaims unreachable heap objects. Minor GC in Young Gen is frequent and fast; major GC in Old Gen is costlier. G1GC is default in modern Java for predictable pauses.',
  },
  {
    title: 'JIT Compiler',
    detail: 'HotSpot compiles hot bytecode to native machine code after profiling. Explains why Java can match C++ on long-running services — cold start differs from steady-state throughput.',
  },
] as const

export const INFOSYS_SPRING_ARCHITECTURE_LAYERS = [
  'Client',
  'Controller',
  'Service',
  'Repository',
  'Database',
] as const

export const INFOSYS_SPRING_ARCHITECTURE_PATTERNS = [
  {
    title: 'Dependency Injection',
    detail: 'Spring IoC container injects `@Service` and `@Repository` beans into `@RestController` via constructor injection — loose coupling and testability without `new` in controllers.',
  },
  {
    title: 'DTO Pattern',
    detail: 'Separate request/response DTOs from JPA entities so API contracts stay stable and you never expose persistence fields or lazy-loading proxies to clients.',
  },
  {
    title: 'Validation',
    detail: '`@Valid` on controller parameters triggers Bean Validation (`@NotNull`, `@Size`). Invalid input returns 400 with field-level errors before service layer executes.',
  },
  {
    title: 'Exception Handling',
    detail: '`@ControllerAdvice` maps exceptions to consistent HTTP responses — `ResourceNotFoundException` → 404, validation errors → 400, unhandled → 500 with safe message body.',
  },
] as const

export const INFOSYS_MICROSERVICES_ARCH_SERVICES = [
  'API Gateway',
  'Auth Service',
  'User Service',
  'Order Service',
  'Notification Service',
  'Database',
] as const

export const INFOSYS_MICROSERVICES_ARCH_EXPLAINS = [
  {
    title: 'Service communication',
    detail: 'Services talk over REST or async messaging (Kafka/RabbitMQ). API Gateway routes external requests; internal calls use service discovery — not hard-coded hostnames.',
  },
  {
    title: 'Scalability',
    detail: 'Scale stateless services (Auth, User, Order) horizontally behind load balancers. Database becomes the bottleneck — use read replicas, caching, and partition-aware schemas.',
  },
  {
    title: 'Fault isolation',
    detail: 'A failure in Notification Service must not crash Order Service. Circuit breakers, timeouts, retries with backoff, and async queues contain blast radius.',
  },
] as const

export const INFOSYS_SPRING_BOOT_TOPICS = [
  {
    title: 'Auto Configuration',
    detail: '@SpringBootApplication enables @EnableAutoConfiguration. Conditional beans load via @ConditionalOnClass — explain how starters reduce XML boilerplate.',
  },
  {
    title: 'Dependency Injection',
    detail: 'Constructor injection preferred over field injection. Know @Component, @Service, @Repository scopes and how the IoC container wires beans.',
  },
  {
    title: 'REST APIs',
    detail: '@RestController, @GetMapping/@PostMapping, request/response DTOs, HTTP status codes, and idempotency of GET vs POST.',
  },
  {
    title: 'Spring Security',
    detail: 'Authentication vs authorization, basic filter chain concept, and securing endpoints with roles — even at introductory depth.',
  },
  {
    title: 'JPA',
    detail: 'Entity mapping, @OneToMany/@ManyToOne relationships, lazy vs eager loading, and N+1 query problem awareness.',
  },
  {
    title: 'Validation',
    detail: '@Valid, @NotNull/@Size constraints, @ControllerAdvice for global exception handling, and returning structured error responses.',
  },
] as const

export const INFOSYS_MICROSERVICES_TOPICS = [
  {
    title: 'Service Discovery',
    detail: 'How services register and find each other (Eureka, Consul). Why hard-coded URLs do not scale in microservice deployments.',
  },
  {
    title: 'API Gateway',
    detail: 'Single entry point for routing, auth, rate limiting, and request aggregation — reduces client coupling to internal services.',
  },
  {
    title: 'Fault Tolerance',
    detail: 'Circuit breakers, retries with backoff, and graceful degradation when downstream services fail — resilience4j patterns.',
  },
  {
    title: 'Distributed Systems',
    detail: 'CAP trade-offs, eventual consistency, idempotent APIs, and distributed tracing basics for debugging cross-service flows.',
  },
  {
    title: 'Scalability',
    detail: 'Horizontal scaling, stateless services, caching layers, and database read replicas — tie answers to Java/Spring Boot context.',
  },
] as const

export const INFOSYS_CODING_TOPICS = [
  {
    topic: 'Arrays',
    difficulty: 'Easy–Medium',
    timeManagement: 'Spend 2–3 minutes clarifying constraints and edge cases before coding. Aim to finish easy array problems in 10–12 minutes.',
    mistakes: 'Off-by-one indices, not handling empty or single-element arrays, skipping complexity statement.',
  },
  {
    topic: 'Strings',
    difficulty: 'Easy–Medium',
    timeManagement: 'Use StringBuilder for concatenation in loops. Budget 15 minutes for medium string problems including one test walkthrough.',
    mistakes: 'O(n²) substring checks, ignoring case sensitivity, not asking about character set constraints.',
  },
  {
    topic: 'HashMap',
    difficulty: 'Medium',
    timeManagement: 'HashMap patterns (frequency, complement lookup) often solve problems in O(n). State key/value choice aloud before coding.',
    mistakes: 'Hash collision confusion, wrong key type, forgetting to handle duplicate keys in grouping problems.',
  },
  {
    topic: 'LinkedList',
    difficulty: 'Medium',
    timeManagement: 'Practice reverse, merge, and cycle detection until pointer moves are muscle memory — 15–18 minutes for medium problems.',
    mistakes: 'Losing head reference, infinite loops in cycle detection, not using dummy head node.',
  },
  {
    topic: 'Trees',
    difficulty: 'Medium',
    timeManagement: 'Know BFS/DFS templates. For fresher Infosys loops, focus on BST validation, height, and level-order — not advanced DP on trees.',
    mistakes: 'Missing null base cases, confusing traversal orders, stack overflow on deep recursion without mentioning iterative alternative.',
  },
] as const

export const INFOSYS_RESUME_EXAMPLES = [
  {
    title: 'Performance',
    bad: '“Improved API response time for the backend.”',
    good: '“Reduced Spring Boot REST endpoint p95 latency from 420ms to 180ms by adding Redis caching and fixing N+1 JPA queries — 35% fewer DB calls per request.”',
  },
  {
    title: 'Scalability',
    bad: '“Built a scalable microservices application.”',
    good: '“Designed 3 Spring Boot services behind an API gateway handling 2k req/min with stateless JWT auth and HikariCP pool tuning for 50 concurrent DB connections.”',
  },
  {
    title: 'Measurable impact',
    bad: '“Worked on Java project for college assignment.”',
    good: '“Delivered inventory management module serving 120+ daily users — cut manual stock reconciliation time 40% with automated low-stock alerts and audit logs.”',
  },
] as const

export const INFOSYS_VS_TCS_ROWS = [
  ['Coding Difficulty', 'Medium — InfyTQ + 1–2 coding problems', 'Medium — NQT aptitude + moderate coding'],
  ['Java Depth', 'Core Java + Spring Boot basics expected', 'Core Java + SQL; Spring Boot varies by project'],
  ['Spring Boot Focus', 'Common in technical rounds for Java roles', 'Less consistent — project-dependent'],
  ['Communication Round', 'Dedicated HR round — relocation and fit', 'Combined tech + HR or separate HR'],
  ['Hiring Process', 'InfyTQ / HackWithInfy → Tech → HR', 'NQT → Technical → HR/MR'],
] as const

export const INFOSYS_PREP_RESOURCE_LINKS = [
  { href: '/interview-questions/java-developer', label: 'Java Interview Questions' },
  { href: '/interview-questions/topics/spring-boot', label: 'Spring Boot Interview Questions' },
  { href: '/interview-questions/software-engineer', label: 'Microservices Interview Questions' },
  { href: '/interview-questions/software-engineer', label: 'Software Engineer Interview Questions' },
  { href: '/interview-questions/companies/tcs/java-developer', label: 'TCS Java Developer Questions' },
  { href: '/interview-questions/companies/wipro/java-developer', label: 'Wipro Java Developer Questions' },
  { href: '/interview-questions/topics/system-design', label: 'System Design Questions' },
  { href: '/interview-questions/topics/rest-api', label: 'REST API Interview Questions' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Interview Questions' },
] as const

export const INFOSYS_ROADMAP_WEEKS = [
  {
    week: 'Week 1',
    focus: 'Core Java',
    items: ['Revise OOP, String, exceptions, and JVM basics', 'Write 5 small programs explaining output aloud', 'Practice 10 easy InfyTQ-style MCQs daily'],
  },
  {
    week: 'Week 2',
    focus: 'Collections + OOP',
    items: ['ArrayList, HashMap, HashSet patterns', 'SOLID one-liners with Java examples', '20 medium coding problems (arrays, strings)'],
  },
  {
    week: 'Week 3',
    focus: 'Spring Boot + APIs',
    items: ['Build one REST CRUD project with JPA', 'Review DI, validation, and @ControllerAdvice', 'Practice REST/HTTP and SQL join questions'],
  },
  {
    week: 'Week 4',
    focus: 'Mock Interviews',
    items: ['Full Infosys-style mocks (tech + HR)', 'HR stories: why Infosys, weakness, relocation', 'Review expanded questions below with follow-ups'],
  },
] as const

export const INFOSYS_FAQ_ITEMS = [
  {
    question: 'What is InfyTQ and is it mandatory for Infosys campus hiring?',
    answer:
      'InfyTQ is Infosys’s free learning and certification platform for engineering students. Scoring 65%+ can shortlist you for System Engineer roles and unlock higher tracks. Many campus drives use InfyTQ as the first filter — treat it as mandatory prep even when registration is optional.',
  },
  {
    question: 'What is HackWithInfy and how is it different from InfyTQ?',
    answer:
      'HackWithInfy is a national competitive coding contest. Top performers may receive Power Programmer offers (₹8–9 LPA) with harder DSA expectations. InfyTQ is broader certification + aptitude; HackWithInfy targets elite coders with contest-style problems.',
  },
  {
    question: 'How many rounds are in Infosys Java Developer interviews?',
    answer:
      'Typically three stages after application: InfyTQ or online assessment, one or two technical rounds (Java + coding), and an HR round. HackWithInfy winners may skip some stages but still face verification interviews.',
  },
  {
    question: 'Is Spring Boot required for Infosys Java interviews?',
    answer:
      'Strongly recommended. Most Java Developer panels expect REST API basics, dependency injection, and JPA awareness even for freshers. A small Spring Boot project on your resume significantly improves technical round depth.',
  },
  {
    question: 'What Java topics are most asked at Infosys?',
    answer:
      'Core Java (OOP, collections, exceptions), multithreading basics, JVM/GC overview, Spring Boot fundamentals, SQL joins, and coding problems on arrays, strings, HashMap, linked lists, and trees.',
  },
  {
    question: 'How difficult is the Infosys coding round?',
    answer:
      'Moderate for mass-hiring fresher roles — usually 1–2 problems at easy-to-medium difficulty (not FAANG hard). Time management and clean explanation matter as much as optimal solutions.',
  },
  {
    question: 'Does Infosys ask microservices questions to freshers?',
    answer:
      'At introductory depth — service discovery, API gateway purpose, and REST vs microservice trade-offs. Deep distributed systems design is uncommon at entry level but shows strong initiative if you have project experience.',
  },
  {
    question: 'What CGPA cutoff does Infosys use?',
    answer:
      'Cutoffs vary by college tier and year — commonly 6.5–7.5 for campus drives. HackWithInfy and strong InfyTQ scores can offset borderline CGPA in some cases.',
  },
  {
    question: 'How should I answer “Why Infosys” in the HR round?',
    answer:
      'Combine training quality (Springboard), global client exposure, digital/cloud practice (Cobalt), and personal fit — relocation flexibility and learning goals. Avoid generic “brand name” answers without specifics.',
  },
  {
    question: 'Infosys vs TCS — which Java interview is harder?',
    answer:
      'Similar overall difficulty for fresher Java roles. Infosys often emphasizes InfyTQ certification and Spring Boot project depth; TCS routes through NQT with strong aptitude weight. Compare both processes before committing to one study plan.',
  },
  {
    question: 'How long does the Infosys offer process take after interviews?',
    answer:
      'Typically 2–6 weeks from final HR round to offer letter, depending on batch scheduling and background verification. Multiple colleges may share staggered joining dates.',
  },
  {
    question: 'Can I prepare for Infosys and TCS Java interviews together?',
    answer:
      'Yes — Core Java, collections, OOP, and DSA fundamentals overlap heavily. Add company-specific mocks: InfyTQ/HackWithInfy patterns for Infosys and NQT aptitude for TCS in the final week.',
  },
] as const

/**
 * Audit status (2026-06-05):
 * PRODUCTION READY — JVM internals, Spring Boot layered architecture, microservices topology, hero + process assets, E-E-A-T aside.
 * SEO READY — canonical, index/follow, Article/FAQPage/BreadcrumbList/ItemList/@graph JSON-LD, 21+ contextual internal links.
 * INDEXING READY — isIntersectionIndexable(infosys, java-developer); sitemap + IndexNow eligible.
 */
