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

/** UTC instant corresponding to 00:00:00 IST on `date`'s IST calendar day — for "today" DB filters. */
export function istDayStartUtcIso(date: Date = new Date()): string {
  return new Date(`${istCalendarDateKey(date)}T00:00:00+05:30`).toISOString();
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

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

/** `D MMM YYYY, h:mm A` in IST — e.g. `8 Jul 2026, 2:34 PM`. Returns em dash when invalid. */
export function formatDateTimeEnIn(iso: string | null | undefined): string {
  const value = parseValidDate(iso);
  if (!value) return '—';
  const parts = dateTimeFormatter.formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const dayPeriod = get('dayPeriod').toUpperCase();
  return `${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} ${dayPeriod}`;
}

/** Interview list label with time — e.g. `6 Apr 2026, 2:34 PM` in IST. */
export function formatInterviewDateTimeEnIn(
  startedAt: string | null | undefined,
  completedAt: string | null | undefined,
): string {
  return formatDateTimeEnIn(resolveInterviewDisplayIso(startedAt, completedAt));
}
