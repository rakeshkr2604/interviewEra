/**
 * OpenRouter embeddings for ATS JD match — embeddings-only path.
 * Reuses OPENROUTER_API_KEY (no second LLM provider).
 */

import { createOpenRouterClient } from '@/lib/openrouter/client';
import { logAICall } from '@/lib/telemetry/ai-logger';

export const OPENROUTER_EMBEDDING_MODEL =
  process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || 'openai/text-embedding-3-small';

export interface EmbedUsage {
  prompt_tokens?: number;
  total_tokens?: number;
  cost?: number;
}

export interface EmbedBatchResult {
  vectors: number[][];
  model: string;
  usage?: EmbedUsage;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Max cosine of `query` against any vector in `pool`.
 */
export function maxCosine(query: number[], pool: number[][]): number {
  if (pool.length === 0) return 0;
  let best = -1;
  for (const v of pool) {
    const s = cosineSimilarity(query, v);
    if (s > best) best = s;
  }
  return Math.max(0, best);
}

/**
 * Mean of per-item max-similarity from `from` → `to` (asymmetric coverage).
 */
export function meanMaxCoverage(from: number[][], to: number[][]): number {
  if (from.length === 0) return 1;
  if (to.length === 0) return 0;
  let sum = 0;
  for (const q of from) {
    sum += maxCosine(q, to);
  }
  return sum / from.length;
}

/** Embed one or more texts via OpenRouter. Empty inputs return empty vectors. */
export async function embedTexts(texts: string[]): Promise<EmbedBatchResult> {
  const cleaned = texts.map((t) => t.trim()).filter((t) => t.length > 0);
  if (cleaned.length === 0) {
    return { vectors: [], model: OPENROUTER_EMBEDDING_MODEL };
  }

  const client = createOpenRouterClient();
  if (!client) {
    throw new Error('[ats-embeddings] OPENROUTER_API_KEY missing');
  }

  const t0 = Date.now();
  let res: Awaited<ReturnType<typeof client.embeddings.create>>;
  try {
    res = await client.embeddings.create({
      model: OPENROUTER_EMBEDDING_MODEL,
      input: cleaned,
    });
  } catch (err) {
    void logAICall({
      operation: 'ats_embedding',
      provider: 'openrouter',
      model: OPENROUTER_EMBEDDING_MODEL,
      latency_ms: Date.now() - t0,
      success: false,
      error_category: 'http_error',
    });
    throw err;
  }

  const vectors = res.data
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding as number[]);

  const usageRaw = res.usage as
    | { prompt_tokens?: number; total_tokens?: number; cost?: number }
    | undefined;

  // If OpenRouter reports actual cost, use it; otherwise logAICall derives
  // cost from the approximate embedding rate in cost-engine LLM_RATES.
  void logAICall({
    operation: 'ats_embedding',
    provider: 'openrouter',
    model: OPENROUTER_EMBEDDING_MODEL,
    input_tokens: usageRaw?.total_tokens ?? usageRaw?.prompt_tokens,
    output_tokens: 0,
    cost_usd: typeof usageRaw?.cost === 'number' ? usageRaw.cost : undefined,
    latency_ms: Date.now() - t0,
    success: true,
  });

  return {
    vectors,
    model: OPENROUTER_EMBEDDING_MODEL,
    usage: usageRaw
      ? {
          prompt_tokens: usageRaw.prompt_tokens,
          total_tokens: usageRaw.total_tokens,
          cost: typeof usageRaw.cost === 'number' ? usageRaw.cost : undefined,
        }
      : undefined,
  };
}
