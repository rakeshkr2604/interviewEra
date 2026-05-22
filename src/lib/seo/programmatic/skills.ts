/**
 * Skill data for programmatic SEO pages (/interview-questions/topics/[skill]).
 *
 * Coverage strategy:
 * - `cs-fundamentals`: Core subjects tested by every company regardless of role.
 * - `backend` / `frontend`: Language + framework topics with high search volume.
 * - `database`: SQL + NoSQL topics frequently tested separately from role-based queries.
 * - `devops` / `cloud`: Growing demand; separate from backend to capture specialist searches.
 * - `data`: ML and data science topics; separate silo from general programming.
 * - `mobile`: Android and iOS are large, distinct search clusters.
 *
 * Adding a new skill:
 * 1. Append an entry to SKILLS.
 * 2. The new slug automatically joins the SkillSlug union.
 * 3. Reference the slug in `primarySkills` arrays in roles.ts where relevant.
 * 4. Add skill-specific questions to SKILL_QUESTION_REGISTRY in questions.ts.
 */

import type { SkillDefinition } from './types'

export const SKILLS = [
  // ── Frontend ───────────────────────────────────────────────────────────────
  {
    slug: 'react',
    label: 'React.js',
    shortLabel: 'React',
    category: 'frontend',
    relatedRoles: ['frontend-developer', 'react-developer', 'full-stack-developer'],
    sitemapPriority: 0.86,
    fresherRelevant: true,
    description:
      'React.js interview questions on hooks, virtual DOM, state management, and performance — the most-requested frontend skill at Indian product companies.',
  },
  {
    slug: 'javascript',
    label: 'JavaScript',
    shortLabel: 'JS',
    category: 'frontend',
    relatedRoles: [
      'frontend-developer',
      'react-developer',
      'full-stack-developer',
      'node-developer',
    ],
    sitemapPriority: 0.87,
    fresherRelevant: true,
    description:
      'Core JavaScript interview questions covering closures, async/await, prototypes, and ES6+ features tested at every Indian tech company.',
  },
  {
    slug: 'typescript',
    label: 'TypeScript',
    shortLabel: 'TS',
    category: 'frontend',
    relatedRoles: [
      'frontend-developer',
      'react-developer',
      'full-stack-developer',
      'node-developer',
    ],
    sitemapPriority: 0.81,
    fresherRelevant: true,
    description:
      'TypeScript interview questions on type system, generics, interfaces, and compiler options — increasingly required at Indian product startups.',
  },
  {
    slug: 'html-css',
    label: 'HTML & CSS',
    shortLabel: 'HTML/CSS',
    category: 'frontend',
    relatedRoles: ['frontend-developer', 'react-developer', 'ui-ux-designer'],
    sitemapPriority: 0.82,
    fresherRelevant: true,
    description:
      'HTML and CSS interview questions on semantic markup, Flexbox, Grid, specificity, and responsive design fundamentals.',
  },
  {
    slug: 'angular',
    label: 'Angular',
    shortLabel: 'Angular',
    category: 'frontend',
    relatedRoles: ['frontend-developer', 'full-stack-developer'],
    sitemapPriority: 0.78,
    fresherRelevant: true,
    description:
      'Angular interview questions on components, directives, services, RxJS, and the Angular CLI — common at enterprise IT services companies.',
  },
  // ── Backend ────────────────────────────────────────────────────────────────
  {
    slug: 'node-js',
    label: 'Node.js',
    shortLabel: 'Node.js',
    category: 'backend',
    relatedRoles: ['node-developer', 'backend-developer', 'full-stack-developer'],
    sitemapPriority: 0.83,
    fresherRelevant: true,
    description:
      'Node.js interview questions on event loop, streams, async patterns, Express.js, and REST API development.',
  },
  {
    slug: 'java',
    label: 'Java',
    shortLabel: 'Java',
    category: 'backend',
    relatedRoles: ['java-developer', 'backend-developer', 'software-engineer'],
    sitemapPriority: 0.87,
    fresherRelevant: true,
    description:
      'Core Java interview questions on OOPs, collections, multithreading, JVM internals, and exception handling — the primary language tested by TCS, Infosys, and Wipro.',
  },
  {
    slug: 'python',
    label: 'Python',
    shortLabel: 'Python',
    category: 'backend',
    relatedRoles: [
      'python-developer',
      'data-scientist',
      'machine-learning-engineer',
      'backend-developer',
      'data-analyst',
    ],
    sitemapPriority: 0.87,
    fresherRelevant: true,
    description:
      'Python interview questions on data types, OOPs, decorators, generators, and libraries — widely tested for both backend and data science roles.',
  },
  {
    slug: 'spring-boot',
    label: 'Spring Boot',
    shortLabel: 'Spring',
    category: 'backend',
    relatedRoles: ['java-developer', 'backend-developer'],
    sitemapPriority: 0.82,
    fresherRelevant: true,
    description:
      'Spring Boot interview questions covering auto-configuration, REST controllers, JPA/Hibernate, and Spring Security.',
  },
  {
    slug: 'django',
    label: 'Django',
    shortLabel: 'Django',
    category: 'backend',
    relatedRoles: ['python-developer', 'backend-developer'],
    sitemapPriority: 0.79,
    fresherRelevant: true,
    description:
      'Django interview questions on MVT architecture, ORM, middleware, REST framework (DRF), and authentication.',
  },
  {
    slug: 'rest-api',
    label: 'REST APIs',
    shortLabel: 'REST',
    category: 'backend',
    relatedRoles: [
      'backend-developer',
      'frontend-developer',
      'full-stack-developer',
      'software-engineer',
    ],
    sitemapPriority: 0.83,
    fresherRelevant: true,
    description:
      'REST API interview questions on HTTP methods, status codes, statelessness, authentication (JWT/OAuth), and API design best practices.',
  },
  {
    slug: 'graphql',
    label: 'GraphQL',
    shortLabel: 'GraphQL',
    category: 'backend',
    relatedRoles: ['backend-developer', 'frontend-developer', 'full-stack-developer'],
    sitemapPriority: 0.76,
    fresherRelevant: false,
    description:
      'GraphQL interview questions on schema definition, queries, mutations, resolvers, and comparison with REST for API design.',
  },
  // ── Database ───────────────────────────────────────────────────────────────
  {
    slug: 'sql',
    label: 'SQL',
    shortLabel: 'SQL',
    category: 'database',
    relatedRoles: ['data-analyst', 'business-analyst', 'backend-developer', 'software-engineer'],
    sitemapPriority: 0.87,
    fresherRelevant: true,
    description:
      'SQL interview questions on JOINs, aggregations, subqueries, indexing, and query optimisation — the most-tested database skill at Indian companies.',
  },
  {
    slug: 'mysql',
    label: 'MySQL',
    shortLabel: 'MySQL',
    category: 'database',
    relatedRoles: ['backend-developer', 'java-developer', 'software-engineer'],
    sitemapPriority: 0.80,
    fresherRelevant: true,
    description:
      'MySQL interview questions on DDL/DML, transactions, stored procedures, indexing strategies, and ACID properties.',
  },
  {
    slug: 'postgresql',
    label: 'PostgreSQL',
    shortLabel: 'Postgres',
    category: 'database',
    relatedRoles: ['backend-developer', 'data-analyst', 'software-engineer'],
    sitemapPriority: 0.79,
    fresherRelevant: true,
    description:
      'PostgreSQL interview questions on JSONB, CTEs, window functions, and performance tuning for production workloads.',
  },
  {
    slug: 'mongodb',
    label: 'MongoDB',
    shortLabel: 'Mongo',
    category: 'database',
    relatedRoles: ['node-developer', 'full-stack-developer', 'backend-developer'],
    sitemapPriority: 0.80,
    fresherRelevant: true,
    description:
      'MongoDB interview questions on document model, aggregation pipeline, indexing, and schema design for NoSQL applications.',
  },
  {
    slug: 'redis',
    label: 'Redis',
    shortLabel: 'Redis',
    category: 'database',
    relatedRoles: ['backend-developer', 'software-engineer'],
    sitemapPriority: 0.76,
    fresherRelevant: false,
    description:
      'Redis interview questions on data structures, pub/sub, caching patterns, persistence, and use cases at scale.',
  },
  // ── DevOps ─────────────────────────────────────────────────────────────────
  {
    slug: 'docker',
    label: 'Docker',
    shortLabel: 'Docker',
    category: 'devops',
    relatedRoles: ['devops-engineer', 'cloud-engineer', 'backend-developer'],
    sitemapPriority: 0.82,
    fresherRelevant: false,
    description:
      'Docker interview questions on containers, images, Dockerfile, networking, volumes, and Docker Compose for containerised deployments.',
  },
  {
    slug: 'kubernetes',
    label: 'Kubernetes',
    shortLabel: 'K8s',
    category: 'devops',
    relatedRoles: ['devops-engineer', 'cloud-engineer'],
    sitemapPriority: 0.80,
    fresherRelevant: false,
    description:
      'Kubernetes interview questions on pods, deployments, services, config maps, and cluster management for production orchestration.',
  },
  {
    slug: 'git',
    label: 'Git',
    shortLabel: 'Git',
    category: 'devops',
    relatedRoles: ['software-engineer', 'frontend-developer', 'backend-developer'],
    sitemapPriority: 0.82,
    fresherRelevant: true,
    description:
      'Git interview questions on branching strategies, merge vs. rebase, cherry-pick, and resolving conflicts in collaborative workflows.',
  },
  {
    slug: 'linux',
    label: 'Linux',
    shortLabel: 'Linux',
    category: 'devops',
    relatedRoles: ['devops-engineer', 'cloud-engineer', 'backend-developer'],
    sitemapPriority: 0.81,
    fresherRelevant: true,
    description:
      'Linux interview questions on shell commands, file permissions, process management, cron jobs, and networking tools.',
  },
  // ── Cloud ──────────────────────────────────────────────────────────────────
  {
    slug: 'aws',
    label: 'AWS',
    shortLabel: 'AWS',
    category: 'cloud',
    relatedRoles: ['cloud-engineer', 'devops-engineer', 'backend-developer'],
    sitemapPriority: 0.84,
    fresherRelevant: false,
    description:
      'AWS interview questions on EC2, S3, RDS, Lambda, IAM, and core architectural patterns for cloud-native applications.',
  },
  {
    slug: 'azure',
    label: 'Microsoft Azure',
    shortLabel: 'Azure',
    category: 'cloud',
    relatedRoles: ['cloud-engineer', 'devops-engineer'],
    sitemapPriority: 0.79,
    fresherRelevant: false,
    description:
      'Azure interview questions on compute, storage, networking, Active Directory, and DevOps services for Microsoft-stack environments.',
  },
  {
    slug: 'google-cloud',
    label: 'Google Cloud Platform',
    shortLabel: 'GCP',
    category: 'cloud',
    relatedRoles: ['cloud-engineer', 'devops-engineer', 'machine-learning-engineer'],
    sitemapPriority: 0.77,
    fresherRelevant: false,
    description:
      'GCP interview questions on Compute Engine, Cloud Storage, BigQuery, Pub/Sub, and Vertex AI for data and ML workloads.',
  },
  // ── CS Fundamentals ────────────────────────────────────────────────────────
  {
    slug: 'data-structures',
    label: 'Data Structures',
    shortLabel: 'DS',
    category: 'cs-fundamentals',
    relatedRoles: [
      'software-engineer',
      'java-developer',
      'python-developer',
      'backend-developer',
      'machine-learning-engineer',
    ],
    sitemapPriority: 0.88,
    fresherRelevant: true,
    description:
      'Data structures interview questions on arrays, linked lists, trees, graphs, stacks, and queues — mandatory for every engineering role at Indian tech companies.',
  },
  {
    slug: 'algorithms',
    label: 'Algorithms',
    shortLabel: 'Algo',
    category: 'cs-fundamentals',
    relatedRoles: [
      'software-engineer',
      'java-developer',
      'python-developer',
      'machine-learning-engineer',
    ],
    sitemapPriority: 0.87,
    fresherRelevant: true,
    description:
      'Algorithm interview questions on sorting, searching, dynamic programming, greedy approaches, and Big-O complexity analysis.',
  },
  {
    slug: 'oops',
    label: 'Object-Oriented Programming',
    shortLabel: 'OOPs',
    category: 'cs-fundamentals',
    relatedRoles: ['java-developer', 'python-developer', 'software-engineer', 'backend-developer'],
    sitemapPriority: 0.85,
    fresherRelevant: true,
    description:
      'OOPs interview questions on encapsulation, inheritance, polymorphism, abstraction, and design patterns — a core topic at every service company.',
  },
  {
    slug: 'dbms',
    label: 'Database Management Systems',
    shortLabel: 'DBMS',
    category: 'cs-fundamentals',
    relatedRoles: ['data-analyst', 'backend-developer', 'software-engineer', 'business-analyst'],
    sitemapPriority: 0.85,
    fresherRelevant: true,
    description:
      'DBMS interview questions on normalisation, ACID properties, transactions, ER diagrams, and indexing — a must-prepare subject for campus placement.',
  },
  {
    slug: 'operating-systems',
    label: 'Operating Systems',
    shortLabel: 'OS',
    category: 'cs-fundamentals',
    relatedRoles: ['software-engineer', 'devops-engineer', 'backend-developer'],
    sitemapPriority: 0.83,
    fresherRelevant: true,
    description:
      'Operating Systems interview questions on processes, threads, scheduling, memory management, deadlocks, and virtual memory.',
  },
  {
    slug: 'computer-networks',
    label: 'Computer Networks',
    shortLabel: 'CN',
    category: 'cs-fundamentals',
    relatedRoles: ['software-engineer', 'devops-engineer', 'cybersecurity-analyst'],
    sitemapPriority: 0.83,
    fresherRelevant: true,
    description:
      'Computer Networks interview questions on OSI model, TCP/IP, DNS, HTTP/HTTPS, subnetting, and network security fundamentals.',
  },
  {
    slug: 'system-design',
    label: 'System Design',
    shortLabel: 'System Design',
    category: 'cs-fundamentals',
    relatedRoles: ['software-engineer', 'backend-developer', 'full-stack-developer'],
    sitemapPriority: 0.86,
    fresherRelevant: false,
    description:
      'System design interview questions on scalability, load balancing, caching, databases, message queues, and designing real-world systems like WhatsApp or Zomato.',
  },
  {
    slug: 'low-level-design',
    label: 'Low Level Design',
    shortLabel: 'LLD',
    category: 'cs-fundamentals',
    relatedRoles: ['software-engineer', 'backend-developer', 'java-developer'],
    sitemapPriority: 0.82,
    fresherRelevant: false,
    description:
      'Low Level Design (LLD) interview questions on SOLID principles, design patterns, class diagrams, and object modelling for product companies.',
  },
  // ── Data ───────────────────────────────────────────────────────────────────
  {
    slug: 'machine-learning',
    label: 'Machine Learning',
    shortLabel: 'ML',
    category: 'data',
    relatedRoles: ['machine-learning-engineer', 'data-scientist', 'python-developer'],
    sitemapPriority: 0.83,
    fresherRelevant: false,
    description:
      'Machine Learning interview questions on supervised/unsupervised learning, model evaluation, regularisation, and algorithm trade-offs.',
  },
  {
    slug: 'pandas',
    label: 'Pandas',
    shortLabel: 'Pandas',
    category: 'data',
    relatedRoles: ['data-analyst', 'data-scientist', 'python-developer'],
    sitemapPriority: 0.78,
    fresherRelevant: true,
    description:
      'Pandas interview questions on DataFrames, data cleaning, groupby, merging, and time series operations for data analytics roles.',
  },
  // ── Mobile ─────────────────────────────────────────────────────────────────
  {
    slug: 'android',
    label: 'Android Development',
    shortLabel: 'Android',
    category: 'mobile',
    relatedRoles: ['android-developer'],
    sitemapPriority: 0.79,
    fresherRelevant: true,
    description:
      'Android development interview questions on Activity/Fragment lifecycle, Jetpack components, RecyclerView, and Kotlin coroutines.',
  },
  {
    slug: 'ios',
    label: 'iOS Development',
    shortLabel: 'iOS',
    category: 'mobile',
    relatedRoles: ['ios-developer'],
    sitemapPriority: 0.75,
    fresherRelevant: false,
    description:
      'iOS development interview questions on Swift, UIKit vs SwiftUI, ARC memory management, and App Store submission process.',
  },
] as const satisfies readonly SkillDefinition[]

/**
 * Derived union type of all valid skill slugs.
 * Automatically stays in sync with the SKILLS array.
 */
export type SkillSlug = (typeof SKILLS)[number]['slug']

/**
 * Narrowest type for a single skill entry.
 */
export type Skill = (typeof SKILLS)[number]

/** Total number of skills — useful for sitemap capacity planning. */
export const SKILL_COUNT = SKILLS.length as number
