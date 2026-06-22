import type { SeoQuestion } from './types'

type InsightExtension = Pick<
  SeoQuestion,
  'expertAnswer' | 'whyAsked' | 'evaluates' | 'strategy' | 'mistakes' | 'followUps'
>

const INSIGHT_EXTENSIONS: Record<string, InsightExtension> = {
  "What is the difference between a stack and a queue? Where would you use each?": {
    expertAnswer:
      'A stack follows LIFO, so the last item pushed is the first removed. A queue follows FIFO, so the first item added is the first removed. I use stacks for undo/redo, recursion, and browser back navigation. I use queues for job scheduling, print spooling, and request buffering in APIs. In interviews, I also mention operation costs: push/pop are O(1) for stack, and enqueue/dequeue are O(1) for queue implementations using linked lists or circular arrays.',
    evaluates:
      'Core data-structure fundamentals and your ability to map theory to practical engineering use cases.',
    strategy:
      'Define LIFO vs FIFO first, then attach one real production scenario for each structure and mention O(1) operations.',
    mistakes:
      'Mixing up ordering semantics, giving only textbook definitions, or skipping where each structure is actually used.',
    followUps: ['How would you implement both using arrays?', 'When would you choose deque over queue?'],
  },
  "What is the time complexity of binary search and what is its prerequisite?": {
    expertAnswer:
      'Binary search runs in O(log n) time because every comparison removes half of the search space. The mandatory prerequisite is that data must be sorted in the same order you search against. Space is O(1) for iterative implementation and O(log n) for recursive due to call stack. In campus interviews, I also clarify edge cases: duplicate values, not-found result handling, and overflow-safe midpoint calculation using left + (right - left) / 2.',
    evaluates:
      'Algorithmic complexity clarity and whether you understand binary search preconditions and implementation details.',
    strategy:
      'State O(log n) immediately, mention sorted input requirement, then explain halve-the-range logic with one example.',
    mistakes:
      'Forgetting sorted prerequisite, wrong midpoint arithmetic, or not discussing boundary conditions for duplicates.',
    followUps: ['How do you find first occurrence in duplicates?', 'What changes for rotated sorted arrays?'],
  },
  "Explain the four pillars of Object-Oriented Programming with one example each.": {
    expertAnswer:
      'The four pillars are encapsulation, inheritance, polymorphism, and abstraction. Encapsulation means keeping data private and exposing controlled methods, like a BankAccount class with deposit/withdraw methods. Inheritance lets a SavingsAccount reuse BankAccount behavior. Polymorphism means calling the same method on different classes, like processPayment() for UPI and Card. Abstraction hides complexity behind interfaces, like a PaymentGateway interface exposing pay() while each provider handles its own implementation details.',
    evaluates:
      'Foundational OOP understanding and your ability to connect concepts with concrete coding examples.',
    strategy:
      'Name each pillar in order and provide one short production-style class example rather than abstract analogies only.',
    mistakes:
      'Confusing abstraction with encapsulation, or listing pillars without explaining why each matters in design.',
    followUps: ['Can you show method overriding vs overloading?', 'When is composition better than inheritance?'],
  },
  "What is a deadlock? State the four conditions required for it to occur.": {
    expertAnswer:
      'A deadlock is a state where two or more threads wait forever because each holds a resource the other needs. The four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait. If all four exist together, deadlock is possible. In production Java services, I reduce risk by enforcing lock ordering, minimizing nested locks, and using timed lock acquisition so stuck threads fail fast and trigger alerts instead of hanging indefinitely.',
    evaluates:
      'Concurrency fundamentals and whether you can reason about deadlock causes and practical prevention.',
    strategy:
      'Define deadlock first, list all four conditions correctly, then add one prevention tactic like lock ordering.',
    mistakes:
      'Missing one Coffman condition, treating deadlock as slowdown only, or giving no prevention approach.',
    followUps: ['How do you detect deadlocks in Java?', 'What is livelock and how is it different?'],
  },
  "What is the difference between TCP and UDP? When would you choose each?": {
    expertAnswer:
      'TCP is connection-oriented, reliable, and ordered: packets are acknowledged, retransmitted if needed, and delivered in sequence. UDP is connectionless, lower-overhead, and does not guarantee delivery or order. I choose TCP for APIs, payments, and file transfer where correctness matters. I choose UDP for real-time use cases like live voice, gaming updates, or telemetry where occasional packet loss is acceptable but low latency is critical. In interviews, I also mention handshake overhead and congestion control differences.',
    evaluates:
      'Networking trade-off judgment between reliability, ordering, and latency for real systems.',
    strategy:
      'Compare reliability and ordering first, then map each protocol to one latency-sensitive and one correctness-sensitive scenario.',
    mistakes:
      'Saying UDP is always faster without caveats, or failing to justify protocol choice by workload needs.',
    followUps: ['Why does HTTP/3 use QUIC over UDP?', 'What is TCP three-way handshake?'],
  },
  "Describe the difference between process and thread. What are the pros and cons of multithreading?": {
    expertAnswer:
      'A process is an isolated execution unit with its own memory space, while threads are lighter units inside a process that share the same memory. Multithreading improves responsiveness and throughput for I/O-heavy workloads because tasks can run concurrently with lower context-switch overhead than processes. The trade-offs are race conditions, deadlocks, and harder debugging due to shared state. In backend services, I combine thread pools, immutable data where possible, and synchronization primitives to keep concurrency safe and predictable.',
    evaluates:
      'OS and concurrency fundamentals plus awareness of practical engineering trade-offs in multithreaded code.',
    strategy:
      'Start with memory model difference, then present one benefit and one risk of multithreading with mitigation.',
    mistakes:
      'Claiming threads are always better, or ignoring synchronization and shared-state failure modes.',
    followUps: ['When do you prefer multiprocessing?', 'How does context switching differ for process vs thread?'],
  },
  "Tell me about a time you had to meet a tight deadline. How did you prioritise?": {
    expertAnswer:
      'In my final-year placement project, we had three days to demo a recruiter dashboard after API scope changed late. I split features into must-have versus nice-to-have, aligned with the mentor on a thin vertical slice, and assigned owners for API, UI, and testing. We shipped login, candidate list, and status updates first, and deferred analytics charts. I sent progress updates every few hours and flagged blockers early. We demoed on time with zero critical bugs and added deferred items in the next sprint.',
    evaluates:
      'Execution discipline, prioritization under pressure, and communication maturity during constrained delivery.',
    strategy:
      'Use STAR with clear constraints, your prioritization framework, stakeholder communication, and measurable result.',
    mistakes:
      'Giving vague team stories, skipping trade-offs, or not showing what you intentionally deprioritized.',
    followUps: ['What did you cut first and why?', 'What would you improve in that execution plan today?'],
  },
  "Describe a situation where you had to learn a new technology quickly.": {
    expertAnswer:
      'During internship onboarding, I had to deliver a feature in Next.js even though I had mostly used plain React. I spent the first day reading official docs and building a small sandbox for App Router patterns, then paired with a senior for code-review feedback. By day three, I shipped a production-ready page with server-side data fetching and form validation. I documented what I learned for the next intern. The key was structured learning, fast experimentation, and immediate application to a real task.',
    evaluates:
      'Learning agility, self-directed execution, and ability to convert learning into deliverable output quickly.',
    strategy:
      'Share your learning loop: docs, proof-of-concept, mentorship feedback, then production implementation with timeline.',
    mistakes:
      'Saying you are a fast learner without concrete actions, outcomes, or evidence of applied understanding.',
    followUps: ['How did you validate your understanding quickly?', 'What would you do if no mentor was available?'],
  },
  "Why do you want to work at [Company]? What do you know about us?": {
    expertAnswer:
      'I want to work here because your product solves a meaningful user problem at scale, and the engineering challenges match my strengths in backend and system reliability. I studied your recent launches, India hiring focus, and engineering blogs on performance and developer productivity. I am especially excited by the ownership culture and opportunity to ship measurable impact early. My goal is to contribute to customer-facing features while growing under strong review standards and mentorship in a high-quality engineering environment.',
    evaluates:
      'Preparation quality, motivation authenticity, and role-company fit beyond generic enthusiasm.',
    strategy:
      'Anchor answer in three points: product mission, engineering challenge match, and why your background fits this team now.',
    mistakes:
      'Generic praise, incorrect company facts, or focusing only on salary and brand value.',
    followUps: ['Which recent product launch impressed you most?', 'How does this role align with your two-year goals?'],
  },
  "If you discovered a critical bug in production right before a major release, what would you do?": {
    expertAnswer:
      'I would first assess severity and user impact, then immediately notify the release owner and relevant stakeholders. If the bug risks data integrity, payment flow, or security, I would block release and trigger rollback or a controlled hotfix path. I would assign owners for triage, fix, verification, and communication, while keeping an incident log. After stabilization, I would run root-cause analysis and add safeguards like regression tests, monitoring alerts, and release checklist updates so the same class of failure is less likely to recur.',
    evaluates:
      'Incident judgment, communication under pressure, and production-risk management maturity.',
    strategy:
      'Walk through sequence: impact assessment, escalation, release decision, mitigation, validation, and post-incident prevention.',
    mistakes:
      'Acting alone without communication, prioritizing launch date over user risk, or skipping postmortem actions.',
    followUps: ['When do you choose rollback over hotfix?', 'What would your postmortem include?'],
  },

  "What are Amazon Leadership Principles and how many are there?": {
    expertAnswer:
      "Amazon has 16 Leadership Principles, and they are not just HR posters—they are used as interview score dimensions. I prepare by grouping them into themes like customer focus, ownership, execution, and trust, then mapping STAR stories to each. Instead of memorizing definitions, I practice explaining trade-offs and measurable outcomes tied to a principle. For India SDE candidates, this matters because behavioral depth can outweigh a marginal coding difference in final hiring decisions, especially in Bar Raiser conversations.",
  },
  "Tell me about a time you demonstrated Customer Obsession.": {
    expertAnswer:
      'I worked on a support ticket dashboard where agents struggled with slow filtering during peak hours. Rather than shipping minor UI tweaks, I traced real user pain, optimized backend query paths, and introduced cached filter presets. Response time dropped from around 1.8s to 600ms, and ticket handling throughput improved in internal metrics. I also documented edge-case behavior with support teams to avoid regressions. The key signal was choosing customer pain reduction over lower-effort internal tasks and validating impact with data.',
  },
  "What is the Bar Raiser role in Amazon's interview process?": {
    expertAnswer:
      'A Bar Raiser is an independent interviewer trained to protect hiring quality across teams. They are not just another panelist; they evaluate long-term fit, leadership signals, and whether the candidate raises the talent bar. In preparation, I treat this round as deep follow-up territory: decisions, trade-offs, ownership under ambiguity, and lessons from failure. Even with strong coding rounds, weak judgment or shallow behavioral evidence can fail this stage, so I prepare structured STAR stories with metrics and concrete personal actions.',
  },
  "Given a sorted array with duplicates, find the first and last position of a target element.": {
    expertAnswer:
      'I solve this with two binary searches. The first search finds the left boundary by moving right pointer leftward even when target matches. The second finds the right boundary by moving left pointer rightward on matches. This keeps both operations O(log n). I handle edge cases early: empty array, target absent, and all values equal. In interviews, I explain invariants before coding and run one dry example with duplicates to prove no off-by-one mistakes at boundaries.',
  },
  "Design Amazon's order management system at scale.": {
    expertAnswer:
      'I begin with requirements: order placement, payment, inventory reservation, shipment updates, and failure recovery. I model order lifecycle as a state machine and split services by domain boundaries. For asynchronous steps, I use queues and event-driven workflows with idempotent consumers. I add compensation logic for partial failures, like payment success but inventory timeout. Storage combines transactional systems for orders and key-value/cache for quick reads. Finally, I define observability: order success rate, stuck-state alerts, DLQ monitoring, and latency SLOs.',
  },
  "Tell me about a time you had to make a decision with incomplete data.": {
    expertAnswer:
      'In a release week, we saw rising timeout errors but lacked full root-cause certainty before a campaign. I framed options with risk: proceed unchanged, delay full release, or enable a guarded rollout. I chose a phased rollout with aggressive monitoring and fallback toggles, then coordinated on-call coverage. Error rates stabilized and customer impact stayed minimal. Post-release, we identified an upstream dependency issue and hardened retries. The decision balanced speed and safety, with explicit assumptions and a reversible path.',
  },
  "What is Amazon DynamoDB and when would you choose it over RDS?": {
    expertAnswer:
      'DynamoDB is a fully managed NoSQL service optimized for high-scale key-value access with predictable low latency. I choose it when access patterns are known upfront, throughput spikes are expected, and schema flexibility helps—like carts, sessions, or event counters. I prefer RDS when relational joins, richer SQL queries, and strict multi-table transactional workflows are central. In interviews, I compare by access pattern, consistency needs, operational overhead, and cost behavior rather than saying one database is universally superior.',
  },
  "Write code to find all permutations of a string.": {
    expertAnswer:
      'I use backtracking: pick one character, recurse on remaining characters, then undo the choice to explore the next branch. This naturally explores all permutations with O(n × n!) time. For duplicate characters, I sort input and skip repeated choices at the same recursion level to avoid duplicate outputs. I explain state clearly—current path, used markers, base condition—and mention memory trade-offs. In interviews, clean recursion plus explicit complexity discussion scores better than rushed code without reasoning.',
  },
  "Tell me about a time you failed and what you learned from it.": {
    expertAnswer:
      'I once merged an optimization without adding realistic load tests, and under traffic it caused queue backlogs and delayed notifications. I owned the rollback, communicated impact quickly, and worked with QA to recreate production-like load scenarios. We fixed the bottleneck and added pre-release performance gates in CI. Personally, I now treat performance assumptions as hypotheses that need measurement. The lesson was not just technical; it was about accountability, transparent communication, and building safeguards so others do not repeat my mistake.',
  },
  "Implement a function to detect a cycle in a linked list.": {
    expertAnswer:
      "I use Floyd's tortoise-and-hare approach: move slow pointer one step and fast pointer two steps. If they ever meet, a cycle exists; if fast hits null, there is no cycle. This runs in O(n) time and O(1) space, which is better than using a hash set for visited nodes. I also handle empty and single-node lists safely. For follow-up, I can find cycle start by resetting one pointer to head and moving both one step until they meet again.",
  },

  "What is the Microsoft interview process and how is the hiring manager loop structured?": {
    expertAnswer:
      'Microsoft loops usually start with an online assessment, followed by multiple coding rounds, and end with a hiring manager or as-appropriate round. The final round is not a formality; it tests judgment, collaboration style, and growth mindset in addition to technical clarity. I prepare round-wise: timed DSA practice for OA, whiteboard narration for coding rounds, and structured impact stories for manager conversations. In India hiring, clear communication and learning mindset often differentiate similar coding performances.',
  },
  "Implement a LRU (Least Recently Used) cache with O(1) get and put operations.": {
    expertAnswer:
      'I implement LRU using a HashMap and a doubly linked list. The map gives O(1) node lookup by key, while the list maintains recency order with most recent at head and least recent at tail. On get, I move the node to head. On put, I update and move existing nodes, or insert a new node and evict tail if capacity exceeds limit. I keep helper methods for add/remove/move to avoid pointer bugs and then verify O(1) complexity.',
  },
  "What is Microsoft's growth mindset culture and why does it matter in interviews?": {
    expertAnswer:
      "Microsoft's growth mindset emphasizes learning over ego: acknowledge gaps, reason transparently, and adapt from feedback. In interviews, this shows up in how you handle unknowns, not just correct answers. If stuck, I state assumptions, explore alternatives, and course-correct based on hints. I also use examples where I improved after failure or mentorship. For product teams in India, this matters because long-term collaboration and learning velocity are critical in evolving stacks, customer requirements, and cross-team execution.",
  },
  "Given a string, find the longest substring without repeating characters.": {
    expertAnswer:
      'I use a sliding window with a map of last seen indices. As I expand the right pointer, if the current character already exists inside the active window, I move left pointer to max(left, lastIndex + 1). I update maximum length each step. This gives O(n) time and O(min(n, charset)) space. I validate edge cases such as empty string, all same characters, and Unicode handling assumptions. Narrating window invariants helps avoid off-by-one errors.',
  },
  "Explain the SOLID principles of object-oriented design.": {
    expertAnswer:
      'SOLID includes Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, and Dependency Inversion. I explain each with one practical refactor: splitting overloaded service classes, extending behavior via strategies, ensuring subclass contract compatibility, avoiding fat interfaces, and injecting abstractions for better testability. In Microsoft-style design discussions, I avoid pure theory by mapping principles to maintainability outcomes like easier unit tests, safer feature extensions, and fewer regression risks in large codebases.',
  },
  "How does Azure Kubernetes Service (AKS) differ from running Kubernetes manually?": {
    expertAnswer:
      'AKS is managed Kubernetes where Azure operates the control plane and handles much of the operational overhead, including upgrades and integrations like identity and monitoring. In self-managed Kubernetes, teams own full control plane setup, HA, patching, and recovery, which requires deeper SRE capacity. I choose AKS when delivery speed and reliability are priorities for product teams. I consider self-managed only when strict customization, regulatory constraints, or platform-specific requirements justify the additional operational cost.',
  },
  "Write code to merge two sorted linked lists into one sorted list.": {
    expertAnswer:
      'I prefer an iterative solution with a dummy head and a tail pointer. At each step, I compare current nodes from both lists, append the smaller one to tail, and move that list forward. After one list finishes, I attach the remaining nodes from the other list. This runs in O(m+n) time and O(1) extra space. I mention recursive variant too, but iterative is usually safer for long lists because recursion can hit stack limits.',
  },
  "What is the difference between Azure Blob Storage, Azure Files, and Azure Disk Storage?": {
    expertAnswer:
      'Blob Storage is object storage for unstructured data accessed via REST, ideal for media, logs, and backups. Azure Files provides managed SMB/NFS file shares mountable across VMs or containers, useful for shared file-system semantics. Azure Disk is block storage attached to VMs for OS and database workloads requiring low-latency persistent volumes. In interviews, I map service choice to access pattern and workload behavior instead of memorizing product descriptions.',
  },
  "Describe a complex technical problem you solved and walk through your debugging process.": {
    expertAnswer:
      'I debugged an intermittent checkout failure where logs were noisy and non-deterministic. I first built a reproducible test harness, added correlation IDs, and narrowed failure scope by isolating external dependency calls. After eliminating UI and network layers, traces showed timeout and retry collisions in payment idempotency handling. I fixed retry sequencing, added circuit-breaker thresholds, and wrote regression tests for failure modes. Error rate dropped significantly, and we kept new dashboards to catch similar patterns earlier.',
  },
  "Given a 2D matrix, write code to search for a target value where rows and columns are sorted.": {
    expertAnswer:
      'I start from top-right (or bottom-left). If current value is larger than target, move left; if smaller, move down. Each move eliminates one row or column, giving O(m+n) time and O(1) space. I explain why this dominates row-wise binary search in many interview constraints. I also cover edge cases: empty matrix, single row/column, and duplicate values. The main scoring point is proving elimination logic clearly before writing code.',
  },

  "What is InfyTQ and how does qualifying for it benefit your Infosys application?": {
    expertAnswer:
      "InfyTQ is Infosys's learning and certification pathway used heavily in campus hiring. A strong score signals readiness beyond generic aptitude and can improve shortlist probability for better tracks. I prepare by combining platform practice modules with timed mocks focused on technical and problem-solving sections. In interviews, I connect InfyTQ prep to practical outcomes: improved coding consistency, structured revision, and better confidence in Infosys-specific hiring expectations across OA and technical rounds.",
  },
  "What is the Hackwithinfy contest and what does the Power Programmer track offer?": {
    expertAnswer:
      'HackWithInfy is a competitive coding contest where top performers can earn fast-track opportunities into high-paying Power Programmer roles. It typically demands stronger algorithmic depth than standard fresher loops. My preparation would focus on timed DSA practice, contest-style problem solving, and post-contest editorial review to improve speed and pattern recognition. In interviews, I frame participation as evidence of persistence and learning rigor, not just rank, because consistent problem-solving habits matter long-term.',
  },
  "Explain the concept of inheritance and demonstrate it with a Java or Python example.": {
    expertAnswer:
      'Inheritance models an IS-A relationship where a child class reuses and extends parent behavior. In Java, a `SavingsAccount` can extend `Account`, inheriting `deposit()` while overriding `calculateInterest()`. In Python, I use `super()` to reuse base logic cleanly. I also clarify that inheritance should be used when subtype behavior remains substitutable; otherwise composition is safer. In interviews, I pair this with one real project example to show design judgment, not just syntax familiarity.',
  },
  "What is the difference between a stack and a queue? Give a practical use case for each.": {
    expertAnswer:
      'A stack is LIFO, useful when the latest item should be processed first, like undo history or recursive call management. A queue is FIFO, useful when fairness and arrival order matter, like print jobs or task scheduling. I usually explain with one practical scenario from backend systems: request retry stack for rollback contexts versus queue-based worker processing for asynchronous jobs. Mentioning both behavior and use case shows stronger understanding than defining LIFO/FIFO alone.',
  },
  "Write code to reverse a linked list iteratively and recursively.": {
    expertAnswer:
      'Iteratively, I use three pointers: `prev`, `curr`, and `next`. I walk through nodes, reverse `curr.next` to `prev`, then advance pointers. This is O(n) time, O(1) space. Recursively, I recurse until tail, then rewire links while unwinding and nullify old head next pointer. Recursive code is elegant but can overflow stack on very long lists. In interviews, I present iterative first for reliability, then add recursive as a follow-up optimization in readability.',
  },
  "What is exception handling? Explain checked vs unchecked exceptions in Java.": {
    expertAnswer:
      'Exception handling is a structured way to recover or fail gracefully when runtime issues occur. In Java, checked exceptions are compiler-enforced and typically represent recoverable conditions like file or DB failures. Unchecked exceptions extend RuntimeException and usually indicate programming errors such as null dereferences. I avoid broad catch blocks, log context-rich errors, and propagate responsibly at service boundaries. In interviews, I emphasize when to handle locally versus rethrow with domain-specific context.',
  },
  "Describe the OSI model and explain the role of each layer.": {
    expertAnswer:
      'The OSI model has seven layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application. I explain each with one responsibility, then focus on commonly tested layers: Network for routing (IP) and Transport for reliability/flow (TCP/UDP). Application protocols like HTTP live at upper layers. In interviews, I avoid memorization-only answers by mapping one real request flow, such as browser-to-server communication, across relevant layers to show practical understanding.',
  },
  "Tell me about yourself and why Infosys.": {
    expertAnswer:
      'I introduce myself with a concise arc: academics, strongest project, and measurable contribution. Then I connect why Infosys specifically—large-scale delivery exposure, structured learning ecosystem, and opportunities across cloud and enterprise modernization in India. I mention skills I can contribute immediately, like Java/Spring and API fundamentals, while showing growth mindset for enterprise engineering standards. A focused 90-second answer with relevant evidence works better than a generic life story or brand-only motivation statement.',
  },
  "What are ACID properties in databases? Why are they important for transaction management?": {
    expertAnswer:
      'ACID means Atomicity, Consistency, Isolation, and Durability. Atomicity ensures all-or-nothing execution. Consistency preserves valid state transitions. Isolation prevents concurrent transactions from corrupting each other. Durability ensures committed data survives failures. I usually explain with a bank transfer example because it makes rollback and consistency needs obvious. In enterprise systems like Infosys projects, ACID is critical for financial, inventory, and workflow correctness where partial writes or race conditions can cause costly business errors.',
  },
  "What is your greatest weakness and what steps are you taking to improve it?": {
    expertAnswer:
      'One weakness I worked on was over-explaining technical details without first checking audience context. To improve, I started structuring updates into summary, impact, and next actions, then validating understanding before going deeper. I practiced this in project demos and mentorship sessions, and feedback improved noticeably. I still value depth, but now I tune communication to stakeholder needs. This shows a real, improvable weakness with clear actions and measurable progress, which is what interviewers look for.',
  },
  "Explain the difference between GET and POST HTTP methods. When should each be used?": {
    expertAnswer:
      'GET is primarily for retrieval, should be idempotent, and is cache-friendly. POST submits data that typically creates or triggers state changes, so it is generally non-idempotent unless explicitly designed otherwise. GET parameters are visible in URLs, so sensitive payloads should avoid GET. I also mention that modern API design may use PUT/PATCH for updates and DELETE for removals. In interviews, tying method choice to idempotency, caching, and security shows stronger HTTP understanding.',
  },
  "Are you comfortable relocating? How do you handle working in a new city?": {
    expertAnswer:
      'Yes, I am comfortable relocating for the role. I have adapted before through hostel life and internships where I had to quickly settle into new routines and teams. My approach is to stabilize basics early—commute, schedule, and support network—so productivity stays high from week one. I also actively engage with team culture to reduce adjustment time. Interviewers usually value clear flexibility and practical planning rather than vague or conditional answers.',
  },

  "What is the difference between `==` and `.equals()` in Java?": {
    expertAnswer:
      'In Java, `==` checks whether two references point to the same object in memory, while `.equals()` checks logical equality of content when overridden correctly. For strings and value objects, `.equals()` is usually the right choice. I always connect this with hashCode contract: equal objects must have equal hash codes, especially for HashMap/HashSet correctness. In interviews, I show one example with string literals versus `new String()` to prove I understand both reference and value comparisons.',
  },
  "What are the key features introduced in Java 8?": {
    expertAnswer:
      'Java 8 introduced lambda expressions, Stream API, functional interfaces, Optional, default/static interface methods, modern date-time API (`java.time`), and CompletableFuture. In interviews, I lead with business value: Streams improve readable data transformations, lambdas reduce boilerplate, and `java.time` fixes old Date/Calendar pain points. I also mention practical caution: streams are expressive but not always faster for every case, so clarity and profiling should guide usage in production systems.',
  },
  "What is the difference between ArrayList and LinkedList in Java?": {
    expertAnswer:
      'ArrayList stores elements in a dynamic array, so random access is O(1) and usually cache-friendly. LinkedList stores nodes with pointers, making indexed access O(n) but insertions at known node positions efficient. In most production code, ArrayList is the default because reads dominate and memory locality helps performance. I choose LinkedList only for specific queue/deque patterns with frequent head/tail operations. Interviewers expect this practical bias, not theoretical claims that LinkedList is generally faster.',
  },
  "What are checked and unchecked exceptions in Java? When do you use each?": {
    expertAnswer:
      'Checked exceptions are enforced by compiler and represent recoverable scenarios, such as I/O or SQL failures. Unchecked exceptions are RuntimeException subclasses and often represent programming bugs or invalid assumptions. I use checked exceptions where callers can reasonably recover; otherwise I propagate meaningful unchecked exceptions for invalid states. I avoid catch-all blocks and always log with context. A strong answer also mentions try-with-resources and preserving original stack traces when wrapping exceptions across service boundaries.',
  },
  "What are the SOLID principles? Give a one-line Java example for each.": {
    expertAnswer:
      'SOLID improves maintainability in growing Java systems. SRP: split `UserService` and `EmailService` responsibilities. OCP: add new pricing strategy via interface implementation, not modifying old logic. LSP: `Square` should not break `Rectangle` expectations. ISP: separate bulky `Worker` into focused interfaces. DIP: controllers depend on repository interfaces, not concrete classes. In interviews, I tie each principle to testability and change safety because that is what matters in real enterprise delivery.',
  },
  "What is multithreading in Java? Explain `synchronized`, `volatile`, and when you use each.": {
    expertAnswer:
      'Multithreading lets multiple execution paths run concurrently in one process. `synchronized` provides mutual exclusion and memory visibility for critical sections, useful when compound operations must be atomic. `volatile` guarantees visibility of latest value across threads but does not make multi-step updates atomic. I use volatile for status flags and synchronized/locks for shared mutable state updates. In interviews, I also mention higher-level tools like ExecutorService and concurrent collections for safer production concurrency patterns.',
  },
  "Explain Spring Boot auto-configuration. How does it work under the hood?": {
    expertAnswer:
      'Spring Boot auto-configuration uses classpath and environment conditions to create sensible default beans automatically. `@SpringBootApplication` includes `@EnableAutoConfiguration`, which loads configuration classes from starter metadata and applies them when conditions like `@ConditionalOnClass` match. This reduces manual wiring while staying override-friendly through custom beans and properties. In interviews, I explain both convenience and control: defaults speed setup, but understanding conditional loading helps debug unexpected bean behavior in larger applications.',
  },
  "Tell me about a Spring Boot application you built. What design decisions are you most proud of?": {
    expertAnswer:
      'I built a placement-prep backend with layered architecture: controllers, services, repositories, and DTO boundaries. The key decision I am proud of was introducing centralized exception handling and validation so API responses stayed consistent across modules. I also separated persistence entities from response DTOs to avoid tight coupling and accidental data leaks. This reduced bug leakage and made onboarding easier for teammates. In interviews, I present design choices with the specific problem each decision solved and measurable maintenance impact.',
  },
  "A Java service is throwing OutOfMemoryError in production at peak traffic. What is your approach?": {
    expertAnswer:
      'I first stabilize service impact with traffic controls, safe restart strategy, and immediate visibility into memory metrics. Then I capture heap dump and GC logs, analyze retained objects in tools like MAT, and identify leak patterns such as unbounded caches or oversized in-memory collections. I avoid only increasing heap without root-cause fix. After patching, I run load tests and add alerts on heap usage and GC pause behavior. This incident flow demonstrates both operational safety and debugging discipline.',
  },
  "What is garbage collection in Java? Explain generational GC.": {
    expertAnswer:
      'Garbage collection automatically reclaims heap memory of unreachable objects. Generational GC is based on the observation that most objects die young, so JVM separates Young and Old generations. Minor GCs clean young space frequently and quickly, while major/old collection is heavier. Modern collectors like G1 partition heap for predictable pauses. In interviews, I connect this to practical outcomes: latency spikes, allocation patterns, and why reducing object churn often improves performance without touching GC flags first.',
  },
  "What is the difference between HashMap and HashTable in Java?": {
    expertAnswer:
      'HashMap is non-synchronized and generally faster in single-threaded usage; it allows one null key and multiple null values. HashTable is synchronized, legacy, and does not allow null key/value. For concurrent scenarios, I prefer ConcurrentHashMap rather than HashTable because it offers better throughput with finer-grained concurrency controls. Interviewers usually expect this recommendation and collision/load-factor awareness. I also mention that map choice should be driven by threading model and performance profile, not old defaults.',
  },
  "Java vs Python — for a high-throughput, low-latency backend service, which would you choose and why?": {
    expertAnswer:
      'For high-throughput, low-latency core backend paths, I would typically choose Java because JVM JIT optimization, mature concurrency primitives, and predictable long-running service performance are strong advantages. Python can still be excellent for rapid iteration, data-heavy workflows, and I/O-bound APIs with async frameworks. So I choose by workload and team context: Java for latency-critical compute and strongly typed large systems; Python when developer velocity and ecosystem fit are higher priorities.',
  },

  "What are the four main components of an Android application?": {
    expertAnswer:
      'The four main Android components are Activity, Service, BroadcastReceiver, and ContentProvider. Activity handles UI screens, Service handles background tasks, BroadcastReceiver listens to system or app broadcasts, and ContentProvider exposes structured data between apps. I usually add one practical mapping: music playback via foreground service, push or connectivity events via receiver, and contacts-style data sharing via provider. Interviewers look for real usage clarity, not just memorized names from Android docs.',
  },
  "Explain the Android Activity lifecycle. When is onStop called vs onPause?": {
    expertAnswer:
      'Activity lifecycle reflects visibility changes. `onPause()` is called when activity loses focus but may remain partially visible, like a dialog overlay. `onStop()` runs when activity is fully hidden. I keep lightweight state updates in pause and release heavier listeners/resources in stop. For configuration changes, I rely on ViewModel and saved state patterns instead of heavy recreation logic. In interviews, drawing lifecycle order and giving one real scenario is more convincing than reciting callback names.',
  },
  "What is the difference between Fragment and Activity?": {
    expertAnswer:
      'Activity is the top-level screen host, while Fragment is a modular, reusable UI component inside an activity. Fragments help build adaptive layouts and cleaner separation for large screens and navigation flows. In modern Android apps, single-activity architecture with multiple fragments remains common, especially with Navigation Component. I explain lifecycle relationship too: fragment lifecycle is tied to host activity but has its own view lifecycle. This demonstrates architectural understanding beyond basic definitions.',
  },
  "What are Jetpack components? Name and explain three commonly used ones.": {
    expertAnswer:
      'Jetpack is a suite of Android libraries for robust architecture and lifecycle-safe development. Three common components I use are ViewModel, Room, and Navigation. ViewModel stores UI state across configuration changes, Room provides typed local persistence with DAO abstraction, and Navigation manages back stack and screen transitions safely. I also mention where each fits in MVVM flow. Interviewers prefer this problem-solution framing over listing many Jetpack names without implementation context.',
  },
  "What are Kotlin coroutines? How do they differ from threads?": {
    expertAnswer:
      'Coroutines are lightweight concurrency units that can suspend without blocking underlying threads. Threads are OS-level resources with higher creation and context-switch overhead. In Android, I use coroutines with `viewModelScope` to run network/database operations on appropriate dispatchers and update UI safely on main thread. Coroutines support structured concurrency, making cancellation and lifecycle handling cleaner than ad-hoc thread management. This distinction is frequently tested in product-company Android interviews.',
  },
  "What is RecyclerView? How does the ViewHolder pattern improve performance?": {
    expertAnswer:
      'RecyclerView efficiently displays large lists by reusing item views instead of inflating new views for every row. ViewHolder caches item view references, reducing repetitive view lookups during scroll. Combined with DiffUtil and proper adapter updates, this significantly improves scroll performance and battery efficiency on mid-range Android devices common in India. In interviews, I explain recycling pool behavior and why `notifyDataSetChanged()` should be avoided for small updates when granular diff-based updates are possible.',
  },
  "Tell me about the Android app you are most proud of. What was the hardest technical problem you solved?": {
    expertAnswer:
      'I describe a Kotlin MVVM app where the toughest challenge was reliable offline-first behavior. The issue was sync conflicts when users updated data offline and reconnected. I redesigned repository flow with local Room as source of truth, queued sync operations, and conflict resolution rules by timestamp/version. This reduced sync-related errors and improved user trust in weak-network conditions. I end with what I would improve next, such as better telemetry on failed merges and retry visibility.',
  },
  "Your app crashes on Android 6 but works fine on Android 12. How do you debug?": {
    expertAnswer:
      'I reproduce on an API 23 emulator first, then read full stack trace and device logs before changing code. Common root causes are runtime permission handling, API level incompatibilities, and missing version guards around newer APIs. I verify manifest and behavior differences, add compatibility checks, and run regression across minSdk-targeted matrix. After fix, I monitor crash dashboards by API level to confirm recovery. A systematic reproduce-isolate-validate flow matters more than guessing device-specific patches.',
  },
  "How do you ensure backward compatibility in your Android apps?": {
    expertAnswer:
      'I design with compatibility in mind: AndroidX libraries, API-level checks, feature gating with `Build.VERSION`, and careful deprecation handling. I maintain a test matrix across key API levels and vendor devices, because Indian users run diverse hardware/software combinations. I avoid assuming latest-platform behavior and validate permissions, storage, and background task behavior on older versions. In interviews, I mention both code-level guards and release-process discipline to show practical ownership of compatibility.',
  },
  "What is onSaveInstanceState? When is it called and what should you save in it?": {
    expertAnswer:
      '`onSaveInstanceState` is used to persist small UI state before an activity may be destroyed, such as during rotation or process recreation. I save lightweight values like selected tab, form text, or scroll position—not large objects or full datasets. For business state, I rely on ViewModel and persistent storage. I also mention `SavedStateHandle` in ViewModel for cleaner restoration patterns. Interviewers usually check whether you understand state boundaries rather than dumping everything into Bundle.',
  },
  "What is the difference between Intent and PendingIntent?": {
    expertAnswer:
      'Intent is an immediate message to start an activity, service, or broadcast now. PendingIntent is a token granting another component or system app permission to execute that intent later on your app’s behalf, common in notifications and alarms. I also mention modern security requirements like immutable flags where appropriate. In interviews, I connect this to practical scenarios: notification tap actions, alarm triggers, and controlled deferred execution under Android background restrictions.',
  },
  "Native Android vs Flutter vs React Native — which do you prefer for a new project and why?": {
    expertAnswer:
      'I choose based on product goals, team strengths, and platform constraints. For performance-sensitive Android features, deep platform API integration, and long-term Android hiring depth in India, native Kotlin is often my first choice. Flutter or React Native make sense when one team must ship both platforms quickly with acceptable trade-offs. I avoid ideological answers and explain criteria: performance, hiring, plugin maturity, maintenance cost, and timeline. Interviewers value this contextual trade-off reasoning.',
  },

  "What is the difference between `==` and `===` in JavaScript?": {
    expertAnswer:
      '`==` compares values after type coercion, while `===` compares both value and type without coercion. In production frontend code, I default to `===` to avoid surprising conversions like `0 == "0"` or `"" == false`. I can still explain rare intentional uses of `==`, such as checking `null` and `undefined` together. In interviews, giving concrete coercion examples and stating a clear coding standard shows stronger JavaScript fundamentals than a one-line definition.',
    evaluates: 'JavaScript type system fundamentals and whether you write predictable production code.',
    strategy: 'Define both operators, give 2 coercion examples, state your team standard (`===` default), mention null-check exception.',
    mistakes: 'Saying they are interchangeable, or unable to explain any coercion example.',
    followUps: ['What is `Object.is` used for?', 'How does `typeof null` behave?'],
  },
  'What is the virtual DOM and how does reconciliation work?': {
    expertAnswer:
      'The virtual DOM is React’s in-memory tree of UI elements. When state changes, React builds a new tree and diffs it against the previous snapshot — this process is reconciliation. It then applies the minimal set of real DOM mutations rather than repainting the whole page. Keys help React match list items across renders so state stays attached to the correct row. I also note that virtual DOM is not automatic speed for every case — component design, batching, and avoiding unnecessary renders still matter in production.',
    evaluates: 'React mental model depth beyond JSX — reconciliation, diffing, and update strategy.',
    strategy: 'Define virtual DOM, explain diff-and-patch flow, mention keys for list identity, note performance depends on design.',
    mistakes: 'Claiming virtual DOM always makes React faster than vanilla JS, or conflating reconciliation with full page reload.',
    followUps: ['Why do list keys matter?', 'What triggers a React re-render?'],
  },
  'Explain the useEffect hook and its dependency array.': {
    expertAnswer:
      'useEffect runs side effects after paint — data fetching, subscriptions, timers, and DOM sync. The dependency array controls re-runs: omitting it runs after every render, `[]` runs once on mount, and `[dep]` re-runs when `dep` changes. Return a cleanup function to unsubscribe or clear timers on unmount or before the next effect run. Missing dependencies cause stale closures — I follow exhaustive-deps lint and explain why. In interviews I contrast effects that sync with external systems vs derived state that belongs in render.',
    evaluates: 'Side-effect lifecycle understanding and whether you avoid common stale-closure bugs.',
    strategy: 'Explain timing (after paint), dependency array cases, cleanup pattern, and stale-deps pitfall with lint rule.',
    mistakes: 'Using useEffect for derived state, omitting cleanup on subscriptions, or ignoring dependency array intentionally.',
    followUps: ['When should you not use useEffect?', 'What is useLayoutEffect for?'],
  },
  'What is the difference between useMemo, useCallback, and React.memo?': {
    expertAnswer:
      'useMemo caches a computed value between renders when dependencies are unchanged. useCallback caches a function reference — `useCallback(fn, deps)` is equivalent to `useMemo(() => fn, deps)`. React.memo wraps a component and skips re-render when props are shallow-equal. I apply all three only after profiling shows unnecessary work — premature memoization adds complexity and can hurt performance. In interviews I give one example: memoizing a heavy filter on a large list vs memoizing every inline callback.',
    evaluates: 'Performance optimization judgment — measurement-first vs blanket memoization.',
    strategy: 'Define each API, state referential equality purpose, emphasize profile-first usage with one concrete example.',
    mistakes: 'Memoizing everything by default, or unable to explain shallow compare limits of React.memo.',
    followUps: ['When does useMemo hurt performance?', 'What is a stale closure in useCallback?'],
  },
  'Why do React lists need a key, and why is index a poor key?': {
    expertAnswer:
      'Keys give each list element a stable identity across renders so reconciliation can match the correct DOM node when the list reorders, inserts, or deletes items. Using the array index as key breaks when order changes — React reuses the wrong DOM nodes and state or controlled inputs attach to the wrong row. I use stable unique ids from the data model. In interviews I connect keys to reconciliation efficiency and correct component state preservation.',
    evaluates: 'Reconciliation mechanics and practical list-rendering hygiene.',
    strategy: 'Explain identity across renders, show reorder bug with index keys, recommend stable unique ids.',
    mistakes: 'Using index keys on sortable/filterable lists, or saying keys are only for performance not correctness.',
    followUps: ['What if ids are not unique?', 'How do keys affect React.memo children?'],
  },
  'What are controlled vs uncontrolled components?': {
    expertAnswer:
      'Controlled components keep form value in React state via `value` and `onChange` — single source of truth, easy validation and multi-step flows. Uncontrolled components let the DOM hold state, read with refs — useful for file inputs or simple one-off fields. I prefer controlled for product forms with validation and analytics. Mixing controlled and uncontrolled on the same input causes warnings and inconsistent behavior. Interviewers check whether you know when refs are appropriate.',
    evaluates: 'Form state architecture and React data-flow understanding.',
    strategy: 'Contrast state ownership (React vs DOM), give when to use each, warn against mixing on same field.',
    mistakes: 'Treating all forms as uncontrolled, or not knowing file inputs typically need refs.',
    followUps: ['How do you validate controlled fields?', 'When would you use react-hook-form?'],
  },
  "What problem do useState's functional updates and immutability solve?": {
    expertAnswer:
      'React detects state changes by reference — mutating objects or arrays in place does not trigger re-renders. Immutability means returning new references via spread, map, or filter. Functional updates `setCount(c => c + 1)` read the latest state from React’s queue, avoiding stale values when multiple updates batch in the same event. This matters in rapid clicks, intervals, and concurrent features. I demonstrate both patterns in live coding answers.',
    evaluates: 'State update mechanics, batching awareness, and immutability habits.',
    strategy: 'Explain reference equality detection, show functional update for batched events, contrast mutation bug.',
    mistakes: 'Mutating state directly, or using current state variable when functional form is required.',
    followUps: ['How does React 18 batching affect setState?', 'When use useReducer instead?'],
  },
  'How does the Context API work and when does it cause performance issues?': {
    expertAnswer:
      'Context lets you pass values through the tree without prop drilling — a Provider supplies a value and consumers read it via useContext. Every consumer re-renders when the provider value changes, so a new object literal each render re-renders the entire subtree. I memoise provider values with useMemo, split contexts by concern (theme vs auth), or move high-frequency state to Zustand/Redux with selectors. For interview answers I explain when Context fits (theme, locale) vs when a store fits (frequent updates).',
    evaluates: 'Global state architecture judgment and re-render cost awareness.',
    strategy: 'Describe provider/consumer flow, explain all-consumers-rerender rule, give split-context and memo fixes.',
    mistakes: 'Putting entire app state in one Context, or not knowing selector libraries reduce re-renders.',
    followUps: ['Context vs Redux — when to choose each?', 'How do you debug Context re-renders?'],
  },
  'What are the rules of hooks and why do they exist?': {
    expertAnswer:
      'Hooks must be called at the top level — never inside conditions, loops, or nested functions — and only from React function components or custom hooks. React stores hook state in a linked list keyed by call order per component. Conditional calls would shift that order between renders and corrupt state. eslint-plugin-react-hooks enforces this. Custom hooks let you reuse stateful logic while obeying the same rules. I mention this when discussing why early returns before hooks are invalid.',
    evaluates: 'Fundamental React execution model — not just memorizing the rules list.',
    strategy: 'State the two rules, explain call-order linked list model, mention eslint and custom hooks.',
    mistakes: 'Calling hooks conditionally, or unable to explain why order matters beyond “the docs say so”.',
    followUps: ['How do custom hooks work internally?', 'Can hooks be used in class components?'],
  },
  "What is the virtual DOM in React and why does it exist?": {
    expertAnswer:
      'Virtual DOM is React’s in-memory representation of UI structure. On state changes, React compares previous and new trees, then applies minimal updates to the real DOM. This model improves developer ergonomics and can reduce costly direct DOM mutations, especially in complex interfaces. I also mention that virtual DOM is not magic speed for every case—component design and rendering patterns still matter. In interviews, I connect reconciliation, keys, and render batching for a complete explanation.',
    evaluates: 'React mental model depth beyond JSX syntax — reconciliation and update strategy.',
    strategy: 'Define virtual DOM, explain diff-and-patch flow, mention keys and that performance still depends on component design.',
    mistakes: 'Claiming virtual DOM always makes React faster than vanilla JS, or skipping reconciliation entirely.',
    followUps: ['Why do list keys matter?', 'What triggers a React re-render?'],
  },
  "Explain CSS specificity. Which rule wins: an ID selector or a class selector?": {
    expertAnswer:
      'CSS specificity determines which rule wins when multiple rules target the same element. An ID selector has higher specificity than a class selector, so ID wins unless overridden by `!important` or inline styles in specific contexts. I explain specificity numerically and also mention source order as tiebreaker when specificity is equal. In frontend interviews, I pair this with maintainability advice: avoid overusing IDs and `!important`, and prefer predictable architecture like utility classes or scoped systems.',
    evaluates: 'CSS debugging ability and whether you can explain cascade conflicts in real codebases.',
    strategy: 'State ID beats class, explain specificity weights (inline > ID > class > element), add maintainability note.',
    mistakes: 'Wrong ordering, ignoring source order tiebreaker, or over-relying on `!important` in answers.',
    followUps: ['What beats an inline style?', 'How do pseudo-classes affect specificity?'],
  },
  "What is event bubbling in JavaScript? How do you stop it?": {
    expertAnswer:
      'Event bubbling means an event triggered on a child element propagates upward through ancestor elements. I stop propagation using `event.stopPropagation()` when parent handlers should not run. I also distinguish `preventDefault()`, which blocks default browser action but does not stop bubbling. In real apps, I use delegation intentionally for performance on large lists, then selectively stop bubbling for nested interactive controls. Interviewers usually check that you understand phases and practical handling choices.',
    evaluates: 'DOM event model knowledge and practical handler design in interactive UIs.',
    strategy: 'Define bubbling, show stopPropagation vs preventDefault, mention event delegation use case.',
    mistakes: 'Confusing preventDefault with stopPropagation, or not knowing capture vs bubble phases.',
    followUps: ['What is event capturing?', 'When is event delegation useful?'],
  },
  "What are the differences between `let`, `const`, and `var`?": {
    expertAnswer:
      '`var` is function-scoped and hoisted with undefined initialization, which can cause subtle bugs. `let` and `const` are block-scoped and respect temporal dead zone before declaration. `const` prevents reassignment of the binding but does not make objects deeply immutable. In modern JavaScript, I default to `const`, use `let` when reassignment is needed, and avoid `var` in new code. A strong interview answer includes scope examples and common loop-related pitfalls.',
    evaluates: 'Core JavaScript scoping and hoisting — foundational for debugging async and closure bugs.',
    strategy: 'Compare scope, hoisting, and reassignment rules; recommend const-first modern style with examples.',
    mistakes: 'Saying const makes objects immutable, or unable to explain temporal dead zone.',
    followUps: ['What is the temporal dead zone?', 'How does hoisting affect function declarations?'],
  },
  "What is the difference between controlled and uncontrolled components in React?": {
    expertAnswer:
      'Controlled components keep form state inside React using `value` and `onChange`, giving predictable validation and multi-step workflow control. Uncontrolled components rely on DOM state and refs, useful for simple fields or file inputs. In product UIs like Freshworks-style admin forms, controlled inputs are usually preferred for validation, analytics, and dynamic logic. I also mention not mixing both styles on the same field to avoid warnings and inconsistent behavior during rerenders.',
    evaluates: 'Form state architecture judgment and React data-flow understanding.',
    strategy: 'Contrast state ownership (React vs DOM), give when to use each, warn against mixing on same input.',
    mistakes: 'Treating all forms as uncontrolled, or not knowing file inputs often need refs.',
    followUps: ['How do you validate controlled form fields?', 'When would you use react-hook-form?'],
  },
  "How do you optimise the performance of a React application?": {
    expertAnswer:
      'I start with profiling, not guesswork. Then I optimize high-impact areas: avoid unnecessary rerenders with memoization where proven useful, split heavy route bundles, virtualize long lists, and reduce expensive synchronous work on render paths. I also improve network and asset performance with lazy loading, caching strategy, and image optimization. In interviews, I present one before/after metric example because measurable impact is stronger than listing techniques without prioritization.',
    evaluates: 'Performance engineering maturity — measurement-first optimization vs random memoization.',
    strategy: 'Lead with profiling, prioritize bundle/network/render bottlenecks, cite one metric-driven fix.',
    mistakes: 'Sprinkling React.memo everywhere without profiling, or listing techniques with no prioritization.',
    followUps: ['When does useMemo hurt performance?', 'How do you analyze bundle size?'],
  },
  "How do you ensure cross-browser compatibility in your CSS and JavaScript?": {
    expertAnswer:
      'I use a layered approach: check feature support with caniuse data, transpile JavaScript with Babel targets, add CSS prefixes via Autoprefixer, and rely on progressive enhancement for advanced APIs. I test critical flows on Chrome, Firefox, Safari, and mobile browsers, with focused fallback paths for unsupported features. I prefer feature detection over user-agent sniffing. In product-company interviews, showing a repeatable compatibility process is more valuable than naming isolated browser quirks.',
    evaluates: 'Production readiness and systematic QA habits for diverse browser environments.',
    strategy: 'Describe toolchain (Babel, Autoprefixer), testing matrix, progressive enhancement, avoid UA sniffing.',
    mistakes: 'Only testing Chrome, or relying on polyfills without understanding bundle cost.',
    followUps: ['What is progressive enhancement?', 'How do you test Safari-specific issues?'],
  },
  "Tell me about a frontend component or feature you built that you are most proud of.": {
    expertAnswer:
      'I usually discuss a ticket-management table I built with server-side pagination, column filters, keyboard accessibility, and optimistic updates. The hardest part was balancing performance with UX for large datasets. I profiled render bottlenecks, introduced row virtualization, and reduced unnecessary rerenders through stable props and memoized selectors. As a result, interaction latency dropped and adoption improved among internal support agents. I conclude with one improvement area to show reflection, not just self-promotion.',
    evaluates: 'Project ownership depth, technical trade-offs, and ability to communicate impact with specifics.',
    strategy: 'Use STAR: situation, your technical decisions, measurable outcome, one lesson learned.',
    mistakes: 'Generic tutorial projects, no metrics, or claiming sole credit without explaining your role.',
    followUps: ['What would you refactor if you rebuilt it?', 'How did you handle error states?'],
  },
  "How would you approach building a fully responsive design from a desktop Figma mockup?": {
    expertAnswer:
      'I do not shrink desktop blindly. I define core user tasks, then design mobile-first layouts with content-driven breakpoints. I use fluid spacing/type scales, Flexbox/Grid combinations, and responsive image strategy for performance. I verify edge states—long text, empty states, form errors, and localization. I also sync quickly with designers on ambiguous interactions before implementation drifts. In interviews, this workflow shows practical execution from design handoff to production-ready responsive behavior.',
    evaluates: 'Design-to-code workflow, responsive CSS craft, and collaboration with designers.',
    strategy: 'Mobile-first plan, content-driven breakpoints, layout primitives, edge-case checklist, designer sync.',
    mistakes: 'Fixed pixel breakpoints only, ignoring touch targets, or skipping empty/error states.',
    followUps: ['How do you handle responsive images?', 'When do you use container queries?'],
  },

  'What is the TCS NQT and what sections does it cover?': {
    expertAnswer:
      'TCS National Qualifier Test is the primary online screening for campus and off-campus TCS hiring in India. It typically has four scored sections: Verbal Ability, Reasoning Ability, Numerical Ability, and Programming Logic — with an additional coding section for Digital and Prime track aspirants. Your composite percentile and section-wise cutoffs determine whether you qualify for Digital (UG ₹7.09–8.04 LPA) or Prime (UG ₹9.09–9.30 LPA; PG up to ₹11.80 LPA) bands. I treat NQT as a gate: clearing the top band unlocks higher package tracks and tougher downstream technical rounds.',
    evaluates:
      'Whether you understand TCS entry mechanics, NQT section structure, and how scores map to offer bands — not vague “aptitude test” answers.',
    strategy:
      'Define NQT, list all five areas (verbal, reasoning, numerical, programming logic, coding), then connect percentile bands to Digital/Prime/Ninja tracks.',
    mistakes:
      'Omitting Programming Logic, confusing NQT with only aptitude, or unable to explain how track selection works.',
    followUps: ['What percentile do you need for Digital vs Prime?', 'How do you balance aptitude vs coding prep for NQT?'],
  },
  'What is the difference between TCS Digital and TCS Prime? Which one should you target?': {
    expertAnswer:
      'TCS Prime (UG ₹9.09–9.30 LPA; PG ₹11.50–11.80 LPA) is the premium fresher band for top NQT performers — roles focus on technical specialist tracks, lead projects, and mentorship. TCS Digital (UG ₹7.09–8.04 LPA; PG ₹7.39–8.04 LPA) targets solid aptitude and basic OOP/CS fundamentals with roles in full stack, cloud, AI/ML, and big data. I target Prime only if mock NQT scores and timed coding practice consistently hit Digital/Prime cutoffs; otherwise I optimize for Digital to avoid overcommitting to DSA at the expense of aptitude.',
    evaluates:
      'Realistic self-assessment, awareness of package bands, and a prep strategy aligned to your current skill level.',
    strategy:
      'State UG/PG CTC bands for Digital and Prime, contrast target roles (full stack/cloud vs technical specialist), and give a decision rule based on mock scores.',
    mistakes:
      'Quoting outdated ₹4.5/₹7 LPA figures, claiming Prime without coding evidence, or ignoring aptitude weight in NQT.',
    followUps: ['What coding difficulty appears in Prime technical rounds?', 'Can you move from Digital to Prime after joining?'],
  },
  'Explain the concept of polymorphism with a real-world example.': {
    expertAnswer:
      'Polymorphism means one interface, many implementations. Compile-time polymorphism is method overloading — same method name, different parameters. Runtime polymorphism is method overriding — a subclass provides its own version of a parent method. A practical example: a PaymentProcessor interface with processPayment() implemented by CreditCardPayment, UpiPayment, and NetBankingPayment. The billing service calls processPayment() without knowing the concrete type — new payment methods can be added without changing client code. This is how TCS interviewers expect you to connect OOP theory to extensible system design.',
    evaluates:
      'OOP fundamentals with clarity on compile-time vs runtime polymorphism and a concrete, production-style example.',
    strategy:
      'Define both polymorphism types briefly, then walk through payment-gateway or notification-dispatcher example with interface + overrides.',
    mistakes:
      'Only giving animal/dog/cat analogy, confusing overloading with overriding, or skipping real-world mapping.',
    followUps: ['Difference between abstraction and polymorphism?', 'When is composition preferred over inheritance?'],
  },
  'Write a program to find the second largest element in an array without sorting.': {
    expertAnswer:
      'I use a single-pass approach with two variables: max and secondMax, both initialized to negative infinity (or first two elements handled explicitly). For each element, if it exceeds max, shift old max to secondMax and update max; else if it is greater than secondMax and not equal to max, update secondMax. Time O(n), space O(1). Edge cases: array length < 2, all elements equal (no second largest), duplicates where max appears multiple times. I narrate the logic aloud while coding — TCS panels value clean edge-case handling over clever one-liners.',
    evaluates:
      'Array traversal fluency, complexity awareness, and disciplined edge-case handling under interview pressure.',
    strategy:
      'State O(n)/O(1) upfront, write the two-variable loop, then verbally list edge cases before the interviewer asks.',
    mistakes:
      'Sorting first (O(n log n)), mishandling duplicates, or crashing on arrays with fewer than two distinct values.',
    followUps: ['Find the k-th largest element.', 'What if the array has negative numbers?'],
  },
  'What is a deadlock? How would you prevent it in a multi-threaded application?': {
    expertAnswer:
      'Deadlock occurs when two or more threads block forever, each waiting for a resource held by another. All four Coffman conditions must hold: mutual exclusion, hold-and-wait, no preemption, and circular wait. Prevention strategies: acquire locks in a global consistent order, use tryLock with timeouts, minimize lock granularity, and prefer higher-level concurrency utilities (java.util.concurrent) over raw synchronized blocks. In Java services, I also avoid nested locks on different objects and use thread dumps to diagnose circular wait in production incidents.',
    evaluates:
      'Concurrency literacy — can you name Coffman conditions and give practical prevention, not just a textbook definition.',
    strategy:
      'Define deadlock → list four conditions → give two prevention tactics (lock ordering + timeout) with a brief Java example.',
    mistakes:
      'Missing one Coffman condition, suggesting “just use more threads,” or no concrete prevention mechanism.',
    followUps: ['Difference between deadlock and livelock?', 'How do you detect deadlock in Java?'],
  },
  'What are the main differences between SQL and NoSQL databases? When would you use each?': {
    expertAnswer:
      'SQL databases are relational, schema-first, and ACID-compliant — ideal for structured data with joins and transactional integrity (banking, orders, HR records). NoSQL databases (document, key-value, column, graph) trade strict schema and joins for horizontal scalability and flexible payloads — useful for session stores, logs, catalogs, and high-write telemetry. I choose SQL when consistency and complex queries matter; NoSQL when scale, schema evolution speed, or denormalized access patterns dominate. TCS interviewers often follow up with a scenario: “Would you store user profiles in MongoDB or PostgreSQL?” — justify with access pattern, not hype.',
    evaluates:
      'Data modeling judgment and ability to match database type to workload requirements.',
    strategy:
      'Contrast schema, consistency, scaling model; give one SQL use case and one NoSQL use case with reasoning.',
    mistakes:
      'Claiming NoSQL is always faster, ignoring ACID needs, or unable to name a concrete use case for each.',
    followUps: ['What is CAP theorem?', 'When would you use Redis vs PostgreSQL?'],
  },
  'Tell me about a time you worked under a tight deadline and how you managed it.': {
    expertAnswer:
      'During my final-year major project, our demo date moved up by four days after a scope change. I listed all deliverables, classified them as must-have vs nice-to-have with my team lead, and focused on a thin vertical slice: login, core workflow, and one report. I sent progress updates every evening, escalated a blocker on API integration on day one, and paired with a teammate on testing. We shipped the demo on time with zero critical bugs and deferred analytics to the next sprint. TCS values structured prioritization and proactive communication — not heroics or last-minute all-nighters alone.',
    evaluates:
      'STAR storytelling, prioritization under pressure, and team communication maturity.',
    strategy:
      'Use STAR with specific timeline, your prioritization framework, stakeholder updates, and measurable outcome.',
    mistakes:
      'Vague team stories, no trade-offs mentioned, or framing success as working overnight without a plan.',
    followUps: ['What did you deprioritize and why?', 'How would you handle the same situation with a larger team?'],
  },
  'What is the difference between process and thread? How does context switching work?': {
    expertAnswer:
      'A process is an independent program execution unit with its own virtual memory space, file descriptors, and OS resources tracked in a PCB. A thread is a lighter execution unit within a process that shares the process heap and open files but has its own stack and registers (TCB). Context switching saves CPU register state and switches execution; for threads it is faster because address space does not change — only thread-local state is swapped. Multithreading improves throughput for I/O-bound work but introduces race conditions requiring synchronization.',
    evaluates:
      'OS fundamentals — memory isolation, shared state risks, and context-switch cost reasoning.',
    strategy:
      'Contrast memory model first, explain PCB vs TCB, then why thread context switch is cheaper than process switch.',
    mistakes:
      'Saying threads have separate memory spaces, or describing context switch without mentioning saved register state.',
    followUps: ['What is a race condition?', 'When would you prefer multiprocessing over multithreading?'],
  },
  'Why do you want to join TCS over other IT companies?': {
    expertAnswer:
      'I want to join TCS because of its scale as one of the world’s largest IT employers, structured fresher development through ILP, and platforms like Fresco Play for continuous upskilling. TCS’s global delivery footprint means early exposure to enterprise clients and diverse tech stacks — which fits my goal of building production discipline before specializing. I have researched their campus programs and am drawn to the stability, mentorship density, and certification paths (cloud, architecture) that support long-term growth — not just brand recognition.',
    evaluates:
      'Company research depth, genuine motivation, and fit for IT services career path — beyond generic answers.',
    strategy:
      'Three pillars: scale + training (ILP/Fresco Play), project exposure, alignment with your 2–3 year skill goals.',
    mistakes:
      'Generic “brand name” answers, incorrect facts about TCS programs, or only mentioning salary.',
    followUps: ['Why not Infosys or Wipro?', 'Which TCS business unit interests you?'],
  },
  'Explain normalisation in databases. What are 1NF, 2NF, and 3NF?': {
    expertAnswer:
      'Normalisation reduces redundancy and update anomalies by decomposing tables based on functional dependencies. 1NF: atomic column values, no repeating groups, unique rows. 2NF: 1NF plus no partial dependency — non-key attributes must depend on the whole composite primary key. 3NF: 2NF plus no transitive dependency — non-key attributes depend only on the primary key, not on other non-key columns. Example: Student(CourseID, StudentID, Grade, InstructorName) violates 3NF if InstructorName depends only on CourseID — split into StudentGrade and CourseInstructor tables.',
    evaluates:
      'DBMS design literacy — can you define each normal form and demonstrate with a concrete decomposition.',
    strategy:
      'One sentence per normal form, then walk a Student/Course table through violations and fixes step by step.',
    mistakes:
      'Memorizing definitions without examples, confusing 2NF partial dependency with 3NF transitive dependency.',
    followUps: ['What is BCNF?', 'When might you intentionally denormalize?'],
  },
  'What is your understanding of Agile methodology and how does it differ from Waterfall?': {
    expertAnswer:
      'Waterfall is sequential: requirements → design → implementation → testing → deployment, with scope locked early. Agile is iterative: work ships in short sprints with continuous stakeholder feedback and changing requirements welcomed late. Scrum adds roles (Product Owner, Scrum Master), ceremonies (sprint planning, daily standup, retrospective), and artifacts (backlog, increment). TCS uses Agile on most client delivery — I mention that I am comfortable with sprint demos, backlog grooming, and adapting when priorities shift mid-sprint.',
    evaluates:
      'Software delivery methodology awareness and readiness for client-project Agile environments.',
    strategy:
      'Contrast planning rigidity vs iteration, name Scrum ceremonies, connect to TCS delivery context.',
    mistakes:
      'Equating Agile with “no documentation,” or unable to name a single Scrum ceremony.',
    followUps: ['What happens in a sprint retrospective?', 'How do you handle scope creep in Agile?'],
  },
  'Where do you see yourself in five years, and how does TCS fit into that plan?': {
    expertAnswer:
      'In five years I see myself as a confident IT Analyst or Assistant Consultant with strong delivery on at least one enterprise domain — having earned relevant certifications through TCS’s learning ecosystem (cloud, architecture, or a specialization aligned to my project). Short term, I want to master fundamentals on ILP, contribute reliably on client sprints, and build communication skills for stakeholder calls. TCS fits because it offers structured career tracks, global project exposure, and certification support that maps to my goal of becoming a solution-oriented engineer, not jumping roles every year.',
    evaluates:
      'Long-term planning realism, alignment with TCS career ladder, and commitment signal without overpromising.',
    strategy:
      'Anchor to TCS tracks (Associate → IT Analyst → Assistant Consultant), mention certifications, show 1-year and 5-year milestones.',
    mistakes:
      'Saying “CEO in five years,” vague ambitions, or a plan that implies leaving TCS immediately after skilling up.',
    followUps: ['Which certification path interests you first?', 'How do you plan to grow in your first year on ILP?'],
  },
  'Write a SQL query to find the second-highest salary from an Employee table.': {
    expertAnswer:
      'Approach 1 (subquery): SELECT MAX(salary) AS second_highest FROM Employee WHERE salary < (SELECT MAX(salary) FROM Employee). Approach 2 (window): SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk FROM Employee) t WHERE rnk = 2. Mention tie-handling: DENSE_RANK returns all rows tied at second place; LIMIT 1 alone may drop valid ties.',
    whyAsked:
      'Ranking queries are the most common live SQL task in Wipro DA panels — they test subquery thinking, dialect awareness, and edge-case discussion under time pressure.',
    evaluates:
      'Subquery vs window-function fluency, duplicate-salary handling, and whether you narrate logic before typing.',
    strategy:
      'State two valid approaches, write one cleanly, then discuss ties and NULL salaries before the panel asks.',
    mistakes:
      'Using LIMIT/OFFSET without naming SQL dialect, forgetting NULLs, or unable to explain why the subquery works.',
    followUps: ['Find the Nth highest salary', 'What if all salaries are identical?'],
  },
  'Use a window function to rank employees by salary within each department.': {
    expertAnswer:
      'SELECT employee_id, department, salary, DENSE_RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_salary_rank FROM Employee ORDER BY department, dept_salary_rank. Filter top 3 per department with QUALIFY (BigQuery/Snowflake) or a CTE: WHERE dept_salary_rank <= 3.',
    evaluates:
      'PARTITION BY correctness, function choice (RANK vs DENSE_RANK vs ROW_NUMBER), and ability to filter ranked results.',
    strategy:
      'Explain PARTITION BY department first, pick DENSE_RANK for tie-friendly ranking, show optional top-N filter.',
    mistakes:
      'Using GROUP BY instead of window functions, or picking RANK without explaining gap behavior after ties.',
    followUps: ['RANK vs ROW_NUMBER for unique ranks?', 'Running total by department with SUM() OVER?'],
  },
  'What is the Software Testing Life Cycle (STLC)? List and explain each phase.': {
    expertAnswer:
      'STLC phases: Requirement Analysis (understand scope and testability), Test Planning (strategy, resources, schedule, entry/exit criteria), Test Case Design (scripts, data, traceability), Environment Setup, Test Execution (run cases, log defects), Test Closure (metrics, sign-off, lessons learned). QA involvement starts at requirements — defects found late cost far more to fix.',
    whyAsked:
      'STLC opens most Wipro QA technical rounds — panels expect phase-by-phase clarity with real examples, not a memorized bullet list.',
    evaluates:
      'Testing process maturity, phase ownership, and whether you connect STLC to release risk.',
    strategy:
      'Walk phases in order, name QA deliverables per phase, and cite one project example for planning or closure.',
    mistakes:
      'Skipping requirement analysis, conflating STLC with SDLC, or listing phases without deliverables.',
    followUps: ['What are entry and exit criteria for test execution?', 'How do you handle scope creep in test planning?'],
  },
  'What is Selenium WebDriver? What are its key limitations?': {
    expertAnswer:
      'Selenium WebDriver drives browsers via the W3C WebDriver protocol — simulating real user interactions. Limitations: timing flakiness (mitigate with explicit waits, never Thread.sleep), no built-in test runner or reporting, slower than API or component tests, and maintenance overhead on dynamic UIs. Playwright improves auto-waiting and debugging but Selenium remains common in Wipro legacy suites.',
    whyAsked:
      'Selenium is the default automation stack in many Wipro client accounts — panels probe practical depth beyond tool name-dropping.',
    evaluates:
      'Automation fundamentals, flakiness awareness, and tool trade-off judgment.',
    strategy:
      'Define WebDriver first, list 2–3 limitations with fixes, mention explicit waits and when you would choose Playwright.',
    mistakes:
      'Claiming Selenium has no limitations, recommending Thread.sleep, or unable to name locator strategies.',
    followUps: ['Explicit vs implicit waits?', 'How would you structure a Page Object Model?'],
  },
  'How do you test a REST API? What aspects do you check and what tools do you use?': {
    expertAnswer:
      'I validate status codes (200, 201, 400, 401, 403, 404, 500), response schema and required fields, boundary and negative payloads, auth headers and token expiry, idempotency for PUT/DELETE, and performance under expected load. Tools: Postman for exploration and collections, REST Assured or pytest for automated suites, and optional contract tests. I log defects with request/response snippets for reproducibility.',
    whyAsked:
      'Wipro client projects increasingly pair UI and API validation — API depth differentiates fresher QA candidates.',
    evaluates:
      'API test design, status-code literacy, negative-case thinking, and tool familiarity.',
    strategy:
      'Structure answer as aspects checked → tools → one concrete defect example from a Postman collection.',
    mistakes:
      'Only checking happy-path 200 responses, ignoring auth errors, or naming tools without test scenarios.',
    followUps: ['How do you test pagination APIs?', 'What is contract testing vs integration testing?'],
  },
  'What is the difference between INNER JOIN and LEFT JOIN?': {
    expertAnswer:
      'INNER JOIN returns only rows where the join condition matches in both tables. LEFT JOIN returns all rows from the left table; non-matching right columns are NULL. Example: all customers LEFT JOIN orders shows customers with zero orders as NULL order fields — useful for gap analysis.',
    whyAsked:
      'SQL JOIN fluency is a top filter in Wipro SWE panels — service-company projects are database-heavy and weak SQL eliminates strong coders.',
    evaluates:
      'Relational query understanding, NULL semantics, and when to preserve non-matching rows.',
    strategy:
      'Define both, draw mental Venn diagram, give one business example (customers without orders).',
    mistakes:
      'Confusing LEFT with RIGHT JOIN, or unable to explain NULL behavior for non-matches.',
    followUps: ['RIGHT JOIN vs LEFT JOIN?', 'INNER JOIN with WHERE vs ON clause?'],
  },
  'Given an array of integers, how would you find two numbers that sum to a target?': {
    expertAnswer:
      'Optimal: one pass with a hash map storing value → index. For each x, check if (target - x) exists; if yes return indices. O(n) time, O(n) space. For sorted arrays, two-pointer approach also works in O(n). Always state approach and complexity before coding.',
    whyAsked:
      'Two-sum is the most common live coding pattern in Wipro NLTH and technical rounds — tests hash map thinking under time pressure.',
    evaluates:
      'Algorithm optimization, edge-case handling, and narrated problem-solving.',
    strategy:
      'Start with brute force O(n²), optimize to hash map O(n), mention duplicate and negative number handling.',
    mistakes:
      'Silent coding, wrong index on duplicates, or no complexity analysis.',
    followUps: ['Three-sum extension?', 'What if array is sorted?'],
  },
}

export function mergeQuestionInsights(question: SeoQuestion): SeoQuestion {
  const ext = INSIGHT_EXTENSIONS[question.question]
  if (!ext) return question
  return {
    ...question,
    expertAnswer: ext.expertAnswer ?? question.expertAnswer,
    whyAsked: ext.whyAsked ?? question.whyAsked,
    evaluates: ext.evaluates ?? question.evaluates,
    strategy: ext.strategy ?? question.strategy,
    mistakes: ext.mistakes ?? question.mistakes,
    followUps: ext.followUps ?? question.followUps,
  }
}
