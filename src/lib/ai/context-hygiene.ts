/**
 * Context-hygiene utilities — bound prompt-side payloads.
 *
 * Resumes can be 50KB, JDs can be 30KB, candidate answers can be unbounded.
 * Without explicit clamping, the prompt grows to the size of user input and
 * blows the model context window (and burns tokens).
 *
 * All helpers are pure and deterministic. They prefer word-boundary cuts so
 * a truncated payload still reads as natural language to the model.
 *
 * Truncation policy:
 *   - Long fields get a visible `...[truncated]` marker so the model knows
 *     the input was cut (it can decline to invent missing fields rather than
 *     hallucinate them).
 *   - History windows trim from the FRONT (oldest turns first) — the latest
 *     turns are always preserved.
 */

import {
  getContextLimits,
  type AiOperation,
  type ContextLimits,
} from '@/lib/ai/operation-registry';

/** Visible marker so the model can detect a truncated payload. */
const TRUNCATION_MARKER = '\n\n...[truncated]';

// ── Single-field clamping ─────────────────────────────────────────────────────

/**
 * Clamp a text field to maxChars, preferring a word boundary cut.
 * Appends a visible truncation marker so the LLM knows content was removed.
 *
 * Returns the input unchanged when already within the cap.
 */
export function clampText(text: string, maxChars: number): string {
  if (typeof text !== 'string') return '';
  if (text.length <= maxChars) return text;

  // Cut at the last whitespace within the budget so the model doesn't see a
  // word sliced mid-character. Fall back to a hard cut if no whitespace exists.
  const budget = Math.max(0, maxChars - TRUNCATION_MARKER.length);
  const window = text.slice(0, budget);
  const lastSpace = window.lastIndexOf(' ');
  const cut = lastSpace > budget * 0.9 ? window.slice(0, lastSpace) : window;
  return `${cut}${TRUNCATION_MARKER}`;
}

/** Convenience wrapper that pulls the cap from the operation registry. */
export function clampInputForOperation(text: string, operation: AiOperation): string {
  return clampText(text, getContextLimits(operation).maxInputChars);
}

// ── History windowing ─────────────────────────────────────────────────────────

export interface HistoryTurn {
  /** Speaker label — preserved verbatim in the rendered transcript. */
  speaker: string;
  /** Turn text. Will be clamped to limits.maxHistoryTurnChars. */
  text: string;
}

/**
 * Clamp a multi-turn conversation history to a sliding window.
 *
 * Keeps the LAST `limits.maxHistoryTurns` turns and also clamps each turn's
 * text to `limits.maxHistoryTurnChars` so a single rambling answer cannot
 * dominate the context window.
 *
 * Returns a fresh array — caller's input is not mutated.
 */
export function clampHistory<T extends HistoryTurn>(
  history: readonly T[],
  limits: Pick<ContextLimits, 'maxHistoryTurns' | 'maxHistoryTurnChars'>,
): T[] {
  if (!Array.isArray(history) || history.length === 0) return [];
  if (limits.maxHistoryTurns <= 0) return [];

  const windowed = history.slice(-limits.maxHistoryTurns);
  return windowed.map((turn) => ({
    ...turn,
    text: clampText(turn.text, limits.maxHistoryTurnChars),
  }));
}

/** Convenience wrapper using an operation's registered context limits. */
export function clampHistoryForOperation<T extends HistoryTurn>(
  history: readonly T[],
  operation: AiOperation,
): T[] {
  return clampHistory(history, getContextLimits(operation));
}

// ── Transcript rendering ──────────────────────────────────────────────────────

/**
 * Render a clamped history as a transcript block for prompt injection.
 * Pass the result of clampHistory(...) — no further clamping happens here.
 */
export function renderTranscript(history: readonly HistoryTurn[]): string {
  if (history.length === 0) return '(start of conversation)';
  return history.map((t) => `${t.speaker}: ${t.text}`).join('\n');
}

// ── Compact summarization ─────────────────────────────────────────────────────

/**
 * Compact a long text into a short snippet for trend / metadata blocks.
 * Strips repeated whitespace, then clamps with a marker. Useful for surfacing
 * "previous analysis was X" without re-injecting the full prior answer.
 */
export function summarizeSnippet(text: string, maxChars = 240): string {
  const normalized = (text ?? '').replace(/\s+/g, ' ').trim();
  return clampText(normalized, maxChars);
}

// ── System-message dedup ──────────────────────────────────────────────────────

interface MinimalMessage {
  role: string;
  content: string | unknown;
}

/**
 * Remove consecutive identical system messages.
 *
 * Some flows compose prompts from multiple modules that each add a "you are
 * an interviewer" header — the duplicated tokens add no value to the model
 * and inflate input cost. This dedupe is conservative: only DIRECTLY adjacent
 * exact-match system messages collapse.
 */
export function dedupeSystemInstructions<T extends MinimalMessage>(messages: T[]): T[] {
  const out: T[] = [];
  for (const msg of messages) {
    const prev = out[out.length - 1];
    const isDup =
      prev &&
      prev.role === 'system' &&
      msg.role === 'system' &&
      typeof prev.content === 'string' &&
      typeof msg.content === 'string' &&
      prev.content === msg.content;
    if (!isDup) out.push(msg);
  }
  return out;
}
