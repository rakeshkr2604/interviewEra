/**
 * Enumerate multiple-permissive-policy groups the way Supabase Advisor does:
 * same table + overlapping roles + overlapping commands (ALL expands to all cmds).
 * READ-ONLY classification helper — does not emit SQL changes by itself.
 */
import fs from 'fs';

const j = JSON.parse(fs.readFileSync('scripts/_rls_policy_recon.json', 'utf8'));

const ALL_CMDS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE'];

function expandCmds(cmd) {
  return cmd === 'ALL' ? [...ALL_CMDS] : [cmd];
}

function rolesOverlap(a, b) {
  // {public} overlaps everything
  if (a.includes('public') || b.includes('public')) return true;
  return a.some((r) => b.includes(r));
}

function normalizeExpr(expr) {
  if (!expr) return null;
  return expr
    .replace(/\r\n/g, '\n')
    .replace(/\(select\s+/gi, '(') // strip initplan wrap for logic compare? NO — keep for verbatim
    .replace(/\s+/g, ' ')
    .trim();
}

/** Compare logic ignoring (select ...) wraps and whitespace/case of auth.uid vs (select auth.uid()) */
function logicKey(expr) {
  if (!expr) return null;
  return expr
    .replace(/\r\n/g, '\n')
    .replace(/\(\s*select\s+(auth\.(?:uid|role|jwt|email)\s*\(\s*\))\s*\)/gi, '$1')
    .replace(/\(\s*select\s+(current_setting\s*\([^)]*\))\s*\)/gi, '$1')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Build: for each table|role|action → list of policies
const buckets = new Map(); // key → [{policy,...}]

for (const p of j.allPolicies) {
  const cmds = expandCmds(p.cmd);
  const roles = p.roles?.length ? p.roles : ['public'];
  // Expand public to the roles Advisor typically cares about? Advisor keys on the
  // policy's TO role. If TO public, it's one policy covering all roles — still
  // one policy entry, but overlaps with other public policies on same action.
  for (const cmd of cmds) {
    // Group by table + cmd only first (roles both public → always overlap)
    const key = `${p.schema}.${p.table}|${cmd}`;
    if (!buckets.has(key)) buckets.set(key, []);
    // Avoid double-adding same policy when FOR ALL expands
    if (!buckets.get(key).some((x) => x.policyName === p.policyName && x.sourceCmd === p.cmd)) {
      buckets.get(key).push({ ...p, sourceCmd: p.cmd, overlapCmd: cmd });
    }
  }
}

const multi = [...buckets.entries()]
  .filter(([, list]) => list.length >= 2)
  .sort((a, b) => a[0].localeCompare(b[0]));

function classify(list, overlapCmd) {
  // Pairwise classification summary for the group
  const names = list.map((p) => p.policyName);

  // Check if any pair is identical logic
  const pairs = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const usingSame = logicKey(a.using) === logicKey(b.using);
      const checkSame = logicKey(a.withCheck) === logicKey(b.withCheck);
      // For the overlapping command, relevant clause:
      // SELECT/DELETE → USING; INSERT → WITH CHECK; UPDATE → both
      let identical = false;
      if (overlapCmd === 'INSERT') {
        identical = checkSame && logicKey(a.withCheck) !== null;
      } else if (overlapCmd === 'SELECT' || overlapCmd === 'DELETE') {
        identical = usingSame && logicKey(a.using) !== null;
      } else if (overlapCmd === 'UPDATE') {
        identical = usingSame && checkSame;
      }

      const aIsService =
        /service_role/i.test(a.policyName) ||
        /auth\.role\(\)\s*=\s*'service_role'/i.test(a.using || '') ||
        /auth\.role\(\)\s*=\s*'service_role'/i.test(a.withCheck || '');
      const bIsService =
        /service_role/i.test(b.policyName) ||
        /auth\.role\(\)\s*=\s*'service_role'/i.test(b.using || '') ||
        /auth\.role\(\)\s*=\s*'service_role'/i.test(b.withCheck || '');

      const aIsCampus = /campus_admin/i.test(a.policyName);
      const bIsCampus = /campus_admin/i.test(b.policyName);

      const aBucket = a.using || a.withCheck || '';
      const bBucket = b.using || b.withCheck || '';
      const differentBuckets =
        /bucket_id\s*=\s*'([^']+)'/.exec(aBucket)?.[1] !==
        /bucket_id\s*=\s*'([^']+)'/.exec(bBucket)?.[1] &&
        /bucket_id/.test(aBucket) &&
        /bucket_id/.test(bBucket);

      let bucket;
      let reason;
      if (identical) {
        bucket = 'A';
        reason = 'USING/WITH CHECK logically identical (ignoring initplan wraps)';
      } else if ((aIsService && !bIsService) || (bIsService && !aIsService)) {
        bucket = 'B';
        reason =
          'Own-row (or other) policy OR service_role_full — different predicates; intentional multi-policy pattern. Note: service_role client bypasses RLS anyway; policy still evaluated for other roles as FALSE (Advisor noise / minor cost).';
      } else if ((aIsCampus && !bIsCampus) || (bIsCampus && !aIsCampus)) {
        bucket = 'B';
        reason =
          'Own-row access OR campus-admin org-scoped access — different predicates; intentional OR.';
      } else if (differentBuckets) {
        bucket = 'B';
        reason =
          'Same storage.objects action/role but different bucket_id predicates — not redundant; each gates a different bucket.';
      } else if (
        (/student|enrollment/i.test(a.policyName) && /campus_admin|manage/i.test(b.policyName)) ||
        (/student|enrollment/i.test(b.policyName) && /campus_admin|manage/i.test(a.policyName))
      ) {
        bucket = 'B';
        reason = 'Student own-row OR campus-admin manage — different predicates; intentional OR.';
      } else {
        bucket = 'C';
        reason =
          'Predicates differ and pattern is not a known intentional OR (campus/service/bucket). Needs human review of exact SQL.';
      }

      pairs.push({
        a: a.policyName,
        b: b.policyName,
        bucket,
        reason,
        a_using: a.using,
        a_check: a.withCheck,
        b_using: b.using,
        b_check: b.withCheck,
        a_sourceCmd: a.sourceCmd,
        b_sourceCmd: b.sourceCmd,
      });
    }
  }

  // Group bucket = worst of pairs (C > A? actually if ANY pair is A and others B...)
  // For reporting, use the most cautious: if any C → C for that pair; group can have mixed pairs
  return { names, pairs };
}

const report = {
  note: 'Live pg_policies unavailable (token 401). Built from migration-reconstructed final policy set AFTER 057 initplan wrap names (expressions shown as in recon, may still show unwrapped auth.uid() from pre-057 source text). Advisor reported 93 warnings — each table|action with 2+ policies typically emits one warning per role affected; our groups are table|action.',
  groupCount: multi.length,
  groups: multi.map(([key, list]) => {
    const [table, overlapCmd] = key.split('|');
    const { names, pairs } = classify(list, overlapCmd);
    return {
      key,
      table,
      overlapCmd,
      policyCount: list.length,
      policies: list.map((p) => ({
        name: p.policyName,
        declaredAs: p.sourceCmd,
        roles: p.roles,
        using: p.using,
        withCheck: p.withCheck,
        sourceFile: p.sourceFile,
      })),
      pairs,
    };
  }),
};

// Summarize buckets across all pairs
const summary = { A: [], B: [], C: [] };
const seenPair = new Set();
for (const g of report.groups) {
  for (const pair of g.pairs) {
    const id = [g.table, g.overlapCmd, pair.a, pair.b].join('|');
    // Deduplicate pair across ALL expansion (same two policies appear in SELECT/INSERT/UPDATE/DELETE if one is FOR ALL)
    const pairId = [g.table, [pair.a, pair.b].sort().join('~')].join('|');
    if (seenPair.has(pairId + '|' + pair.bucket)) continue;
    seenPair.add(pairId + '|' + pair.bucket);
    summary[pair.bucket].push({
      table: g.table,
      overlapCmds: report.groups
        .filter(
          (x) =>
            x.table === g.table &&
            x.pairs.some(
              (p) =>
                (p.a === pair.a && p.b === pair.b) || (p.a === pair.b && p.b === pair.a),
            ),
        )
        .map((x) => x.overlapCmd),
      policies: [pair.a, pair.b],
      reason: pair.reason,
      expressions: {
        [pair.a]: { using: pair.a_using, withCheck: pair.a_check, cmd: pair.a_sourceCmd },
        [pair.b]: { using: pair.b_using, withCheck: pair.b_check, cmd: pair.b_sourceCmd },
      },
    });
  }
}

report.summary = {
  A_identical: summary.A,
  B_intentional: summary.B,
  C_ambiguous: summary.C,
  counts: { A: summary.A.length, B: summary.B.length, C: summary.C.length },
};

fs.writeFileSync('scripts/_multi_permissive_classify.json', JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      groupCount: report.groupCount,
      counts: report.summary.counts,
      A: summary.A,
      C: summary.C,
      B_sample: summary.B.slice(0, 8),
      B_total: summary.B.length,
    },
    null,
    2,
  ),
);
