import { config } from 'dotenv';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

config({ path: join(process.cwd(), '.env.local') });

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  const r1 = await admin.from('resumes').select('id,is_primary,lifecycle_status,latest_upload_id').limit(1);
  console.log('resumes new cols:', r1.error?.message ?? 'ok', 'rows', r1.data?.length);

  const r2 = await admin.from('resume_versions').select('id').limit(1);
  console.log('resume_versions:', r2.error?.message ?? 'ok');

  const r3 = await admin.from('resume_interview_snapshots').select('id').limit(1);
  console.log('snapshots:', r3.error?.message ?? 'ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
