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
const exitModal = fs.readFileSync(
  path.join(root, 'src', 'components', 'interview', 'InterviewExitFeedbackModal.tsx'),
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

  it('abandons on Exit/Restart via exit feedback modal before navigating and does not abandon on reload', () => {
    expect(scriptSession).toContain('InterviewExitFeedbackModal');
    expect(scriptSession).toContain("router.push('/dashboard')");

    const abandonAt = exitModal.indexOf(`/api/interview/\${interviewId}/abandon`);
    const exitFeedbackAt = exitModal.indexOf('/api/interview/exit-feedback');

    expect(abandonAt).toBeGreaterThan(-1);
    expect(exitFeedbackAt).toBeGreaterThan(-1);
    expect(scriptSession).not.toContain('beforeunload');
    expect(scriptSession).not.toContain('visibilitychange');
  });
});
