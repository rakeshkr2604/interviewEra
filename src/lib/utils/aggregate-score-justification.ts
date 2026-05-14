import type { ScoreJustification } from '@/types/app.types';

function dedupeLines(lines: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of lines) {
    const s = typeof raw === 'string' ? raw.trim() : '';
    if (!s) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function pairFromPool(pool: string[], fallback: string): [string, string] {
  const u = dedupeLines(pool, 4);
  const a = u[0] ?? fallback;
  const b = u[1] ?? u[0] ?? fallback;
  return [a, b];
}

/**
 * Combine per-answer justifications for the interview-level score card / PDF summary.
 */
export function aggregateScoreJustifications(
  items: readonly ScoreJustification[],
): ScoreJustification | null {
  const clean = items.filter(
    (j) => j && typeof j.why_this_score === 'string' && j.why_this_score.trim(),
  );
  if (clean.length === 0) return null;

  if (clean.length === 1) {
    return clean[0];
  }

  const [s1, s2] = pairFromPool(
    clean.flatMap((j) => j.key_strengths ?? []),
    'Several answers showed relevance and clarity when addressing the prompts.',
  );
  const [i1, i2] = pairFromPool(
    clean.flatMap((j) => j.improvement_areas ?? []),
    'Bring the same rigor across every answer for a steadier composite score.',
  );

  const why_this_score = [
    `This overall score blends ${clean.length} scored answers.`,
    'Highlights came through on some prompts while others dragged the composite—see each question below for specifics.',
    clean[0] ? clean[0].why_this_score.trim() : '',
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    why_this_score,
    key_strengths: [s1, s2],
    improvement_areas: [i1, i2],
  };
}
