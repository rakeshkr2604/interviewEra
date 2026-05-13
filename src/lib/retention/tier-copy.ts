/** Human-readable tier names for dashboards + celebration modal. */

export function getTierPublicLabel(currentTier: number): string {
  switch (Math.min(4, Math.max(1, Math.round(currentTier)))) {
    case 1:
      return 'Fundamentals';
    case 2:
      return 'Advanced questions';
    case 3:
      return 'Company patterns';
    case 4:
    default:
      return 'Mock panel mode';
  }
}
