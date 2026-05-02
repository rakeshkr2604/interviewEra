/**
 * InterviewEra — k6 Load Test
 * Target: /api/interview/answer (most frequent + most expensive endpoint)
 * Goal: p95 < 5s at 500 concurrent users; 1,000 concurrent at full scale
 *
 * Usage:
 *   k6 run --env BASE_URL=https://your-preview.vercel.app \
 *           --env AUTH_TOKEN=your-supabase-jwt \
 *           --env INTERVIEW_ID=uuid \
 *           --env QUESTION_ID=uuid \
 *           load-tests/answer-endpoint.js
 *
 * Install k6: https://k6.io/docs/get-started/installation/
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// ── Custom metrics ────────────────────────────────────────────────────────────
const evaluationLatency = new Trend('evaluation_latency_ms', true);
const rateLimitHits = new Counter('rate_limit_hits');
const aiFailures = new Counter('ai_failures');
const successRate = new Rate('success_rate');

// ── Load profile ──────────────────────────────────────────────────────────────
export const options = {
  scenarios: {
    // Ramp up to 500 VUs over 2 minutes, hold for 5 minutes, ramp down
    ramp_500: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '2m', target: 300 },
        { duration: '2m', target: 500 },
        { duration: '5m', target: 500 }, // hold at 500
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    // SLA from CLAUDE.md: per-answer eval < 3s; report < 5s
    http_req_duration: [
      'p(95)<5000',  // 95th percentile under 5s
      'p(99)<10000', // 99th percentile under 10s
    ],
    evaluation_latency_ms: ['p(95)<5000'],
    success_rate: ['rate>0.95'],      // 95%+ requests succeed
    rate_limit_hits: ['count<1000'],  // fewer than 1000 rate-limit hits
    ai_failures: ['count<500'],       // fewer than 500 AI failures
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || '';
const INTERVIEW_ID = __ENV.INTERVIEW_ID || '';
const QUESTION_ID = __ENV.QUESTION_ID || '';

// Realistic answer texts — rotated to avoid exact-duplicate caching
const SAMPLE_ANSWERS = [
  `I would approach this by first understanding the requirements clearly, then breaking the problem
   into smaller subproblems. I have experience with similar challenges at my internship where I used
   dynamic programming to optimize a recursive solution from O(2^n) to O(n^2).`,

  `In my previous project, we faced a similar scalability issue. I led the team to implement a
   Redis caching layer which reduced database load by 70%. I coordinated daily standups and tracked
   progress in Jira. The key was clear communication and incremental rollout.`,

  `The STAR method: Situation — our API was returning 504s under load. Task — I was assigned to
   diagnose and fix the issue. Action — I added request queuing with Bull and increased connection
   pool size. Result — response time dropped from 8s to under 1s at 200 RPS.`,

  `For system design, I'd start with requirements: 1M DAU, 100ms p99 latency, 99.9% uptime.
   I'd use a CDN for static assets, load balancers with auto-scaling, a primary-replica DB setup,
   and async job queues for heavy processing. Monitoring via Datadog with PagerDuty alerts.`,

  `My strength is adaptability. When our team lost two engineers mid-sprint, I quickly picked up
   their tasks, coordinated with the PM to re-prioritize, and we still delivered on time. I believe
   in transparent communication and taking ownership rather than waiting to be told what to do.`,
];

function getRandomAnswer() {
  return SAMPLE_ANSWERS[Math.floor(Math.random() * SAMPLE_ANSWERS.length)];
}

// ── Main test function ────────────────────────────────────────────────────────

export default function () {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${AUTH_TOKEN}`,
  };

  const payload = JSON.stringify({
    interviewId: INTERVIEW_ID,
    questionId: QUESTION_ID,
    answerText: getRandomAnswer(),
    answerMode: 'text',
  });

  const startTime = Date.now();

  const res = http.post(`${BASE_URL}/api/interview/answer`, payload, {
    headers,
    timeout: '15s',
  });

  const duration = Date.now() - startTime;
  evaluationLatency.add(duration);

  // Track outcomes
  if (res.status === 429) {
    rateLimitHits.add(1);
    successRate.add(false);
  } else if (res.status >= 500) {
    aiFailures.add(1);
    successRate.add(false);
  } else {
    successRate.add(res.status === 200);
  }

  check(res, {
    'status is 200 or 429': (r) => r.status === 200 || r.status === 429,
    'response has score field': (r) => {
      if (r.status !== 200) return true; // skip for non-200
      try {
        const body = JSON.parse(r.body);
        return 'score' in body;
      } catch {
        return false;
      }
    },
    'no 5xx errors': (r) => r.status < 500,
  });

  // Realistic think time between submissions (2–5 seconds)
  sleep(2 + Math.random() * 3);
}

// ── Summary output ────────────────────────────────────────────────────────────

export function handleSummary(data) {
  const p95 = data.metrics.http_req_duration?.values?.['p(95)'] ?? 0;
  const p99 = data.metrics.http_req_duration?.values?.['p(99)'] ?? 0;
  const successRateVal = (data.metrics.success_rate?.values?.rate ?? 0) * 100;

  console.log('\n========== InterviewEra Load Test Results ==========');
  console.log(`p95 latency:    ${p95.toFixed(0)}ms  (target: < 5000ms)`);
  console.log(`p99 latency:    ${p99.toFixed(0)}ms  (target: < 10000ms)`);
  console.log(`Success rate:   ${successRateVal.toFixed(1)}%  (target: > 95%)`);
  console.log(`Rate limit hits: ${data.metrics.rate_limit_hits?.values?.count ?? 0}`);
  console.log(`AI failures:    ${data.metrics.ai_failures?.values?.count ?? 0}`);
  console.log('====================================================\n');

  return {
    'load-tests/results/latest.json': JSON.stringify(data, null, 2),
  };
}
