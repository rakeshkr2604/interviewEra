/**
 * Preview/staging should not be indexed; production marketing stays crawlable.
 * `VERCEL_ENV` is unset on typical local runs — then we keep production-style rules.
 */
export function isFullSiteCrawlBlocked(): boolean {
  if (process.env.BLOCK_SEARCH_INDEXING === 'true') return true;
  const vercelEnv = process.env.VERCEL_ENV;
  return vercelEnv !== undefined && vercelEnv !== 'production';
}
