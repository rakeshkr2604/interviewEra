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

/** `en-IN` date label pinned to IST so SSR and hydration agree. */
export function formatDateEnIn(
  iso: string,
  options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  },
): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    ...options,
    timeZone: IST_TIMEZONE,
  });
}
