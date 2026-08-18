/**
 * Reconstruct final RLS policy state from migration SQL files.
 * Emits JSON of policies that still reference bare auth.* / current_setting(...).
 */
import fs from 'fs';
import path from 'path';

const dir = path.resolve('supabase/migrations');

/** Approximate apply order: numeric 001–056 first, then dated 2026… (retention dump lives under supabase/manual/). */
function migrationOrder(name) {
  if (name === 'supabase-migration-retention-system.sql') return 9999; // legacy name if reintroduced
  if (/^\d{3}_/.test(name)) return Number(name.slice(0, 3));
  if (/^2026/.test(name)) return 1000 + Number(name.slice(0, 14)); // after 056 by filename? NO — dated mid-July run before 055
  return 5000;
}

// Better: dated files from July 11–20 should sit before 055 (July 21).
function sortMigrations(a, b) {
  const rank = (n) => {
    if (n === 'supabase-migration-retention-system.sql') return [9, n];
    const m = n.match(/^(\d{3})_/);
    if (m) {
      const num = Number(m[1]);
      // Place 055+ after dated July migrations that happened earlier on calendar
      if (num >= 55) return [2, num, n];
      return [0, num, n];
    }
    if (/^2026/.test(n)) return [1, n, n];
    return [8, n, n];
  };
  const ra = rank(a);
  const rb = rank(b);
  for (let i = 0; i < Math.max(ra.length, rb.length); i++) {
    if (ra[i] < rb[i]) return -1;
    if (ra[i] > rb[i]) return 1;
  }
  return 0;
}

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort(sortMigrations);

/** Strip SQL comments */
function stripComments(sql) {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    if (sql[i] === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      i += 2;
      while (i < sql.length && !(sql[i] === '*' && sql[i + 1] === '/')) i++;
      i += 2;
      continue;
    }
    out += sql[i++];
  }
  return out;
}

/**
 * Find matching closing paren for OPEN paren at position `openIdx` (which points at '(').
 */
function matchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Parse CREATE POLICY statements. Supports:
 * CREATE POLICY name ON [schema.]table ...
 * CREATE POLICY "name" ON ...
 */
function parseCreatePolicies(sql, sourceFile) {
  const results = [];
  const re = /CREATE\s+POLICY\s+("([^"]+)"|([a-zA-Z_][\w$]*))\s+ON\s+((?:public\.|storage\.)?[a-zA-Z_][\w$]*(?:\.[a-zA-Z_][\w$]*)?)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const policyName = m[2] ?? m[3];
    let tableRef = m[4];
    let schema = 'public';
    let table = tableRef;
    if (tableRef.includes('.')) {
      [schema, table] = tableRef.split('.');
    }
    // For storage.objects the table is objects in schema storage
    if (schema === 'storage' || tableRef.startsWith('storage.')) {
      schema = 'storage';
      table = tableRef.includes('.') ? tableRef.split('.')[1] : table;
    }

    const start = m.index;
    // Find end of statement: semicolon not inside parens/strings
    let i = re.lastIndex;
    let depth = 0;
    let inStr = false;
    let end = sql.length;
    while (i < sql.length) {
      const c = sql[i];
      if (inStr) {
        if (c === "'") {
          if (sql[i + 1] === "'") {
            i += 2;
            continue;
          }
          inStr = false;
        }
        i++;
        continue;
      }
      if (c === "'") {
        inStr = true;
        i++;
        continue;
      }
      if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ';' && depth === 0) {
        end = i;
        break;
      }
      i++;
    }
    const stmt = sql.slice(start, end).trim();
    results.push({ policyName, schema, table, stmt, sourceFile });
    re.lastIndex = end + 1;
  }
  return results;
}

function parseDropPolicies(sql) {
  const results = [];
  const re =
    /DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?("([^"]+)"|([a-zA-Z_][\w$]*))\s+ON\s+((?:public\.|storage\.)?[a-zA-Z_][\w$]*(?:\.[a-zA-Z_][\w$]*)?)/gi;
  let m;
  while ((m = re.exec(sql))) {
    const policyName = m[2] ?? m[3];
    let tableRef = m[4];
    let schema = 'public';
    let table = tableRef;
    if (tableRef.includes('.')) {
      [schema, table] = tableRef.split('.');
    }
    results.push({ policyName, schema, table });
  }
  return results;
}

/** Extract USING / WITH CHECK / TO / FOR / AS from CREATE POLICY stmt */
function parsePolicyParts(stmt) {
  const normalized = stmt.replace(/\s+/g, ' ').trim();
  // FOR cmd
  const forM = /\bFOR\s+(ALL|SELECT|INSERT|UPDATE|DELETE)\b/i.exec(normalized);
  const cmd = forM ? forM[1].toUpperCase() : 'ALL';

  // AS PERMISSIVE|RESTRICTIVE
  const asM = /\bAS\s+(PERMISSIVE|RESTRICTIVE)\b/i.exec(normalized);
  const permissive = asM ? asM[1].toUpperCase() : 'PERMISSIVE';

  // TO roles
  let roles = ['public'];
  const toM = /\bTO\s+((?:[a-zA-Z_][\w$]*|"[^"]+")(?:\s*,\s*(?:[a-zA-Z_][\w$]*|"[^"]+"))*)/i.exec(normalized);
  if (toM) {
    roles = toM[1].split(',').map((r) => r.trim().replace(/^"|"$/g, ''));
  }

  function extractClause(keyword) {
    const re = new RegExp(`\\b${keyword}\\s*\\(`, 'i');
    const m = re.exec(stmt);
    if (!m) return null;
    const openIdx = m.index + m[0].length - 1;
    const closeIdx = matchingParen(stmt, openIdx);
    if (closeIdx < 0) return null;
    return stmt.slice(openIdx + 1, closeIdx).trim();
  }

  const using = extractClause('USING');
  const withCheck = extractClause('WITH\\s+CHECK') ?? extractClause('WITH CHECK');

  return { cmd, permissive, roles, using, withCheck, normalized };
}

/** Detect bare auth./current_setting that need wrapping */
function findBareCalls(expr) {
  if (!expr) return [];
  const hits = [];
  // Match auth.uid() / auth.role() / auth.jwt() not already wrapped as (select ...)
  const re =
    /(?<!\(\s*select\s)(?<!\(\s*SELECT\s)(auth\.(?:uid|role|jwt|email)\s*\(\s*\)|current_setting\s*\(\s*'[^']+'\s*(?:,\s*(?:true|false))?\s*\))/gi;
  let m;
  while ((m = re.exec(expr))) {
    hits.push(m[1]);
  }
  // Also catch cases already partially wrapped? We only want bare.
  return hits;
}

function wrapBareCalls(expr) {
  if (!expr) return expr;
  // Wrap auth.uid()/role()/jwt()/email() and current_setting(...) that are NOT already inside (select ...)
  // Strategy: replace all candidates, then unwrap double-wraps.
  let out = expr.replace(
    /\b(auth\.(?:uid|role|jwt|email)\s*\(\s*\)|current_setting\s*\(\s*'[^']+'\s*(?:,\s*(?:true|false))?\s*\))/gi,
    (match, _g1, offset, full) => {
      // Look behind for (select
      const before = full.slice(Math.max(0, offset - 20), offset).toLowerCase().replace(/\s+/g, ' ');
      if (/\(\s*select\s*$/.test(before) || /select\s+$/.test(before)) {
        return match; // already wrapped
      }
      // Also: already ( select auth.uid() )
      if (/\(\s*select\s*$/i.test(before)) return match;
      return `(select ${match})`;
    },
  );
  // Collapse accidental ((select auth.uid()))
  out = out.replace(/\(\s*\(\s*select\s+(auth\.[^)]+\)|current_setting\s*\([^)]*\))\s*\)\s*\)/gi, '(select $1)');
  return out;
}

// ---- main ----
const policyMap = new Map(); // key: schema.table|policyName -> record
const history = [];

for (const file of files) {
  if (file === 'supabase-migration-retention-system.sql') continue; // duplicate of 015
  const raw = fs.readFileSync(path.join(dir, file), 'utf8');
  const sql = stripComments(raw);

  for (const d of parseDropPolicies(sql)) {
    const key = `${d.schema}.${d.table}|${d.policyName}`;
    policyMap.delete(key);
    history.push({ op: 'DROP', file, ...d });
  }

  for (const c of parseCreatePolicies(sql, file)) {
    const parts = parsePolicyParts(c.stmt);
    const key = `${c.schema}.${c.table}|${c.policyName}`;
    policyMap.set(key, {
      schema: c.schema,
      table: c.table,
      policyName: c.policyName,
      ...parts,
      sourceFile: file,
      stmt: c.stmt,
    });
    history.push({ op: 'CREATE', file, policyName: c.policyName, table: c.table });
  }
}

const policies = [...policyMap.values()].sort((a, b) =>
  `${a.schema}.${a.table}.${a.policyName}`.localeCompare(`${b.schema}.${b.table}.${b.policyName}`),
);

const needingFix = [];
for (const p of policies) {
  const usingHits = findBareCalls(p.using);
  const checkHits = findBareCalls(p.withCheck);
  if (usingHits.length || checkHits.length) {
    needingFix.push({
      ...p,
      usingHits,
      checkHits,
      usingFixed: wrapBareCalls(p.using),
      withCheckFixed: wrapBareCalls(p.withCheck),
    });
  }
}

// Duplicate / overlapping permissive policies (same table + cmd + overlapping roles)
const byTableCmd = new Map();
for (const p of policies) {
  const k = `${p.schema}.${p.table}|${p.cmd}|${p.permissive}`;
  if (!byTableCmd.has(k)) byTableCmd.set(k, []);
  byTableCmd.get(k).push(p);
}
const overlapping = [];
for (const [k, list] of byTableCmd) {
  if (list.length < 2) continue;
  // same roles overlap (simplified: any two policies on same table/cmd)
  overlapping.push({
    key: k,
    policies: list.map((p) => ({
      name: p.policyName,
      roles: p.roles,
      using: p.using,
      withCheck: p.withCheck,
      sourceFile: p.sourceFile,
    })),
  });
}

const out = {
  filesProcessed: files.filter((f) => f !== 'supabase-migration-retention-system.sql'),
  totalPolicies: policies.length,
  needingFixCount: needingFix.length,
  needingFix,
  alreadyOk: policies.filter((p) => !needingFix.find((n) => n.policyName === p.policyName && n.table === p.table)),
  overlapping,
  allPolicies: policies.map((p) => ({
    schema: p.schema,
    table: p.table,
    policyName: p.policyName,
    cmd: p.cmd,
    roles: p.roles,
    using: p.using,
    withCheck: p.withCheck,
    sourceFile: p.sourceFile,
  })),
};

fs.writeFileSync('scripts/_rls_policy_recon.json', JSON.stringify(out, null, 2));
console.log(
  JSON.stringify(
    {
      files: out.filesProcessed.length,
      totalPolicies: out.totalPolicies,
      needingFix: out.needingFixCount,
      overlappingGroups: out.overlapping.length,
      sampleNeeding: needingFix.slice(0, 5).map((p) => ({
        t: `${p.schema}.${p.table}`,
        n: p.policyName,
        using: p.using,
        fixed: p.usingFixed,
      })),
    },
    null,
    2,
  ),
);
