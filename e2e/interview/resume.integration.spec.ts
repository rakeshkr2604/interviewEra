import { test } from '@playwright/test';

/**
 * V1 checkpoint cross-device resume @integration was removed with the dual-agent
 * session UI. Script-engine resume coverage lives under script e2e (when present).
 */
test.describe('Interview resume live @integration', () => {
  test.skip(true, 'V1 session checkpoint resume retired with dual-agent engine');
});
