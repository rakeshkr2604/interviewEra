import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const scriptStart = fs.readFileSync(
  path.join(root, 'src', 'app', '(dashboard)', 'interview', 'script', 'start', 'page.tsx'),
  'utf8',
);
const scriptSession = fs.readFileSync(
  path.join(root, 'src', 'app', '(dashboard)', 'interview', 'script', '[id]', 'page.tsx'),
  'utf8',
);

describe('script start/exit client contract', () => {
  it('guards duplicate start clicks before the fetch and resumes a 409 active interview', () => {
    expect(scriptStart).toContain('startInFlightRef');
    expect(scriptStart).toContain('if (startInFlightRef.current) return');
    expect(scriptStart).toContain("error === 'active_interview'");
    expect(scriptStart).not.toContain('ACTIVE_INTERVIEW_STALE_AFTER_MS');
    expect(scriptStart).not.toContain("status === 409 && body?.error !== 'active_interview'");
  });

  it('abandons on Exit/Restart before navigating and does not abandon on reload', () => {
    const abandonAt = scriptSession.indexOf(`/api/interview/\${interviewId}/abandon`);
    const awaitAbandonAt = scriptSession.indexOf('await fetch(`/api/interview/${interviewId}/abandon`');
    const navigateAt = scriptSession.indexOf("router.push('/dashboard')");

    expect(abandonAt).toBeGreaterThan(-1);
    expect(awaitAbandonAt).toBeGreaterThan(-1);
    expect(awaitAbandonAt).toBeLessThan(navigateAt);
    expect(scriptSession).not.toContain('beforeunload');
    expect(scriptSession).not.toContain('visibilitychange');
  });
});
