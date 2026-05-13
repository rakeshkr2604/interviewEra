/**
 * Structured logger for the retention module.
 *
 * Matches the existing convention in this repo (`[namespace] message`, see
 * src/lib/openai/client.ts, src/lib/redis/question-cache.ts) but enriches it
 * with a JSON-serialized payload so events are greppable in Vercel logs.
 *
 * Why not a third-party logger: this repo already has no logging library;
 * adding one for one module is overkill. Vercel ingests stdout/stderr and
 * indexes the `[retention]` prefix fine.
 */

const NS = '[retention]';

type LogPayload = Record<string, unknown>;

function safeStringify(payload: LogPayload | undefined): string {
  if (!payload) return '';
  try {
    return JSON.stringify(payload);
  } catch {
    // Circular refs / BigInts shouldn't happen here, but never let the logger throw.
    return '{"_logger_serialize_error":true}';
  }
}

function emit(
  level: 'info' | 'warn' | 'error',
  event: string,
  payload?: LogPayload,
): void {
  const line = `${NS} ${event} ${safeStringify(payload)}`.trimEnd();
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info(event: string, payload?: LogPayload): void {
    emit('info', event, payload);
  },
  warn(event: string, payload?: LogPayload): void {
    emit('warn', event, payload);
  },
  error(event: string, payload?: LogPayload): void {
    emit('error', event, payload);
  },
};

export type Logger = typeof logger;
