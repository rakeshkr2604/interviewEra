import fs from 'fs';

const raw = fs.readFileSync(
  'supabase/manual/supabase-migration-retention-system.sql',
  'utf8',
);
const re = /CREATE\s+POLICY\s+("([^"]+)"|([a-zA-Z_][\w$]*))/gi;
const names = [];
let m;
while ((m = re.exec(raw))) names.push(m[2] || m[3]);

const j = JSON.parse(fs.readFileSync('scripts/_rls_policy_recon.json', 'utf8'));
const liveNames = new Set(j.allPolicies.map((p) => p.policyName));

const dumpOnly = names.filter((n) => !liveNames.has(n));
const report = {
  migrationFinalPolicies: j.totalPolicies,
  needingInitplanWrap: j.needingFixCount,
  bareAuthCallHits: j.needingFix.reduce(
    (n, p) => n + (p.usingHits?.length || 0) + (p.checkHits?.length || 0),
    0,
  ),
  advisorReportedWarnings: 179,
  discrepancyNote:
    'Advisor reports 179 warnings; migration-reconstructed set has 76 policies / ~92 bare auth calls. Gap likely = production-only policies (Dashboard SQL, alternate retention dump names, or advisor counting per-occurrence / per-role). Safety-net DO block covers remainder at apply time.',
  overlappingPermissiveSameTableCmd: j.overlapping.map((g) => ({
    key: g.key,
    policies: g.policies.map((p) => p.name),
    note:
      g.key.startsWith('storage.objects|INSERT')
        ? 'NOT true duplicates — same cmd/role but different bucket_id predicates (resumes / profile-photos / feedback-screenshots).'
        : 'True overlapping permissive policies — OR together; cleanup is a separate task.',
  })),
  retentionDumpPoliciesPossiblyInProd: dumpOnly.map((n) => ({
    policyName: n,
    risk: 'If supabase/manual/supabase-migration-retention-system.sql was applied outside the numbered chain, these names may exist alongside 015_* policies.',
  })),
  needsManualReview: [
    {
      item: 'Live pg_policies dump unavailable',
      why: 'SUPABASE_ACCESS_TOKEN returned 401; policy list reconstructed from migrations only. Safety-net DO block is required to catch production-only names (e.g. user-prompt example "user owns interviews").',
    },
    {
      item: 'users_update_own has no WITH CHECK',
      why: 'Preserved as-is from 001. Privileged-column protection is via guard_users_privileged_update() trigger (migration 050), not RLS WITH CHECK. Do not add WITH CHECK here casually.',
    },
    {
      item: 'FOR ALL policies with USING-only (campus_admin_manage_*)',
      why: 'Original CREATE omitted WITH CHECK; Postgres defaults WITH CHECK = USING. Recreate preserves USING-only form.',
    },
  ],
};

fs.writeFileSync('scripts/_rls_initplan_report.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
