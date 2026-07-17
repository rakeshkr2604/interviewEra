import { config } from 'dotenv';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';

config({ path: join(process.cwd(), '.env.local') });

const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ref = new URL(url).hostname.split('.')[0];
console.log('tokenPrefix', token?.slice(0, 6), 'len', token?.length, 'ref', ref);

const projects = await fetch('https://api.supabase.com/v1/projects', {
  headers: { Authorization: `Bearer ${token}` },
});
console.log('projects', projects.status, (await projects.text()).slice(0, 300));

for (const file of [
  'supabase/migrations/20260717000002_script_interview_reports.sql',
  'supabase/migrations/20260717000003_script_interview_reports_harden.sql',
]) {
  const query = readFileSync(file, 'utf8');
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/migrations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: file.split('/').pop(), query }),
  });
  console.log('migration', file, res.status, (await res.text()).slice(0, 400));
}

const probe = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: "select to_regclass('public.script_interview_reports') as reg;",
  }),
});
console.log('probe', probe.status, (await probe.text()).slice(0, 400));
