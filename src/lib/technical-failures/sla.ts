export const TECHNICAL_FAILURE_TARGET_HOURS_MIN = 48;
export const TECHNICAL_FAILURE_TARGET_HOURS_MAX = 72;

export function technicalFailureResolutionHours(
  submittedAt: string,
  resolvedAt: string | null,
): number | null {
  if (!resolvedAt) return null;
  const submitted = Date.parse(submittedAt);
  const resolved = Date.parse(resolvedAt);
  if (!Number.isFinite(submitted) || !Number.isFinite(resolved) || resolved < submitted) {
    return null;
  }
  return (resolved - submitted) / 3_600_000;
}

export function exceededTechnicalFailureTarget(
  submittedAt: string,
  resolvedAt: string | null,
): boolean {
  const hours = technicalFailureResolutionHours(submittedAt, resolvedAt);
  return hours !== null && hours > TECHNICAL_FAILURE_TARGET_HOURS_MAX;
}
