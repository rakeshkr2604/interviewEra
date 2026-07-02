import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test as base } from '@playwright/test';

const STORAGE_PATH = join(process.cwd(), 'e2e', '.auth', 'user.json');

export const authReady = (() => {
  try {
    return readFileSync(join(process.cwd(), 'e2e', '.auth', 'ready'), 'utf8').trim() === '1';
  } catch {
    return false;
  }
})();

export const authenticatedTest =
  authReady && existsSync(STORAGE_PATH)
    ? base.extend({
        storageState: STORAGE_PATH,
      })
    : base;
