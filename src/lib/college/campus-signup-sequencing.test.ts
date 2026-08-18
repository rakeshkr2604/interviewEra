import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const signupSurfaces = [
  'src/components/auth/CollegeSignupFields.tsx',
  'src/app/(auth)/college/signup/CollegeSignupForm.tsx',
];

describe('campus signup request sequencing', () => {
  it.each(signupSurfaces)(
    '%s creates the account but never calls create-org before verification',
    (relativePath) => {
      const source = fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

      expect(source).toContain("fetch('/api/auth/signup'");
      expect(source).toContain('campusVerificationPendingPath(email)');
      expect(source).not.toContain("fetch('/api/college/create-org'");
    },
  );
});
