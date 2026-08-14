/**
 * score-v1 golden-set harness — run BEFORE merging rubric/prompt changes.
 *
 *   npx tsx scripts/answer-score-golden-set.ts [--runs 8] [--concurrency 4]
 *
 * Sends ~20 reference answers (strong / mediocre / wrong-but-confident /
 * off-topic, across behavioral + technical) through the EXACT production
 * prompt builders + validator (single source of truth), N runs each, and
 * reports:
 *   - per-dimension variance (max−min across runs, per sample → mean + worst)
 *   - expected-range hits/misses (overall + per-dimension constraints)
 *   - score_suspect flags
 *
 * Ship gate: ALL FIVE dimensions are gated against the ±1.0 mean-spread
 * target (spread ≤ 2.0). History note: gating only the dimension under
 * active tuning let specificity (round 1) and then relevance/structure
 * (round 2) destabilize unnoticed — hence the full-table gate, plus a
 * trend check against the last runs recorded in
 * scripts/answer-score-golden-set.history.jsonl (a dimension whose mean
 * spread rises two consecutive runs is flagged even while under the gate).
 */

import { config as dotenv } from 'dotenv';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

dotenv({ path: path.resolve(process.cwd(), '.env.local') });
dotenv({ path: path.resolve(process.cwd(), '.env') });

import { completeInterviewChat } from '../src/lib/ai/interview-completion';
import {
  buildAnswerScoreSystemPrompt,
  buildAnswerScoreUserPrompt,
} from '../src/lib/interview/answer-score/prompt';
import {
  ANSWER_SCORE_PROMPT_VERSION,
  subRubricForQuestionType,
  validateAnswerScoreOutput,
  DIMENSION_KEYS,
  type DimensionKey,
  type QuestionType,
} from '../src/lib/interview/answer-score/rubric';
import { MANUAL_REVIEW_FIXTURES } from '../src/lib/interview/answer-score/semantic-structure.fixtures';

type GoldenSample = {
  id: string;
  category: 'strong' | 'mediocre' | 'wrong_confident' | 'off_topic';
  questionType: QuestionType;
  question: string;
  transcript: string;
  /** Inclusive expected overall range. */
  expectedOverall: [number, number];
  /** Optional per-dimension caps/floors. */
  expectDim?: Partial<Record<DimensionKey, { min?: number; max?: number }>>;
};

const TECH_Q_SQL = 'What is the difference between SQL and NoSQL databases, and when would you choose each?';
const TECH_Q_INDEX = 'Explain how a database index speeds up queries and what its trade-offs are.';
const TECH_Q_URL = 'How would you approach designing a URL shortener service?';
const BEH_Q_DEADLINE = 'Tell me about a time you had to deliver under a tight deadline.';
const BEH_Q_CONFLICT = 'Describe a conflict you had with a teammate and how you resolved it.';

const GOLDEN_SET: GoldenSample[] = [
  // ── Technical: SQL vs NoSQL ──
  {
    id: 'tech-strong-1',
    category: 'strong',
    questionType: 'technical',
    question: TECH_Q_SQL,
    transcript:
      'So SQL databases like Postgres store data in tables with a fixed schema and they give you ACID transactions and joins, so when data is relational like users and orders and payments I would pick SQL. NoSQL like MongoDB stores documents with flexible schema and scales horizontally more easily, so for something like storing user activity logs or a product catalog where the shape keeps changing I would pick NoSQL. In my last project we kept payments in Postgres because we needed transactions, but we put session events in Redis because we just needed fast key value reads.',
    expectedOverall: [7, 10],
    expectDim: { content_accuracy: { min: 7 } },
  },
  {
    id: 'tech-mediocre-1',
    category: 'mediocre',
    questionType: 'technical',
    question: TECH_Q_SQL,
    transcript:
      'SQL is like the older one and NoSQL is the newer one. SQL has tables and NoSQL does not have tables, it is more flexible. I think if you want flexibility you use NoSQL and if you want the normal way you use SQL. I have used MySQL in college project.',
    expectedOverall: [2.5, 6.5],
  },
  {
    id: 'tech-wrong-1',
    category: 'wrong_confident',
    questionType: 'technical',
    question: TECH_Q_SQL,
    transcript:
      'This is simple, NoSQL is always faster than SQL in every case, that is the main difference. SQL databases cannot scale at all beyond one machine, that is a hard limit. Also MongoDB actually stores data in tables and you use joins in MongoDB the same way as MySQL, so the query language is basically identical. So I would always choose NoSQL for any serious production system, SQL is only for learning.',
    expectedOverall: [0, 6],
    expectDim: { content_accuracy: { max: 4.5 } },
  },
  {
    id: 'tech-offtopic-1',
    category: 'off_topic',
    questionType: 'technical',
    question: TECH_Q_SQL,
    transcript:
      'Actually I am very passionate about technology since childhood. In my college we had a tech fest and I was the coordinator, I managed a team of ten people and we organized coding competitions. It was a great experience for my leadership skills and I learned a lot about event management.',
    // score-v1.1: accuracy scores the truth of claims made (relevance carries
    // the off-topic penalty), so off-topic-but-true answers land ~3.5–5.
    expectedOverall: [0, 5],
    expectDim: { relevance: { max: 3 } },
  },

  // ── Technical: indexing ──
  {
    id: 'tech-strong-2',
    category: 'strong',
    questionType: 'technical',
    question: TECH_Q_INDEX,
    transcript:
      'An index is basically a separate data structure, usually a B-tree, that keeps the indexed column sorted so the database can binary search to the row instead of scanning the whole table, so a lookup goes from O of n to O of log n roughly. The trade-off is writes get slower because every insert or update also has to update the index, and indexes take extra disk space. In my project we added an index on the orders user_id column and a dashboard query went from around two seconds to under fifty milliseconds, but we were careful not to index every column because the table had heavy writes.',
    expectedOverall: [7, 10],
    expectDim: { content_accuracy: { min: 7 } },
  },
  {
    id: 'tech-mediocre-2',
    category: 'mediocre',
    questionType: 'technical',
    question: TECH_Q_INDEX,
    transcript:
      'Index makes the query fast. It is like the index of a book, you can find the page quickly instead of reading the full book. So database also finds data quickly. Trade-off I am not fully sure but maybe it uses some memory.',
    expectedOverall: [2.5, 6.5],
  },
  {
    id: 'tech-wrong-2',
    category: 'wrong_confident',
    questionType: 'technical',
    question: TECH_Q_INDEX,
    transcript:
      'Indexes speed up everything in the database, reads and writes both get faster, that is the whole point. They take zero extra storage because the index is computed on the fly each time. So the best practice which I always follow is to add an index on every single column of every table, there is no downside, any senior engineer will tell you the same.',
    expectedOverall: [0, 6],
    expectDim: { content_accuracy: { max: 4.5 } },
  },
  {
    id: 'tech-offtopic-2',
    category: 'off_topic',
    questionType: 'technical',
    question: TECH_Q_INDEX,
    transcript:
      'I mostly work on frontend so for me the important thing is the user interface. I really like React and I have made three projects in React, one is a todo app, one is a weather app and one is my portfolio website. I used Tailwind for styling and deployed on Vercel.',
    // score-v1.1: same off-topic recalibration as tech-offtopic-1.
    expectedOverall: [0, 5],
    expectDim: { relevance: { max: 3.5 } },
  },

  // ── Technical: URL shortener case ──
  {
    id: 'tech-strong-3',
    category: 'strong',
    questionType: 'technical',
    question: TECH_Q_URL,
    transcript:
      'First I would clarify the scale, say a hundred million URLs and heavy read traffic, because reads will massively outnumber writes. Core design is a service that takes a long URL, generates a short unique code, maybe base62 of an auto increment id or a hash with collision check, stores the mapping in a database, and on a GET redirects with a 301. For scale I would put a cache like Redis in front because the same popular links get hit repeatedly, and I would shard the database by the short code if writes grow. The main trade-off is between predictable sequential codes which leak volume information versus random codes which need a uniqueness check.',
    expectedOverall: [7, 10],
  },
  {
    id: 'tech-mediocre-3',
    category: 'mediocre',
    questionType: 'technical',
    question: TECH_Q_URL,
    transcript:
      'I would make an API which takes the URL and gives back a short URL. I will store it in a database, maybe MongoDB. When someone opens the short link I will look it up and redirect. I think that should work fine for most cases.',
    expectedOverall: [2.5, 6.5],
    expectDim: { specificity: { max: 6 } },
  },

  // ── Behavioral: deadline ──
  {
    id: 'beh-strong-1',
    category: 'strong',
    questionType: 'behavioral',
    question: BEH_Q_DEADLINE,
    transcript:
      'In my internship last year our team had to ship a payment reconciliation report and the client moved the deadline up by one week. I was responsible for the export module. I sat with my lead the same day, we cut the scope to the two report formats the client actually used, and I broke my work into daily targets. I also wrote the CSV export first because that unblocked the QA team early. We delivered one day before the new deadline and the client used the report in their audit, and my lead specifically called out the early QA handoff in our retro.',
    expectedOverall: [7, 10],
    expectDim: { structure: { min: 6 } },
  },
  {
    id: 'beh-mediocre-1',
    category: 'mediocre',
    questionType: 'behavioral',
    question: BEH_Q_DEADLINE,
    transcript:
      'Yes deadlines are common in projects. One time in college we had a project submission and time was less, so we all worked very hard, like really late nights, and somehow we submitted it on time. It was stressful but we managed it as a team.',
    expectedOverall: [2.5, 6.5],
    expectDim: { specificity: { max: 5.5 } },
  },
  {
    id: 'beh-generic-1',
    category: 'mediocre',
    questionType: 'behavioral',
    question: BEH_Q_DEADLINE,
    transcript:
      'I always deliver under tight deadlines because I am a very hardworking and dedicated person. Time management is one of my biggest strengths. Whenever there is pressure I stay calm and give my best. I believe with the right attitude any deadline can be met.',
    expectedOverall: [0, 5.5],
    expectDim: { specificity: { max: 4 } },
  },
  {
    id: 'beh-offtopic-1',
    category: 'off_topic',
    questionType: 'behavioral',
    question: BEH_Q_DEADLINE,
    transcript:
      'My favorite subject in college was data structures, I scored very well in it. I also enjoy playing cricket on weekends and I am learning German because I want to work in Europe someday.',
    expectedOverall: [0, 4.5],
    expectDim: { relevance: { max: 3 } },
  },

  // ── Behavioral: conflict ──
  {
    id: 'beh-strong-2',
    category: 'strong',
    questionType: 'behavioral',
    question: BEH_Q_CONFLICT,
    transcript:
      'In my final year project my teammate and I disagreed on the database, he wanted MongoDB and I wanted Postgres because our data was relational, marks and students and courses. It got tense because the deadline was close and he felt I was dismissing his work. So I asked for a thirty minute call where we each listed our top three requirements, and it turned out his main concern was setup speed, not the data model. We agreed to use Postgres with a Docker setup I prepared the same evening so setup took him five minutes. We shipped on time and he actually used that Docker setup in his next project too.',
    expectedOverall: [7, 10],
    expectDim: { structure: { min: 6 } },
  },
  {
    id: 'beh-mediocre-2',
    category: 'mediocre',
    questionType: 'behavioral',
    question: BEH_Q_CONFLICT,
    transcript:
      'Once me and my friend had different opinions in a group project. We discussed it and then we solved it. Communication is important so we talked and it was fine after that. We remained good friends.',
    expectedOverall: [2.5, 6.5],
    expectDim: { specificity: { max: 5 } },
  },
  {
    id: 'beh-contradict-1',
    category: 'wrong_confident',
    questionType: 'behavioral',
    question: BEH_Q_CONFLICT,
    transcript:
      'I have honestly never had a single conflict with anyone in my life, everyone always agrees with me because I am always right about technical things. But one time my teammate completely refused to talk to me for two weeks after I rewrote his entire module overnight without telling him, which was the correct decision and I would do it again exactly the same way. So conflict resolution is definitely one of my strongest skills.',
    expectedOverall: [0, 6],
    expectDim: { content_accuracy: { max: 6 } },
  },
  {
    id: 'beh-offtopic-2',
    category: 'off_topic',
    questionType: 'behavioral',
    question: BEH_Q_CONFLICT,
    transcript:
      'Teamwork is very important in the industry. Companies want people who can work in teams. I am a team player and I like working in teams because you can learn from each other and divide the work efficiently.',
    expectedOverall: [0, 5],
    expectDim: { specificity: { max: 4 } },
  },

  // ── Extra: strong behavioral + wrong technical to balance the set ──
  {
    id: 'beh-strong-3',
    category: 'strong',
    questionType: 'behavioral',
    question: 'Tell me about a time you took ownership of a problem nobody else wanted to touch.',
    transcript:
      'In my internship there was a flaky test suite that failed randomly about once in five runs and everyone just kept re-running CI. It was slowing every merge. I asked my manager for two days to investigate it as a side task. I found the failures came from two tests sharing a seeded database row, so they collided when run in parallel. I isolated the fixtures and added a lint rule to prevent shared seeds. CI failure rate went from around twenty percent to under one percent and the team stopped re-running builds, which my manager estimated saved a couple of hours a week across the team.',
    expectedOverall: [7, 10],
  },
  {
    id: 'tech-wrong-3',
    category: 'wrong_confident',
    questionType: 'technical',
    question: 'What is the difference between REST and GraphQL APIs?',
    transcript:
      'GraphQL is just the newer version of REST, it is REST 2.0 basically, made by Google. The main difference is GraphQL only works with graph databases like Neo4j, you cannot use it with Postgres or MySQL at all. Also GraphQL is always faster than REST in every situation because it skips HTTP completely and uses its own protocol. So every company is replacing REST with GraphQL, REST is deprecated now.',
    expectedOverall: [0, 6],
    expectDim: { content_accuracy: { max: 4 } },
  },

  // ── Manual localhost review (2026-08-13): semantic STAR + required vs optional ──
  ...MANUAL_REVIEW_FIXTURES.map((f) => ({
    id: f.id,
    category:
      f.id === 'manual-q3-no-disagreement-pivot'
        ? ('mediocre' as const)
        : f.id === 'beh-missing-result'
          ? ('mediocre' as const)
          : ('strong' as const),
    questionType: f.questionType,
    question: f.question,
    transcript: f.transcript,
    expectedOverall: f.expectedOverall,
    expectDim: f.expectDim,
  })),
];

type RunResult = {
  dims: Record<DimensionKey, number>;
  notes: Record<DimensionKey, string>;
  overall: number;
  suspect: boolean;
  suspectReasons: string[];
};

async function scoreOnce(sample: GoldenSample): Promise<RunResult> {
  const expectedSubRubric = subRubricForQuestionType(sample.questionType);
  const system = buildAnswerScoreSystemPrompt(sample.questionType);
  const user = buildAnswerScoreUserPrompt({
    question: sample.question,
    questionType: sample.questionType,
    targetRole: 'Full Stack Developer',
    transcript: sample.transcript,
  });

  const completion = await completeInterviewChat({
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
    operation: 'answer_score',
    jsonMode: true,
    signal: AbortSignal.timeout(30_000),
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(completion.content);
  } catch {
    const s = completion.content.indexOf('{');
    const e = completion.content.lastIndexOf('}');
    parsed = JSON.parse(completion.content.slice(s, e + 1));
  }

  const result = validateAnswerScoreOutput(parsed, expectedSubRubric);
  if (!result.ok) {
    throw new Error(`validation failed for ${sample.id}: ${result.errors.join('; ')}`);
  }
  const dims = {} as Record<DimensionKey, number>;
  const notes = {} as Record<DimensionKey, string>;
  for (const k of DIMENSION_KEYS) {
    dims[k] = result.value.dimensions[k].score;
    notes[k] = result.value.dimensions[k].note;
  }
  return {
    dims,
    notes,
    overall: result.value.overall,
    suspect: result.value.score_suspect,
    suspectReasons: result.value.suspect_reasons,
  };
}

async function withConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (next < tasks.length) {
      const i = next++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

async function main() {
  const runsArg = process.argv.indexOf('--runs');
  const concArg = process.argv.indexOf('--concurrency');
  // Default n=8: n=3 mean-spread estimates were dominated by sampling noise
  // (0.1–0.4 swings on unchanged code). Override with --runs only for smoke.
  const RUNS = runsArg !== -1 ? Number(process.argv[runsArg + 1]) : 8;
  const CONCURRENCY = concArg !== -1 ? Number(process.argv[concArg + 1]) : 4;

  if (!process.env.OPENROUTER_API_KEY) {
    console.error('OPENROUTER_API_KEY missing — load .env.local');
    process.exit(1);
  }

  console.log(
    `${ANSWER_SCORE_PROMPT_VERSION} golden set: ${GOLDEN_SET.length} samples × ${RUNS} runs (concurrency ${CONCURRENCY})\n`,
  );

  const tasks: Array<() => Promise<{ sampleIdx: number; run: number; result: RunResult | Error }>> = [];
  for (let s = 0; s < GOLDEN_SET.length; s++) {
    for (let r = 0; r < RUNS; r++) {
      tasks.push(async () => {
        try {
          return { sampleIdx: s, run: r, result: await scoreOnce(GOLDEN_SET[s]) };
        } catch (err) {
          return { sampleIdx: s, run: r, result: err as Error };
        }
      });
    }
  }

  const t0 = Date.now();
  const outcomes = await withConcurrency(tasks, CONCURRENCY);
  const elapsed = ((Date.now() - t0) / 1000).toFixed(0);

  // Group per sample
  const bySample = new Map<number, RunResult[]>();
  const failures: string[] = [];
  for (const o of outcomes) {
    if (o.result instanceof Error) {
      failures.push(`${GOLDEN_SET[o.sampleIdx].id} run${o.run + 1}: ${o.result.message}`);
    } else {
      const list = bySample.get(o.sampleIdx) ?? [];
      list.push(o.result);
      bySample.set(o.sampleIdx, list);
    }
  }

  // Per-sample report + range checks
  const spreadPerDim: Record<DimensionKey, number[]> = {
    relevance: [], content_accuracy: [], communication_clarity: [], structure: [], specificity: [],
  };
  let rangeMisses = 0;
  let dimConstraintMisses = 0;
  let suspectCount = 0;

  for (let s = 0; s < GOLDEN_SET.length; s++) {
    const sample = GOLDEN_SET[s];
    const runs = bySample.get(s) ?? [];
    if (runs.length === 0) continue;

    const overalls = runs.map((r) => r.overall);
    const [lo, hi] = sample.expectedOverall;
    const inRange = overalls.every((v) => v >= lo && v <= hi);
    if (!inRange) rangeMisses++;

    const dimSpreads: string[] = [];
    for (const k of DIMENSION_KEYS) {
      const vals = runs.map((r) => r.dims[k]);
      const spread = Math.max(...vals) - Math.min(...vals);
      spreadPerDim[k].push(spread);
      dimSpreads.push(`${k}=${vals.join('/')}`);
    }

    let dimMissNote = '';
    for (const [k, c] of Object.entries(sample.expectDim ?? {})) {
      const vals = runs.map((r) => r.dims[k as DimensionKey]);
      if (c?.max !== undefined && vals.some((v) => v > c.max)) {
        dimConstraintMisses++;
        dimMissNote += ` [MISS ${k}≤${c.max}, got ${vals.join('/')}]`;
      }
      if (c?.min !== undefined && vals.some((v) => v < c.min)) {
        dimConstraintMisses++;
        dimMissNote += ` [MISS ${k}≥${c.min}, got ${vals.join('/')}]`;
      }
    }

    const nSuspect = runs.filter((r) => r.suspect).length;
    suspectCount += nSuspect;
    const suspectDetail = nSuspect
      ? ` suspect×${nSuspect} [${[...new Set(runs.flatMap((r) => r.suspectReasons))].join(', ')}]`
      : '';

    console.log(
      `${inRange ? 'PASS' : 'MISS'} ${sample.id.padEnd(18)} (${sample.category.padEnd(14)}) overall=${overalls.map((v) => v.toFixed(1)).join('/')} expected=[${lo},${hi}]${dimMissNote}${suspectDetail}`,
    );
    console.log(`     ${dimSpreads.join('  ')}`);
    // Print the offending note for each suspect run so flags can be triaged
    // as genuine drift vs heuristic false positive without a re-run.
    for (const r of runs) {
      for (const reason of r.suspectReasons) {
        const dim = reason.split(':')[1] as DimensionKey | undefined;
        if (dim && DIMENSION_KEYS.includes(dim)) {
          console.log(`       ↳ ${reason} (score ${r.dims[dim]}): "${r.notes[dim]}"`);
        }
      }
    }
  }

  console.log('\n── Per-dimension variance (max−min across runs, per sample) ──');
  console.log('   (all 5 dimensions gated against ±1.0 target, i.e. mean spread ≤ 2.0)');
  const HISTORY_PATH = path.resolve(process.cwd(), 'scripts/answer-score-golden-set.history.jsonl');
  type HistoryEntry = {
    at: string;
    promptVersion: string;
    runs: number;
    means: Record<DimensionKey, number>;
    worsts: Record<DimensionKey, number>;
    /** When true, prior n=3 rows must not be used for trend comparison. */
    baselineReset?: boolean;
    note?: string;
  };
  let history: HistoryEntry[] = [];
  if (existsSync(HISTORY_PATH)) {
    history = readFileSync(HISTORY_PATH, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as HistoryEntry);
  }

  // Trend comparisons only against entries with the SAME run count — mixing
  // n=3 and n=8 mean-spreads is not meaningful (n=3 was measurement noise).
  const comparableHistory = history.filter((h) => h.runs === RUNS && !h.baselineReset);

  const means = {} as Record<DimensionKey, number>;
  const worsts = {} as Record<DimensionKey, number>;
  let gateFailures = 0;
  for (const k of DIMENSION_KEYS) {
    const spreads = spreadPerDim[k];
    const mean = spreads.reduce((a, b) => a + b, 0) / Math.max(1, spreads.length);
    const worst = Math.max(0, ...spreads);
    means[k] = Number(mean.toFixed(2));
    worsts[k] = worst;

    const gatePass = mean <= 2.0;
    if (!gatePass) gateFailures++;

    // Trend check: mean spread rising two consecutive same-n runs → flag even
    // while under the gate (this is exactly how structure drifted 0.25 → 0.45).
    const prior = comparableHistory.slice(-2).map((h) => h.means[k]).filter((v) => v !== undefined);
    const trendingUp =
      prior.length === 2 && prior[1] > prior[0] && mean > prior[1];

    const flags = [
      gatePass ? 'PASS' : 'FAIL ⚠ EXCEEDS ±1.0 TARGET',
      trendingUp ? `⚠ TRENDING UP (${prior[0].toFixed(2)} → ${prior[1].toFixed(2)} → ${mean.toFixed(2)})` : '',
    ].filter(Boolean).join('  ');
    console.log(`${k.padEnd(24)} mean spread=${mean.toFixed(2)}  worst=${worst.toFixed(1)}  ${flags}`);
  }

  // Mark the first n=8 entry as a baseline reset so future trend checks don't
  // compare against the noisy n=3 history that preceded it.
  const isFirstN8Baseline = !history.some((h) => h.runs === RUNS && h.baselineReset);
  appendFileSync(
    HISTORY_PATH,
    JSON.stringify({
      at: new Date().toISOString(),
      promptVersion: ANSWER_SCORE_PROMPT_VERSION,
      runs: RUNS,
      means,
      worsts,
      ...(isFirstN8Baseline && RUNS >= 8
        ? {
            baselineReset: true,
            note: 'Baseline sample-size raised 3→8; do not trend-compare against prior n=3 rows',
          }
        : {}),
    } satisfies HistoryEntry) + '\n',
  );
  if (gateFailures > 0) process.exitCode = 1;

  const totalRuns = outcomes.length - failures.length;
  const flagRate = totalRuns > 0 ? ((suspectCount / totalRuns) * 100).toFixed(1) : 'n/a';
  console.log(
    `\nSummary: ${GOLDEN_SET.length - rangeMisses}/${GOLDEN_SET.length} samples in expected overall range · ${dimConstraintMisses} dim-constraint misses · ${suspectCount} suspect flags (${flagRate}% of ${totalRuns} runs) · ${failures.length} call failures · ${elapsed}s`,
  );
  if (failures.length) {
    console.log('Failures:');
    for (const f of failures) console.log(`  ${f}`);
  }
}

void main();
