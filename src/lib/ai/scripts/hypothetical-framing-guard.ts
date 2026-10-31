/**
 * Deterministic, non-blocking detector for behavioral questions that slip
 * into hypothetical/constructed-scenario framing despite the prompt-level
 * ban in SCRIPT_H.md / SCRIPT_M.md ("ABSOLUTE RULES").
 *
 * Why non-blocking: the turn route has no repair-retry loop for question
 * generation (unlike answer-score's one-retry pattern) — the LLM text has
 * already been validated, persisted, and (on the SSE path) may already be
 * mid-speech via early TTS. Throwing here would 422 the candidate mid-turn
 * for a content-quality issue, not a schema violation. Instead this flags
 * the turn for observability (grep `turn_hypothetical_framing_detected`) so
 * prompt drift is visible without breaking the interview.
 *
 * Construct-level, not phrase-level: a literal banned-phrase list was tried
 * first and the model paraphrased around it ("Let's explore a realistic
 * scenario. Imagine you've just deployed...") while keeping the same
 * constructed-scenario meaning. These patterns target the GRAMMATICAL
 * construct (imperative "imagine/picture/suppose" addressed to the
 * candidate, or a scene-setting opener), which is harder to rephrase around
 * than a fixed phrase list.
 */

const HYPOTHETICAL_FRAMING_PATTERNS: RegExp[] = [
  /\bimagine\b[^.?!]{0,40}\b(you|your)\b/i,
  /\bpicture\b[^.?!]{0,15}\b(this|yourself)\b/i,
  /\bsuppose\b[^.?!]{0,30}\byou\b/i,
  /\bhypothetical(ly)?\b/i,
  /let'?s\s+explore\s+a\s+(realistic\s+)?scenario/i,
  /\bconsider\s+a\s+(situation|scenario)\s+where\b/i,
  /\bhere'?s\s+a\s+(situation|scenario)\b/i,
  /\bwhat\s+would\s+you\s+do\s+if\b/i,
  /\bif\s+you\s+(were|had)\s+to\b/i,
  /\bwalk\s+(me\s+)?through\s+how\s+you'?d\s+handle\b/i,
];

/** True when the text sets up a constructed/imagined scenario rather than asking for recall. */
export function isHypotheticalFraming(text: string): boolean {
  if (!text) return false;
  return HYPOTHETICAL_FRAMING_PATTERNS.some((re) => re.test(text));
}

type RewritePair = [RegExp, string];

const REWRITE_RULES: RewritePair[] = [
  [/\bImagine\s+a\s+situation\s+where\s+you\b/gi, 'Tell me about a time you'],
  [/\bImagine\s+(that\s+)?you\b/gi, 'Tell me about a time you'],
  [/\bImagine\b/gi, 'Tell me about a time'],
  [/\bSuppose\s+you\b/gi, 'Tell me about a time you'],
  [/\bSuppose\b/gi, 'Tell me about a time'],
  [/\bPicture\s+(this|yourself)\b/gi, 'Think back to a time'],
  [/\bWhat\s+would\s+you\s+do\s+if\b/gi, 'What did you do when'],
  [/\bIf\s+you\s+were\s+to\b/gi, 'Tell me about a time you had to'],
  [/\bIf\s+you\s+had\s+to\b/gi, 'Tell me about a time you had to'],
  [/Let'?s\s+explore\s+a\s+(realistic\s+)?scenario\.?\s*/gi, ''],
  [/\bConsider\s+a\s+(situation|scenario)\s+where\s+you\b/gi, 'Tell me about a time you'],
  [/\bHere'?s\s+a\s+(situation|scenario)[.:]\s*/gi, ''],
  [/\bWalk\s+(me\s+)?through\s+how\s+you'?d\s+handle\b/gi, 'Walk me through how you handled'],
  [/\bhypothetical(ly)?[.:,]?\s*/gi, ''],
];

/**
 * Rewrites hypothetical framing in a question to recall framing.
 * Returns the rewritten text, or the original if no patterns matched.
 */
export function rewriteHypotheticalToRecall(text: string): string {
  if (!text || !isHypotheticalFraming(text)) return text;
  let result = text;
  for (const [pattern, replacement] of REWRITE_RULES) {
    result = result.replace(pattern, replacement);
  }
  return result.replace(/^\s+/, '').replace(/\s{2,}/g, ' ');
}

/**
 * Logs a structured, grep-able warning when a core, is_question=true,
 * behavioral turn matches hypothetical framing. Never throws — call sites
 * should treat this as fire-and-forget telemetry, not a validation gate.
 */
export function logIfHypotheticalBehavioralFraming(args: {
  interviewId: string;
  turnIndex: number;
  isBehavioral: boolean;
  phase: string;
  isQuestion: boolean;
  speech: string;
  displayQuestion: string | null;
}): void {
  const { interviewId, turnIndex, isBehavioral, phase, isQuestion, speech, displayQuestion } = args;
  if (!isBehavioral || phase !== 'core' || !isQuestion) return;

  const matched = isHypotheticalFraming(speech) || isHypotheticalFraming(displayQuestion ?? '');
  if (!matched) return;

  console.warn(
    JSON.stringify({
      event: 'turn_hypothetical_framing_detected',
      interviewId,
      turnIndex,
      display_question: displayQuestion,
    }),
  );
}

/**
 * If a behavioral core question uses hypothetical framing, rewrites both
 * speech and display_question to recall framing and returns the patched
 * turn. Returns the original turn unchanged if not applicable.
 */
export function rewriteHypotheticalBehavioralTurn<
  T extends {
    phase: string;
    is_question: boolean;
    is_follow_up?: boolean;
    speech: string;
    display_question: string | null;
    question_type?: string | null;
  },
>(turn: T, opts: { isBehavioral: boolean; interviewId: string; turnIndex: number }): T {
  if (!opts.isBehavioral || turn.phase !== 'core' || !turn.is_question) return turn;

  const speechMatch = isHypotheticalFraming(turn.speech);
  const dqMatch = turn.display_question ? isHypotheticalFraming(turn.display_question) : false;
  if (!speechMatch && !dqMatch) return turn;

  console.warn(
    JSON.stringify({
      event: 'turn_hypothetical_framing_rewritten',
      interviewId: opts.interviewId,
      turnIndex: opts.turnIndex,
      original_display_question: turn.display_question,
    }),
  );

  const newDq = turn.display_question ? rewriteHypotheticalToRecall(turn.display_question) : null;
  const newSpeech = rewriteHypotheticalToRecall(turn.speech);

  return { ...turn, speech: newSpeech, display_question: newDq };
}
