/** PostgREST `.in()` stays bounded — never send an unbounded UUID list. */
export const IN_FILTER_CHUNK = 100

export function chunkIds<T>(ids: readonly T[], size = IN_FILTER_CHUNK): T[][] {
  const chunkSize = Number.isFinite(size) && size > 0 ? Math.trunc(size) : IN_FILTER_CHUNK
  const out: T[][] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    out.push(ids.slice(i, i + chunkSize) as T[])
  }
  return out
}
