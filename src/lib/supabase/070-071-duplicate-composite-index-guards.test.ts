import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type IndexShape = {
  exists: boolean;
  tableOid: number;
  accessMethod: number;
  unique: boolean;
  primary: boolean;
  exclusion: boolean;
  valid: boolean;
  ready: boolean;
  live: boolean;
  indnatts: number;
  indnkeyatts: number;
  indkey: number[];
  opclasses: number[];
  collations: number[];
  options: number[];
  expressions: string;
  predicate: string;
  constraintBacked: boolean;
};

type Eligibility = 'eligible' | 'no-op' | 'refuse';

const retainedBase: IndexShape = {
  exists: true,
  tableOid: 100,
  accessMethod: 403,
  unique: true,
  primary: false,
  exclusion: false,
  valid: true,
  ready: true,
  live: true,
  indnatts: 2,
  indnkeyatts: 2,
  indkey: [2, 3],
  opclasses: [10000, 1978],
  collations: [0, 0],
  options: [0, 0],
  expressions: '',
  predicate: '',
  constraintBacked: true,
};

const candidateBase: IndexShape = {
  ...retainedBase,
  unique: false,
  constraintBacked: false,
};

function sameList(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/**
 * TypeScript model of the SQL guards. This does not connect to a database; it
 * makes the refusal matrix explicit and testable alongside static SQL checks.
 */
function assessEligibility(
  retained: IndexShape | null,
  candidate: IndexShape,
): Eligibility {
  if (!candidate.exists) return 'no-op';
  if (!retained?.exists) return 'refuse';

  const retainedIsExpectedUnique =
    retained.unique &&
    !retained.primary &&
    !retained.exclusion &&
    retained.valid &&
    retained.ready &&
    retained.live &&
    retained.constraintBacked;
  const candidateIsExpectedNonUnique =
    !candidate.unique &&
    !candidate.primary &&
    !candidate.exclusion &&
    candidate.valid &&
    candidate.ready &&
    candidate.live &&
    !candidate.constraintBacked;

  if (!retainedIsExpectedUnique || !candidateIsExpectedNonUnique) return 'refuse';

  const sameAccessPath =
    retained.tableOid === candidate.tableOid &&
    retained.accessMethod === candidate.accessMethod &&
    retained.indnatts === candidate.indnatts &&
    retained.indnkeyatts === candidate.indnkeyatts &&
    sameList(retained.indkey, candidate.indkey) &&
    sameList(retained.opclasses, candidate.opclasses) &&
    sameList(retained.collations, candidate.collations) &&
    sameList(retained.options, candidate.options) &&
    retained.expressions === candidate.expressions &&
    retained.predicate === candidate.predicate;

  return sameAccessPath ? 'eligible' : 'refuse';
}

const migrationSpecs = [
  {
    number: '070',
    file: '070_draft_remove_duplicate_script_turns_interview_turn_index.sql',
    table: 'script_turns',
    retained: 'script_turns_interview_id_turn_index_key',
    candidate: 'idx_script_turns_interview_turn',
  },
  {
    number: '071',
    file: '071_draft_remove_duplicate_answer_evaluations_interview_index.sql',
    table: 'answer_evaluations',
    retained: 'answer_evaluations_interview_id_turn_index_key',
    candidate: 'idx_answer_evaluations_interview',
  },
] as const;

function readMigration(file: string): string {
  return fs.readFileSync(
    path.resolve(process.cwd(), 'supabase/migrations', file),
    'utf8',
  );
}

function executableSql(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--.*$/gm, '');
}

describe('070/071 duplicate composite index eligibility model', () => {
  it('allows an exact access-path duplicate with retained UNIQUE enforcement', () => {
    expect(assessEligibility(retainedBase, candidateBase)).toBe('eligible');
  });

  it('refuses different key order', () => {
    expect(
      assessEligibility(retainedBase, { ...candidateBase, indkey: [3, 2] }),
    ).toBe('refuse');
  });

  it('refuses an INCLUDE-boundary difference', () => {
    expect(
      assessEligibility(retainedBase, {
        ...candidateBase,
        indnatts: 3,
        indnkeyatts: 2,
        indkey: [2, 3, 4],
      }),
    ).toBe('refuse');
  });

  it('refuses a predicate difference', () => {
    expect(
      assessEligibility(retainedBase, {
        ...candidateBase,
        predicate: '(score_suspect = true)',
      }),
    ).toBe('refuse');
  });

  it('refuses expression, opclass, collation, or ordering differences', () => {
    const differences: IndexShape[] = [
      { ...candidateBase, expressions: '(lower(question_type))' },
      { ...candidateBase, opclasses: [10001, 1978] },
      { ...candidateBase, collations: [950, 0] },
      { ...candidateBase, options: [3, 0] },
    ];

    for (const candidate of differences) {
      expect(assessEligibility(retainedBase, candidate)).toBe('refuse');
    }
  });

  it('refuses when the retained UNIQUE structure is missing', () => {
    expect(assessEligibility(null, candidateBase)).toBe('refuse');
  });

  it('no-ops when the candidate is already absent', () => {
    expect(
      assessEligibility(retainedBase, { ...candidateBase, exists: false }),
    ).toBe('no-op');
  });

  it('refuses a constraint-backed candidate', () => {
    expect(
      assessEligibility(retainedBase, {
        ...candidateBase,
        constraintBacked: true,
      }),
    ).toBe('refuse');
  });
});

describe('070/071 quarantined migration versions', () => {
  for (const spec of migrationSpecs) {
    const sql = readMigration(spec.file);

    it(`${spec.number} preserves the exact filename as a true no-op`, () => {
      const executable = executableSql(sql);
      expect(executable.trim()).toBe('');
      expect(executable).not.toMatch(/\b(?:DROP|ALTER|CREATE)\b/i);
      expect(sql).toContain('QUARANTINED');
      expect(sql).toContain('NO EXECUTABLE DDL');
    });
  }
});
