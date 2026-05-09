/** Start of current calendar month in Asia/Kolkata as ISO string for Supabase filters. */
export function creditsMonthStartIsoIst(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  if (!y || !m) return '1970-01-01T00:00:00+05:30'
  return `${y}-${m}-01T00:00:00+05:30`
}
