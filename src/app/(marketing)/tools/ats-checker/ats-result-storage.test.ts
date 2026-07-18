import { describe, expect, it } from 'vitest';
import {
  ATS_RESULT_STORAGE_KEY,
  parseStoredAtsResult,
  serializeAtsResult,
} from './ats-result-storage';
import type { AtsResultV2 } from './ats-types';

const sample: AtsResultV2 = {
  parseability: {
    score: 80,
    findings: [{ id: 'ok', severity: 'info', message: 'ok' }],
  },
  fieldExtraction: {
    score: 70,
    extracted: {
      name: 'Test',
      email: 't@example.com',
      phone: null,
      linkedin: null,
      location: null,
      experience: [],
      education: [],
      skills: ['TS'],
    },
    missingFields: ['phone'],
  },
  structureQuality: {
    score: 60,
    findings: [{ id: 'missing_experience', severity: 'error', message: 'No exp' }],
  },
  actionItems: [
    {
      priority: 'high',
      text: 'Add experience',
      expectedImpact: 'Structure',
    },
  ],
  jdMatch: {
    score: 72,
    findings: [{ id: 'required_skill_gaps', severity: 'warning', message: 'gaps' }],
    requiredCoverage: 60,
    preferredCoverage: 80,
    jdRequirementCoverage: 70,
    resumeFocusAlignment: 65,
    matchedRequired: ['typescript'],
    missingRequired: ['kubernetes'],
    matchedPreferred: ['redis'],
    missingPreferred: [],
  },
};

describe('ats-result-storage v2', () => {
  it('uses v2 storage key', () => {
    expect(ATS_RESULT_STORAGE_KEY).toBe('ie-ats-result-v2');
  });

  it('round-trips a v2 result including jdMatch', () => {
    const raw = serializeAtsResult(sample);
    const parsed = parseStoredAtsResult(raw);
    expect(parsed?.parseability.score).toBe(80);
    expect(parsed?.fieldExtraction.extracted.name).toBe('Test');
    expect(parsed?.jdMatch?.score).toBe(72);
    expect(parsed?.jdMatch?.missingRequired).toContain('kubernetes');
  });

  it('accepts null jdMatch (no JD provided)', () => {
    const raw = serializeAtsResult({ ...sample, jdMatch: null });
    const parsed = parseStoredAtsResult(raw);
    expect(parsed?.jdMatch).toBeNull();
  });

  it('rejects legacy v1 payloads', () => {
    const v1 = JSON.stringify({
      v: 1,
      savedAt: Date.now(),
      result: { score: 85, issues: [{ type: 'success', text: 'ok' }] },
    });
    expect(parseStoredAtsResult(v1)).toBeNull();
  });

  it('rejects v1 shape even if version flag is wrongfully 2', () => {
    const weird = JSON.stringify({
      v: 2,
      result: { score: 85, issues: [{ type: 'success', text: 'ok' }] },
    });
    expect(parseStoredAtsResult(weird)).toBeNull();
  });
});
