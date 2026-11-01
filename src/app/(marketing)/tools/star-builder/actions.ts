'use server';

import { headers } from 'next/headers';
import { completeFreeToolChatChain, isFreeToolAiConfigured } from '@/lib/ai/tool-chat-completion';
import { checkAndConsumeFreeToolLimit } from '@/lib/security/free-tool-rate-limit';
import {
  clientIpFromHeaders,
  requireFreeToolUser,
  type FreeToolAuthErrorCode,
} from '@/lib/security/free-tool-access';
import { recordFreeToolCompleted } from '@/lib/analytics/free-tool-events';
import { logToolUsage } from '@/lib/telemetry/tool-usage-logger';

export interface StarScores {
  structure: number;
  specificity: number;
  impact: number;
}

export interface StarResult {
  polishedAnswer: string;
  scores: StarScores;
  suggestions: string[];
}

export interface StarState {
  result?: StarResult;
  error?: string;
  code?: FreeToolAuthErrorCode | 'RATE_LIMITED' | 'RATE_LIMIT_UNAVAILABLE';
  /** Shown when the answer was produced by the backup model or after a retry path */
  notice?: string;
}

const MAX_ROLE_LEN = 100;
const MAX_STAR_FIELD_LEN = 2500;
const MIN_STAR_FIELD_LEN = 10;
/** Short answers still get scores/suggestions; too low lets garbage through */
const MIN_POLISHED_LEN = 35;

const OPENROUTER_STAR_MODELS = [
  process.env.OPENROUTER_STAR_MODEL?.trim() || 'openai/gpt-4.1-mini',
];

const FALLBACK_SUGGESTIONS = [
  'Add one concrete metric in Result (%, time, revenue, users, or defect count).',
  'In Action, stress what you personally did — verbs like shipped, debugged, aligned, negotiated.',
  'Keep Situation to 2–3 sentences: who, where, and why it mattered.',
];

function extractJSON(content: string): string {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const balanced = extractBalancedJsonObject(content);
  if (balanced) return balanced;
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start >= 0 && end > start) return content.slice(start, end + 1);
  return content.trim();
}

/** Handles models that wrap JSON in prose or break naive slice on inner `}`. */
function extractBalancedJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (c === '\\' && inString) {
      escape = true;
      continue;
    }
    if (c === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

function clampScore(n: unknown): number {
  if (typeof n === 'number' && Number.isFinite(n)) {
    return Math.min(10, Math.max(1, Math.round(n)));
  }
  if (typeof n === 'string') {
    const x = parseFloat(n.replace(/,/g, ''));
    if (Number.isFinite(x)) return Math.min(10, Math.max(1, Math.round(x)));
  }
  return 5;
}

function pickPolishedAnswer(p: Record<string, unknown>): string | null {
  const keys = [
    'polished_answer',
    'polishedAnswer',
    'answer',
    'interview_answer',
    'star_answer',
    'response',
  ];
  for (const k of keys) {
    const v = p[k];
    if (typeof v === 'string' && v.trim().length > 0) return v.trim();
  }
  return null;
}

function pickSuggestions(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return (raw as unknown[])
      .filter((s): s is string => typeof s === 'string')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[\.)]\s*/, '').replace(/^[-*•]\s*/, '').trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

function buildPrompt(
  targetRole: string,
  level: string,
  domain: string,
  situation: string,
  task: string,
  action: string,
  resultText: string,
): string {
  return `You are an expert career coach helping a candidate nail behavioral interviews.

Target Role: ${targetRole}
Experience Level: ${level}
Domain: ${domain}

The candidate's STAR breakdown:
- Situation: ${situation}
- Task: ${task}
- Action: ${action}
- Result: ${resultText}

Create a polished, natural 150–200 word interview answer that integrates all four STAR elements seamlessly. Make it specific, confident, and results-focused. Adapt the tone to the target role and experience level.

Then score the quality on three dimensions (1–10 integers, where 7+ is genuinely good) and give exactly 2–3 specific, actionable improvement suggestions.

Return ONLY valid JSON:
{
  "polished_answer": "string",
  "scores": {
    "structure": number,
    "specificity": number,
    "impact": number
  },
  "suggestions": ["string", "string"]
}`;
}

type Parsed = Record<string, unknown>;

function normalizeResult(parsed: Parsed): StarResult | null {
  const polished = pickPolishedAnswer(parsed);
  if (!polished || polished.length < MIN_POLISHED_LEN) return null;

  const scoreBlock = parsed.scores;
  const sObj =
    scoreBlock && typeof scoreBlock === 'object' && scoreBlock !== null
      ? (scoreBlock as Record<string, unknown>)
      : {};

  const scores: StarScores = {
    structure: clampScore(sObj.structure ?? parsed.structure),
    specificity: clampScore(sObj.specificity ?? parsed.specificity),
    impact: clampScore(sObj.impact ?? parsed.impact),
  };

  let suggestions = pickSuggestions(parsed.suggestions);

  if (suggestions.length === 0) {
    suggestions = [...FALLBACK_SUGGESTIONS];
  }
  suggestions = suggestions.slice(0, 3);
  let i = 0;
  while (suggestions.length < 2) {
    suggestions.push(FALLBACK_SUGGESTIONS[i % FALLBACK_SUGGESTIONS.length]);
    i++;
  }

  return {
    polishedAnswer: polished,
    scores,
    suggestions,
  };
}

function parseStarPayload(raw: string): StarResult | null {
  const attempts = [raw.trim(), extractJSON(raw)];
  const seen = new Set<string>();
  for (const chunk of attempts) {
    if (!chunk || seen.has(chunk)) continue;
    seen.add(chunk);
    let parsed: Parsed;
    try {
      parsed = JSON.parse(chunk) as Parsed;
    } catch {
      continue;
    }
    const out = normalizeResult(parsed);
    if (out) return out;
  }
  return null;
}

async function completePrimaryStar(prompt: string): Promise<string> {
  if (!isFreeToolAiConfigured()) {
    throw new Error('No OpenRouter key configured — set OPENROUTER_API_KEY');
  }
  const raw = await completeFreeToolChatChain({
    openrouterModels: [...new Set(OPENROUTER_STAR_MODELS.filter(Boolean))],
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    operation: 'star_builder',
  });
  if (!raw.trim()) throw new Error('Empty primary AI content');
  return raw;
}


const OFFLINE_NOTICE =
  'AI is over quota or unavailable — we combined your STAR fields into a speakable draft. Scores are neutral; retry later for AI polish and feedback.';

function buildOfflineStarDraft(
  targetRole: string,
  level: string,
  domain: string,
  situation: string,
  task: string,
  action: string,
  resultText: string,
): StarResult {
  const clean = (s: string) => s.replace(/\s+/g, ' ').trim().replace(/\.$/, '');
  const taskLine = clean(task).replace(/^(to\s+)/i, '');
  const actionLine = clean(action).replace(/^(i\s+)/i, '');
  const polishedAnswer = [
    `I'm targeting ${clean(targetRole)} roles (${clean(level)}, ${clean(domain)}).`,
    `Situation: ${clean(situation)}.`,
    `My responsibility was to ${taskLine}.`,
    `What I did: ${actionLine}.`,
    `Outcome: ${clean(resultText)}.`,
  ].join(' ');

  return {
    polishedAnswer,
    scores: { structure: 5, specificity: 5, impact: 5 },
    suggestions: [
      'Weave these into one flowing story and cut filler so it fits ~90–120 seconds spoken.',
      'Add one number (%, timeline, users, or revenue) in the outcome if you can.',
      'When API quota resets, run again for AI-rewritten wording and real scores.',
    ],
  };
}

export async function buildStarAction(
  _prevState: StarState,
  formData: FormData,
): Promise<StarState> {
  const access = await requireFreeToolUser();
  if (!access.ok) {
    return { error: access.message, code: access.code };
  }

  const situation = (formData.get('situation') as string | null)?.trim() ?? '';
  const task = (formData.get('task') as string | null)?.trim() ?? '';
  const action = (formData.get('action') as string | null)?.trim() ?? '';
  const resultText = (formData.get('result') as string | null)?.trim() ?? '';
  const targetRole = (formData.get('targetRole') as string | null)?.trim() ?? '';
  const level = (formData.get('level') as string | null)?.trim() || 'fresher';
  const domain = (formData.get('domain') as string | null)?.trim() || 'general';

  if (targetRole.length < 2) {
    return { error: 'Please enter your target role (at least 2 characters).' };
  }
  if (targetRole.length > MAX_ROLE_LEN) {
    return { error: `Role must be at most ${MAX_ROLE_LEN} characters.` };
  }

  const fields: { name: string; value: string; label: string }[] = [
    { name: 'situation', value: situation, label: 'Situation' },
    { name: 'task', value: task, label: 'Task' },
    { name: 'action', value: action, label: 'Action' },
    { name: 'result', value: resultText, label: 'Result' },
  ];

  for (const f of fields) {
    if (f.value.length < MIN_STAR_FIELD_LEN) {
      return {
        error: `${f.label} needs at least ${MIN_STAR_FIELD_LEN} characters — add a bit more detail.`,
      };
    }
    if (f.value.length > MAX_STAR_FIELD_LEN) {
      return {
        error: `${f.label} is too long (max ${MAX_STAR_FIELD_LEN} characters). Shorten and try again.`,
      };
    }
  }

  const headersList = await headers();
  const ip = clientIpFromHeaders(headersList);
  const signedIn = true;
  const limited = await checkAndConsumeFreeToolLimit(
    'star-builder',
    { userId: access.userId, ip, tier: access.tier },
    { failClosed: true },
  );
  if (!limited.ok) {
    logToolUsage({ tool: 'star', event: 'rate_limited', signed_in: signedIn });
    return { error: limited.message, code: limited.code };
  }

  const prompt = buildPrompt(targetRole, level, domain, situation, task, action, resultText);

  let notice: string | undefined;
  let result: StarResult | null = null;

  try {
    const raw = await completePrimaryStar(prompt);
    result = parseStarPayload(raw);
    if (!result) {
      console.warn('[star-builder] Primary AI returned unusable JSON');
    }
  } catch (openErr) {
    console.warn('[star-builder] OpenRouter failed:', openErr);
  }

  if (!result) {
    // Covers both failure modes above: completePrimaryStar() throwing and
    // parseStarPayload() returning null for unusable JSON. Either way the
    // user is silently downgraded to the offline draft — without this event
    // a sustained OpenRouter outage is invisible on the founder dashboard.
    logToolUsage({ tool: 'star', event: 'error', signed_in: signedIn });
    result = buildOfflineStarDraft(
      targetRole,
      level,
      domain,
      situation,
      task,
      action,
      resultText,
    );
    notice = OFFLINE_NOTICE;
  } else {
    // Only a real AI polish counts as a run — the offline draft is a degraded
    // fallback, not tool usage we want in cost/usage metrics.
    // cost_usd is null here — per-call cost lands in ai_call_logs (star_builder).
    logToolUsage({ tool: 'star', event: 'run', signed_in: signedIn });
  }
  recordFreeToolCompleted(access.userId, 'star');

  return {
    result,
    ...(notice ? { notice } : {}),
  };
}
