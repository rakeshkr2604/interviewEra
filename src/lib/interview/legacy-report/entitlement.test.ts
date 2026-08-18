import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { canSeeScriptReportDetails } from '@/lib/interview/script-report/access';
import type { PlanTier } from '@/types/app.types';

/** Mirrors legacy /report/[id] Starter-detail visibility (ExecutiveSummary + score justification). */
function legacyReportStarterDetailVisible(tier: PlanTier): boolean {
  return canSeeScriptReportDetails(tier);
}

describe('legacy report entitlement alignment', () => {
  it('gates executive summary and score justification at Starter', () => {
    expect(legacyReportStarterDetailVisible('free')).toBe(false);
    expect(legacyReportStarterDetailVisible('starter')).toBe(true);
    expect(legacyReportStarterDetailVisible('pro')).toBe(true);
  });

  it('preserves campus tier Starter-detail access', () => {
    expect(legacyReportStarterDetailVisible('campus')).toBe(true);
    expect(legacyReportStarterDetailVisible('campus_admin')).toBe(true);
  });

  it('legacy report page gates ExecutiveSummaryPanel and score justification with seeDetails', () => {
    const pageSource = readFileSync(
      join(process.cwd(), 'src/app/(dashboard)/report/[id]/page.tsx'),
      'utf8',
    );

    expect(pageSource).toMatch(
      /const reportScoreJustification = seeDetails[\s\S]*aggregateScoreJustifications/,
    );
    expect(pageSource).toMatch(
      /<BlurredSection[\s\S]*requiredTier="starter"[\s\S]*<ExecutiveSummaryPanel insights=\{insights\} \/>/,
    );
    expect(pageSource).not.toMatch(
      /<ExecutiveSummaryPanel insights=\{insights\} className="lg:col-span-12" \/>/,
    );
  });
});
