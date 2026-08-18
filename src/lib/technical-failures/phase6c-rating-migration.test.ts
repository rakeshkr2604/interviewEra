import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Phase 6C optional technical feedback rating migration', () => {
  it('allows null rating only for technical_issue rows', () => {
    const sql = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20260816194343_phase6c_optional_technical_feedback_rating.sql',
      ),
      'utf8',
    );

    expect(sql).toContain('ALTER COLUMN rating DROP NOT NULL');
    expect(sql).toContain(
      'DROP CONSTRAINT IF EXISTS feedbacks_rating_required_for_non_technical_check',
    );
    expect(sql).toContain('feedbacks_rating_required_for_non_technical_check');
    expect(sql).toMatch(
      /rating IS NOT NULL\s+OR feedback_category IS NOT DISTINCT FROM 'technical_issue'/,
    );
    expect(sql).not.toMatch(
      /feedback_category = 'technical_issue'\s+OR rating IS NOT NULL/,
    );
  });
});
