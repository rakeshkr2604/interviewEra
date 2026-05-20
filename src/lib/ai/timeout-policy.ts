/**
 * Per-operation latency budgets.
 *
 * The per-attempt timeout in chat-completion-core.ts guards individual LLM calls.
 * This layer adds an outer operation-level deadline so a slow retry cascade
 * cannot consume the entire serverless function budget.
 */

export type TimeoutOperation =
  | 'followup_generation'
  | 'answer_evaluation'
  | 'question_generation'
  | 'resume_parse'
  | 'report_generation';

/** Hard deadline per full operation (all retries included). */
const OPERATION_TIMEOUTS_MS: Record<TimeoutOperation, number> = {
  followup_generation:   8_000,
  answer_evaluation:    12_000,
  question_generation:  18_000,
  resume_parse:         12_000,
  report_generation:    20_000,
};

/** Per-attempt abort timeout (chat-completion-core.ts uses this constant). */
export const PER_ATTEMPT_TIMEOUT_MS = 10_000;

/**
 * Returns an AbortController wired to the operation's hard deadline.
 * Use the returned `clear` to cancel the timer when the operation finishes.
 */
export function createOperationController(operation: TimeoutOperation): {
  controller: AbortController;
  clear: () => void;
} {
  const controller = new AbortController();
  const ms = OPERATION_TIMEOUTS_MS[operation];
  const timer = setTimeout(() => {
    console.warn(
      `[timeout-policy] Operation "${operation}" exceeded ${ms}ms hard deadline — aborting`,
    );
    controller.abort();
  }, ms);
  return { controller, clear: () => clearTimeout(timer) };
}

/**
 * Wraps a promise with the operation's hard deadline using Promise.race.
 * Rejects with a descriptive error if the deadline fires before fn resolves.
 * Use this when threading an AbortController signal is impractical.
 */
export async function withOperationDeadline<T>(
  operation: TimeoutOperation,
  fn: () => Promise<T>,
): Promise<T> {
  const ms = OPERATION_TIMEOUTS_MS[operation];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new Error(
          `[timeout-policy] Operation "${operation}" exceeded ${ms}ms hard deadline`,
        ),
      );
    }, ms);
  });

  try {
    return await Promise.race([fn(), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
