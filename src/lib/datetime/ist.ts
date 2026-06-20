/** India-facing display timezone — stable across SSR (UTC) and client (local). */
export const IST_TIMEZONE = 'Asia/Kolkata';

const calendarDateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: IST_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Calendar date as `YYYY-MM-DD` in IST. */
export function istCalendarDateKey(date: Date | string): string {
  const value = typeof date === 'string' ? new Date(date) : date;
  return calendarDateKeyFormatter.format(value);
}

/** Whole IST calendar days from `from` until `targetIso` (placement-style countdown). */
export function daysUntilIstCalendarDate(
  targetIso: string,
  from: Date = new Date(),
): number {
  const todayKey = istCalendarDateKey(from);
  const targetKey = istCalendarDateKey(targetIso);
  const todayMs = Date.parse(`${todayKey}T12:00:00Z`);
  const targetMs = Date.parse(`${targetKey}T12:00:00Z`);
  return Math.ceil((targetMs - todayMs) / (1000 * 60 * 60 * 24));
}

const defaultDateOptions: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
};

function parseValidDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const value = new Date(iso);
  if (Number.isNaN(value.getTime()) || value.getTime() <= 0) return null;
  return value;
}

/** Prefer session start; fall back to completion for legacy rows missing `started_at`. */
export function resolveInterviewDisplayIso(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string | null {
  return parseValidDate(startedAt)?.toISOString() ?? parseValidDate(completedAt)?.toISOString() ?? null;
}

/** `en-IN` date label pinned to IST so SSR and hydration agree. Returns em dash when invalid. */
export function formatDateEnIn(
  iso: string | null | undefined,
  options: Intl.DateTimeFormatOptions = defaultDateOptions,
): string {
  const value = parseValidDate(iso);
  if (!value) return '—';
  return value.toLocaleDateString('en-IN', {
    ...options,
    timeZone: IST_TIMEZONE,
  });
}

/** Interview list label — e.g. `6 Apr 2026` in IST. */
export function formatInterviewDateEnIn(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string {
  return formatDateEnIn(resolveInterviewDisplayIso(startedAt, completedAt));
}
