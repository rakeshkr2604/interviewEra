import { describe, expect, it } from 'vitest';
import {
  exceededTechnicalFailureTarget,
  technicalFailureResolutionHours,
} from '@/lib/technical-failures/sla';

describe('technical failure SLA calculations', () => {
  const submitted = '2026-08-01T00:00:00.000Z';

  it('measures resolution from persisted timestamps', () => {
    expect(
      technicalFailureResolutionHours(submitted, '2026-08-03T00:00:00.000Z'),
    ).toBe(48);
  });

  it('marks only resolutions beyond 72 hours as late', () => {
    expect(
      exceededTechnicalFailureTarget(submitted, '2026-08-04T00:00:00.000Z'),
    ).toBe(false);
    expect(
      exceededTechnicalFailureTarget(submitted, '2026-08-04T00:00:01.000Z'),
    ).toBe(true);
  });

  it('does not manufacture an SLA result for unresolved or invalid cases', () => {
    expect(technicalFailureResolutionHours(submitted, null)).toBeNull();
    expect(technicalFailureResolutionHours('invalid', submitted)).toBeNull();
    expect(
      technicalFailureResolutionHours(submitted, '2026-07-31T23:59:59.000Z'),
    ).toBeNull();
  });
});
