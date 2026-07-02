/**
 * Post-generation deduplication for AI question sets.
 * Catches near-duplicate prompts the model sometimes emits despite instructions.
 */

export type QuestionLike = {
  question_text: string;
  order?: number;
};

function normalizeQuestionText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(text: string): Set<string> {
  const tokens = normalizeQuestionText(text).split(' ').filter((t) => t.length > 2);
  return new Set(tokens);
}

/** Jaccard similarity on word tokens — fast heuristic for near-duplicates. */
export function questionSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DEFAULT_SIMILARITY_THRESHOLD = 0.72;

/**
 * Remove exact and near-duplicate questions while preserving order.
 * Returns the deduped list (may be shorter than input).
 */
export function deduplicateQuestions<T extends QuestionLike>(
  questions: T[],
  similarityThreshold = DEFAULT_SIMILARITY_THRESHOLD,
): T[] {
  const kept: T[] = [];
  const normalized: string[] = [];

  for (const q of questions) {
    const text = q.question_text?.trim() ?? '';
    if (!text) continue;
    const norm = normalizeQuestionText(text);

    let isDuplicate = false;
    for (let i = 0; i < normalized.length; i++) {
      if (normalized[i] === norm) {
        isDuplicate = true;
        break;
      }
      if (questionSimilarity(text, kept[i].question_text) >= similarityThreshold) {
        isDuplicate = true;
        break;
      }
    }

    if (!isDuplicate) {
      kept.push(q);
      normalized.push(norm);
    }
  }

  return kept.map((q, idx) => ({ ...q, order: idx }));
}
