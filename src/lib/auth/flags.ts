/**
 * Auth V2 feature flag — gate behavioral changes until rollout.
 */

export function isAuthV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_V2 === '1';
}
