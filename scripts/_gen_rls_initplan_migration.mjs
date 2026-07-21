/**
 * Generate 057_fix_auth_rls_initplan.sql from reconstructed policy state.
 */
import fs from 'fs';

const j = JSON.parse(fs.readFileSync('scripts/_rls_policy_recon.json', 'utf8'));

function qIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function qTable(schema, table) {
  return `${qIdent(schema)}.${qIdent(table)}`;
}

function formatExpr(expr) {
  if (!expr) return null;
  // Normalize CRLF and trim; keep readable indentation for multi-line
  return expr.replace(/\r\n/g, '\n').trim();
}

function indent(expr, spaces = 4) {
  const pad = ' '.repeat(spaces);
  return expr
    .split('\n')
    .map((line, i) => (i === 0 ? line : pad + line))
    .join('\n');
}

function rolesClause(roles) {
  if (!roles || roles.length === 0) return '';
  // pg_policies uses {public} for default PUBLIC
  if (roles.length === 1 && roles[0] === 'public') return '';
  return ` TO ${roles.map(qIdent).join(', ')}`;
}

const byTable = new Map();
for (const p of j.needingFix) {
  const key = `${p.schema}.${p.table}`;
  if (!byTable.has(key)) byTable.set(key, []);
  byTable.get(key).push(p);
}

const tables = [...byTable.keys()].sort();

let sql = `-- ============================================================================
-- 057_fix_auth_rls_initplan.sql
-- ============================================================================
-- Purpose: Fix Supabase Performance Advisor \`auth_rls_initplan\` warnings.
--
-- Problem: RLS policies that call auth.uid() / auth.role() / auth.jwt() /
-- current_setting(...) directly are re-evaluated once per row. Wrapping as
-- (select auth.uid()) makes Postgres InitPlan the value once per query.
--
-- Reference:
--   https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- Scope: ONLY wrap auth.*/current_setting() calls. No other logic changes.
--         Does NOT consolidate duplicate/overlapping policies.
--
-- Source of policy list: reconstructed from supabase/migrations/*.sql
-- (live pg_policies was unavailable — access token unauthorized). A safety-net
-- DO block at the end rewrites any remaining bare calls so production-only
-- policies (if any) are also fixed.
--
-- Apply via Dashboard SQL Editor after review. Do NOT auto-apply from CI.
-- ============================================================================

BEGIN;

`;

for (const tableKey of tables) {
  const policies = byTable.get(tableKey);
  const [schema, table] = tableKey.split('.');
  sql += `-- ── ${tableKey} (${policies.length} polic${policies.length === 1 ? 'y' : 'ies'}) ──\n`;

  for (const p of policies) {
    const usingFixed = formatExpr(p.usingFixed);
    const checkFixed = formatExpr(p.withCheckFixed);
    const usingOrig = formatExpr(p.using);
    const checkOrig = formatExpr(p.withCheck);

    sql += `-- ${p.policyName} [${p.cmd}] from ${p.sourceFile}\n`;
    if (usingOrig) {
      sql += `--   USING before: ${usingOrig.replace(/\n/g, ' ').slice(0, 120)}${usingOrig.length > 120 ? '…' : ''}\n`;
    }
    if (checkOrig) {
      sql += `--   CHECK before: ${checkOrig.replace(/\n/g, ' ').slice(0, 120)}${checkOrig.length > 120 ? '…' : ''}\n`;
    }

    sql += `DROP POLICY IF EXISTS ${qIdent(p.policyName)} ON ${qTable(schema, table)};\n`;
    sql += `CREATE POLICY ${qIdent(p.policyName)} ON ${qTable(schema, table)}\n`;
    sql += `  FOR ${p.cmd}${rolesClause(p.roles)}\n`;

    if (p.cmd === 'INSERT') {
      if (!checkFixed) {
        throw new Error(`INSERT policy missing WITH CHECK: ${tableKey} ${p.policyName}`);
      }
      sql += `  WITH CHECK (${indent(checkFixed)});\n\n`;
    } else if (p.cmd === 'SELECT' || p.cmd === 'DELETE') {
      if (!usingFixed) {
        throw new Error(`${p.cmd} policy missing USING: ${tableKey} ${p.policyName}`);
      }
      sql += `  USING (${indent(usingFixed)});\n\n`;
    } else if (p.cmd === 'UPDATE') {
      if (!usingFixed) {
        throw new Error(`UPDATE policy missing USING: ${tableKey} ${p.policyName}`);
      }
      sql += `  USING (${indent(usingFixed)})`;
      if (checkFixed) {
        sql += `\n  WITH CHECK (${indent(checkFixed)})`;
      }
      sql += `;\n\n`;
    } else if (p.cmd === 'ALL') {
      sql += `  USING (${indent(usingFixed || 'true')})`;
      if (checkFixed) {
        sql += `\n  WITH CHECK (${indent(checkFixed)})`;
      } else if (usingFixed) {
        // ALL without explicit WITH CHECK: Postgres uses USING for both when omitted on CREATE? 
        // Preserve: if original had no with_check, omit WITH CHECK.
      }
      sql += `;\n\n`;
    } else {
      throw new Error(`Unknown cmd ${p.cmd}`);
    }
  }
}

sql += `
-- ============================================================================
-- Safety net: wrap any remaining bare auth.*/current_setting() calls in
-- public + storage policies (covers production-only policy names not present
-- in migration history, e.g. Dashboard-created aliases).
-- Logs each rewrite via RAISE NOTICE for review in the SQL Editor output.
-- ============================================================================

CREATE OR REPLACE FUNCTION pg_temp.ie_wrap_rls_initplan(expr text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
DECLARE
  result text := expr;
BEGIN
  IF result IS NULL THEN
    RETURN NULL;
  END IF;

  -- Wrap auth.uid() / auth.role() / auth.jwt() / auth.email()
  result := regexp_replace(
    result,
    'auth\\.(uid|role|jwt|email)\\s*\\(\\s*\\)',
    '(select auth.\\1())',
    'gi'
  );

  -- Wrap current_setting('...') and current_setting('...', true|false)
  result := regexp_replace(
    result,
    '(current_setting\\s*\\(\\s*''[^'']+''\\s*(,\\s*(true|false))?\\s*\\))',
    '(select \\1)',
    'gi'
  );

  -- Collapse accidental double-wrap from already-fixed expressions
  result := regexp_replace(
    result,
    '\\(\\s*select\\s*\\(\\s*select\\s*(auth\\.(uid|role|jwt|email)\\(\\))\\s*\\)\\s*\\)',
    '(select \\1)',
    'gi'
  );
  result := regexp_replace(
    result,
    '\\(\\s*select\\s*\\(\\s*select\\s*(current_setting\\s*\\([^)]*\\))\\s*\\)\\s*\\)',
    '(select \\1)',
    'gi'
  );

  RETURN result;
END;
$fn$;

DO $body$
DECLARE
  r record;
  new_using text;
  new_check text;
  altered int := 0;
  sql text;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schemaname,
      c.relname AS tablename,
      p.polname AS policyname,
      pg_get_expr(p.polqual, p.polrelid) AS qual,
      pg_get_expr(p.polwithcheck, p.polrelid) AS with_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('public', 'storage')
  LOOP
    new_using := pg_temp.ie_wrap_rls_initplan(r.qual);
    new_check := pg_temp.ie_wrap_rls_initplan(r.with_check);

    IF new_using IS NOT DISTINCT FROM r.qual
       AND new_check IS NOT DISTINCT FROM r.with_check THEN
      CONTINUE;
    END IF;

    RAISE NOTICE 'initplan-wrap: %.% policy "%" ', r.schemaname, r.tablename, r.policyname;

    -- Build ALTER POLICY dynamically. Only include clauses that exist.
    sql := format(
      'ALTER POLICY %I ON %I.%I',
      r.policyname,
      r.schemaname,
      r.tablename
    );

    IF r.qual IS NOT NULL THEN
      sql := sql || format(' USING (%s)', new_using);
    END IF;

    IF r.with_check IS NOT NULL THEN
      sql := sql || format(' WITH CHECK (%s)', new_check);
    END IF;

    EXECUTE sql;
    altered := altered + 1;
  END LOOP;

  RAISE NOTICE 'auth_rls_initplan safety-net altered % remaining policies', altered;
END;
$body$;

DROP FUNCTION IF EXISTS pg_temp.ie_wrap_rls_initplan(text);

COMMIT;

-- ============================================================================
-- Post-apply verification (run separately, outside the transaction above):
--
-- SELECT schemaname, tablename, policyname, qual, with_check
-- FROM pg_policies
-- WHERE schemaname IN ('public', 'storage')
--   AND (
--     (qual ~* 'auth\\.(uid|role|jwt|email)\\s*\\(' AND qual !~* '\\(\\s*select\\s+auth\\.')
--     OR (with_check ~* 'auth\\.(uid|role|jwt|email)\\s*\\(' AND with_check !~* '\\(\\s*select\\s+auth\\.')
--   );
--
-- Expect: 0 rows.
-- ============================================================================
`;

fs.writeFileSync('supabase/migrations/057_fix_auth_rls_initplan.sql', sql);
console.log('Wrote migration, bytes', sql.length);
console.log('Static policies', j.needingFixCount, 'tables', tables.length);
