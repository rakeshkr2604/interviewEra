/**
 * Regression fixtures from the 2026-08-13 localhost script-interview review.
 * Transcripts preserve STT artifacts. Used by unit contracts and the golden set.
 */

import type { DimensionKey, QuestionType } from './rubric';

export type SemanticStructureFixture = {
  id: string;
  questionType: QuestionType;
  question: string;
  transcript: string;
  /** Inclusive expected overall range if scored live. */
  expectedOverall: [number, number];
  expectDim?: Partial<Record<DimensionKey, { min?: number; max?: number }>>;
};

const STAR_LABEL = /\b(situation|task|action|result)\b/i;

export const Q1_STACK_HEAP: SemanticStructureFixture = {
  id: 'manual-q1-stack-heap',
  questionType: 'technical',
  question:
    'What are the main differences between stack and heap memory? When does each get exhausted?',
  transcript:
    'The main difference is how memory is managed and how long the data needs to live. The stack stores function, call frames, and local variable It is automatically allocated and released as function execute the heap stores dynamically allocated project whose lifetime can be more flexible or, for example, objects created with new in Java. Stack memory is fast but limited so deep or infinite recursion can cause stack overflow, heap memory is larger, and dynamically managed but continuously allocating or retaining objects can cause heap exjudation or an out of memory error. In practice, stack methods for call depth and local execution style while heap matter for dynamically allocated data and object lifetime. Okay.',
  expectedOverall: [5.5, 8.5],
  expectDim: {
    relevance: { min: 7 },
    content_accuracy: { min: 6 },
    // Optional extras (primitives, arrays) must not force a fail.
    specificity: { min: 4, max: 8 },
  },
};

export const Q2_DEADLINE_SEMANTIC_STAR: SemanticStructureFixture = {
  id: 'manual-q2-deadline-semantic-star',
  questionType: 'behavioral',
  question:
    "Tell me about a time you had to deliver something under a tight deadline when you didn't have all the information you needed. What did you do and what was the outcome?",
  transcript:
    'During my eight years, at ATS Resume Checker project, I had to build the analysis flow while the exact expectation around ATS scoring and feedback were not fully defined. I needed to deliver a useful MVP without waiting for complete requirement I identify the core functionality that was clear. Support PDF, docs, and text extract structured resume field and evaluate the resume across field extraction, structure, and JDMATCH. I kept the store scoring logic modular, so uncertain requirements could be changed without rewriting the parser. I delivered a function a t functional ATS checker with explainable scoring and ranked improvement suggestion The key lesson was to separate confirmed requirement from assumption, prioritize the highest value functionality, and keep uncertain areas flexible.',
  expectedOverall: [6.5, 9.5],
  expectDim: {
    relevance: { min: 7 },
    structure: { min: 6 },
  },
};

/** Same semantic STAR as Q2, different sentence formation, still no STAR labels. */
export const Q2_DEADLINE_PARAPHRASE: SemanticStructureFixture = {
  id: 'manual-q2-deadline-paraphrase',
  questionType: 'behavioral',
  question: Q2_DEADLINE_SEMANTIC_STAR.question,
  transcript:
    'On the ATS Resume Checker, scoring rules were still open when I had to ship. The job was a usable MVP, not a complete spec. I locked the confirmed parts — PDF, docs, text extraction, structured fields, JD match — and kept scoring modular so later changes would not rewrite the parser. That shipped a working checker with explainable scores and ranked suggestions, and I learned to split confirmed requirements from assumptions.',
  expectedOverall: [6.5, 9.5],
  expectDim: {
    relevance: { min: 7 },
    structure: { min: 6 },
  },
};

export const Q3_NO_DISAGREEMENT_PIVOT: SemanticStructureFixture = {
  id: 'manual-q3-no-disagreement-pivot',
  questionType: 'behavioral',
  question:
    'Tell me about a time you disagreed with a technical decision made by a teammate, mentor, or lead. How did you handle it, and what was the result?',
  transcript:
    "I don't have a documented example of disagreement with a teammate or mentor because I built the ATS Resume Checker project independently. The main technical decision was how the ATS score should be designed — whether to provide just a score or make the analysis explainable. I chose an explainable approach. I separated the analysis into passability, field extraction, structure, and JD match, and used normalized skill coverage plus semantic relevance for job matching. I also provided ranked improvement suggestions. The checker produced actionable feedback instead of an opaque score. The broader lesson was to make technical decisions based on user value, accuracy, and explainability rather than adding complexity without a clear benefit.",
  expectedOverall: [3.5, 7],
  expectDim: {
    // Missing the asked interpersonal-disagreement competency.
    relevance: { max: 4 },
    // Pivot still has context → decision → approach → lesson.
    structure: { min: 5 },
    communication_clarity: { min: 5 },
  },
};

export const Q4_REST_GRAPHQL: SemanticStructureFixture = {
  id: 'manual-q4-rest-graphql',
  questionType: 'technical',
  question:
    'What are the main differences between REST and GraphQL APIs? In which scenarios would you choose one over the other?',
  transcript:
    'With raised complex screens may require multiple endpoints and can cause over fetching or under fetching. GraphQL solves this by letting the client request specific field and relationships in one query. I had choose rest when the API is straightforward resources map naturally to endpoints and simplicity. Caching, and HTTP semantic are priorities. I had choose GraphQL when client have varying data requirements or the application need to fetch deeply related data efficiently. REST is generally simpler to implement, monitor, cache, and secure GraphQL provides more flexible data fetching but adds complexity and schema management. Query cost, caching, and authorization. For a typical CRUD back end, I had start with REST. I had choose GraphQL when flexible client driven data fetch provides enough value to justify the additional complexity.',
  expectedOverall: [6, 9],
  expectDim: {
    relevance: { min: 8 },
    content_accuracy: { min: 6 },
    // GET/POST/PUT/DELETE are optional extras, not a fail.
    specificity: { min: 4, max: 8 },
  },
};

/** Behavioral answer with a genuine missing Result (no outcome / lesson). */
export const BEH_MISSING_RESULT: SemanticStructureFixture = {
  id: 'beh-missing-result',
  questionType: 'behavioral',
  question: 'Tell me about a time you had to deliver under a tight deadline.',
  transcript:
    'Last semester our placement portal had to go live before the career fair and requirements were still changing. I owned the student dashboard. I froze the confirmed screens, built the upload flow in Next.js, and left the scoring module behind a flag so we could swap it later.',
  expectedOverall: [4, 8],
  expectDim: {
    relevance: { min: 6 },
    // Context + task + action present; result absent → structure not a 10, not a 0.
    structure: { min: 3, max: 7 },
  },
};

export const MANUAL_REVIEW_FIXTURES: SemanticStructureFixture[] = [
  Q1_STACK_HEAP,
  Q2_DEADLINE_SEMANTIC_STAR,
  Q2_DEADLINE_PARAPHRASE,
  Q3_NO_DISAGREEMENT_PIVOT,
  Q4_REST_GRAPHQL,
  BEH_MISSING_RESULT,
];

export function transcriptHasLiteralStarLabels(transcript: string): boolean {
  return STAR_LABEL.test(transcript);
}

export const OPTIONAL_TECHNICAL_EXTRAS = [
  'primitive types',
  'GET, POST, PUT, DELETE',
  'garbage collection',
  'N+1',
] as const;
