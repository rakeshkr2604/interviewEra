/**
 * Per-operation latency budgets.
 *
 * The per-attempt timeout in chat-completion-core.ts guards individual LLM
 * calls. This layer adds an outer operation-level deadline so a slow retry
 * cascade cannot consume the entire serverless function budget.
 *
 * The canonical values now live in operation-registry.ts. This module keeps
 * its historic exports so existing callers (evaluate-answer, etc.) need no
 * changes.
 */

import {
  getOperationTimeoutMs,
  type AiOperation,
} from '@/lib/ai/operation-registry';

/**
 * Alias kept for back-compat. New code should import AiOperation directly
 * from operation-registry.
 */
export type TimeoutOperation = AiOperation;

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
  const ms = getOperationTimeoutMs(operation);
  const timer = setTimeout(() => {
    console.warn(
      `[timeout-policy] Operation "${operation}" exceeded ${ms}ms hard deadline — aborting`,
    );
    controller.abort();
  }, ms);
  return { controller, clear: () => clearTimeout(timer) };
}

/**
 * Wraps an async operation with the hard deadline from operation-registry.
 *
 * When the deadline fires the function:
 *   1. Aborts the AbortController — terminating all downstream fetches that
 *      received the signal (true cancellation, not just promise rejection).
 *   2. Rejects the returned Promise so the caller gets the timeout error fast.
 *
 * The `fn` callback receives the AbortSignal and should thread it through every
 * provider call, retry, and fallback so they stop immediately on abort rather
 * than running until their own per-attempt timeouts expire.
 *
 * Existing callers that ignore the signal (`async () => { ... }`) continue to
 * work without changes — TypeScript allows functions with fewer parameters to
 * satisfy a `(signal: AbortSignal) => Promise<T>` callback type.
 */
export async function withOperationDeadline<T>(
  operation: TimeoutOperation,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const ms = getOperationTimeoutMs(operation);
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      // Abort FIRST so downstream fetches terminate before the rejection
      // propagates — prevents the orphan execution that caused 46s zombie parses.
      controller.abort();
      reject(
        new Error(
          `[timeout-policy] Operation "${operation}" exceeded ${ms}ms hard deadline`,
        ),
      );
    }, ms);
  });

  try {
    return await Promise.race([fn(controller.signal), deadline]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
