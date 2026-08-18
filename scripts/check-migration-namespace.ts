/**
 * Fail CI if supabase/migrations contains a timestamp filename.
 * Canonical format: NNN_snake_case.sql (3+ digit serial, no 14-digit timestamps).
 *
 * Usage: npx tsx scripts/check-migration-namespace.ts
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';

const migrationsDirectory = path.resolve(process.cwd(), 'supabase/migrations');
const serialName = /^(\d{3,})_([a-z0-9_]+)\.sql$/;
const timestampName = /^\d{14}_/;

const files = readdirSync(migrationsDirectory).filter((name) => name.endsWith('.sql'));
const errors: string[] = [];
const versions = new Map<string, string>();

for (const name of files) {
  if (timestampName.test(name)) {
    errors.push(`${name}: 14-digit timestamp filenames are forbidden. Use the next serial NNN_name.sql.`);
    continue;
  }

  const match = serialName.exec(name);
  if (!match) {
    errors.push(`${name}: must match NNN_snake_case.sql (example: 095_add_foo.sql).`);
    continue;
  }

  const version = match[1];
  const existing = versions.get(version);
  if (existing) {
    errors.push(`duplicate version ${version}: ${existing} and ${name}`);
  } else {
    versions.set(version, name);
  }
}

if (errors.length > 0) {
  console.error('Migration namespace check failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

const maxVersion = Math.max(...[...versions.keys()].map((value) => Number(value)));
console.log(
  `Migration namespace OK: ${files.length} serial files, highest version ${String(maxVersion).padStart(3, '0')}. Next file must be ${String(maxVersion + 1).padStart(3, '0')}_name.sql.`,
);
