/**
 * Phase 2 — backfill resumes.storage_path / resume_versions.storage_path from file_url.
 *
 * Default is dry-run (no writes). Apply only with --apply after reviewing the report.
 *
 * Usage:
 *   npx tsx scripts/backfill-resume-storage-path.ts
 *   npx tsx scripts/backfill-resume-storage-path.ts --apply
 *   npx tsx scripts/backfill-resume-storage-path.ts --apply --batch-size=50
 *
 * Safety: resumable via checkpoint, idempotent (skips non-null storage_path),
 * batched updates, only verified Storage objects are written.
 */
import { config } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseStoragePathFromFileUrl } from '../src/lib/resume/parse-storage-path-from-file-url';
import { presenceFromFolderListing } from '../src/lib/resume/storage-object-presence';

config({ path: join(process.cwd(), '.env.local') });

type TableName = 'resumes' | 'resume_versions';

type Row = {
  id: string;
  file_url: string | null;
  storage_path: string | null;
};

type ObjectStatus = 'verified' | 'missing' | 'inaccessible';

type RowPlan = {
  table: TableName;
  id: string;
  fileUrl: string;
  existingPath: string | null;
  parsedPath: string | null;
  parseReason?: string;
  objectStatus?: ObjectStatus;
  action:
    | 'skip_already_set'
    | 'skip_already_set_mismatch'
    | 'would_update'
    | 'updated'
    | 'unrecoverable'
    | 'missing_object'
    | 'inaccessible_object'
    | 'update_failed';
};

type Checkpoint = {
  version: 1;
  updatedIds: { resumes: string[]; resume_versions: string[] };
  lastRunAt: string;
};

const OUT_DIR = join(process.cwd(), 'tmp-lh', 'backfill-resume-storage-path');
const CHECKPOINT_PATH = join(OUT_DIR, 'checkpoint.json');
const REPORT_PATH = join(OUT_DIR, 'dry-run-report.json');
const ROLLBACK_PATH = join(OUT_DIR, 'rollback.sql');

function parseArgs(argv: string[]) {
  const apply = argv.includes('--apply');
  const batchSizeArg = argv.find((a) => a.startsWith('--batch-size='));
  const batchSize = batchSizeArg ? Number(batchSizeArg.split('=')[1]) : 50;
  if (!Number.isFinite(batchSize) || batchSize < 1 || batchSize > 200) {
    throw new Error('--batch-size must be 1–200');
  }
  return { apply, batchSize };
}

function loadCheckpoint(): Checkpoint {
  if (!existsSync(CHECKPOINT_PATH)) {
    return {
      version: 1,
      updatedIds: { resumes: [], resume_versions: [] },
      lastRunAt: new Date(0).toISOString(),
    };
  }
  return JSON.parse(readFileSync(CHECKPOINT_PATH, 'utf8')) as Checkpoint;
}

function saveCheckpoint(cp: Checkpoint): void {
  mkdirSync(OUT_DIR, { recursive: true });
  cp.lastRunAt = new Date().toISOString();
  writeFileSync(CHECKPOINT_PATH, JSON.stringify(cp, null, 2), 'utf8');
}

async function fetchAllRows(admin: SupabaseClient, table: TableName): Promise<Row[]> {
  const pageSize = 1000;
  const rows: Row[] = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await admin
      .from(table)
      .select('id,file_url,storage_path')
      .not('file_url', 'is', null)
      .order('id', { ascending: true })
      .range(from, to);
    if (error) throw new Error(`${table} fetch: ${error.message}`);
    const batch = (data ?? []) as Row[];
    rows.push(...batch);
    if (batch.length < pageSize) break;
  }
  return rows;
}

/**
 * Supabase often returns HTTP 400 (not 404) for missing public objects.
 * Authoritative check: list the parent folder and look for the exact file name.
 */
async function listFolderNames(
  supabaseUrl: string,
  serviceKey: string,
  folderPrefix: string,
): Promise<{ ok: true; names: string[] } | { ok: false }> {
  const names: string[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/list/resumes`, {
        method: 'POST',
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix: folderPrefix,
          limit: pageSize,
          offset,
        }),
      });
      if (!res.ok) return { ok: false };
      const json: unknown = await res.json();
      if (!Array.isArray(json)) return { ok: false };
      for (const entry of json) {
        if (
          entry &&
          typeof entry === 'object' &&
          'name' in entry &&
          typeof (entry as { name: unknown }).name === 'string'
        ) {
          names.push((entry as { name: string }).name);
        }
      }
      if (json.length < pageSize) break;
    } catch {
      return { ok: false };
    }
  }
  return { ok: true, names };
}

async function verifyObjectExists(
  supabaseUrl: string,
  serviceKey: string,
  storagePath: string,
  folderCache: Map<string, { ok: true; names: string[] } | { ok: false }>,
): Promise<ObjectStatus> {
  const segments = storagePath.split('/').filter(Boolean);
  if (segments.length < 2) return 'inaccessible';
  const fileName = segments[segments.length - 1]!;
  const folderPrefix = segments.slice(0, -1).join('/');

  let listed = folderCache.get(folderPrefix);
  if (!listed) {
    listed = await listFolderNames(supabaseUrl, serviceKey, folderPrefix);
    folderCache.set(folderPrefix, listed);
  }
  return presenceFromFolderListing(fileName, listed);
}

function planRow(table: TableName, row: Row): Omit<RowPlan, 'objectStatus'> {
  const fileUrl = row.file_url ?? '';
  if (row.storage_path && row.storage_path.trim()) {
    const parsed = parseStoragePathFromFileUrl(fileUrl);
    if (parsed.ok && parsed.storagePath !== row.storage_path) {
      return {
        table,
        id: row.id,
        fileUrl,
        existingPath: row.storage_path,
        parsedPath: parsed.storagePath,
        action: 'skip_already_set_mismatch',
      };
    }
    return {
      table,
      id: row.id,
      fileUrl,
      existingPath: row.storage_path,
      parsedPath: parsed.ok ? parsed.storagePath : null,
      action: 'skip_already_set',
    };
  }

  const parsed = parseStoragePathFromFileUrl(fileUrl);
  if (!parsed.ok) {
    return {
      table,
      id: row.id,
      fileUrl,
      existingPath: null,
      parsedPath: null,
      parseReason: parsed.reason,
      action: 'unrecoverable',
    };
  }

  return {
    table,
    id: row.id,
    fileUrl,
    existingPath: null,
    parsedPath: parsed.storagePath,
    action: 'would_update',
  };
}

function writeRollbackSql(updated: Checkpoint['updatedIds']): void {
  const lines = [
    '-- Rollback for Phase 2 storage_path backfill',
    '-- Clears storage_path ONLY for rows this script updated (idempotent re-apply safe).',
    '-- file_url is never modified.',
    'BEGIN;',
  ];
  if (updated.resumes.length) {
    lines.push(
      `UPDATE public.resumes SET storage_path = NULL WHERE id IN (${updated.resumes
        .map((id) => `'${id}'`)
        .join(', ')});`,
    );
  } else {
    lines.push('-- No resumes updated.');
  }
  if (updated.resume_versions.length) {
    lines.push(
      `UPDATE public.resume_versions SET storage_path = NULL WHERE id IN (${updated.resume_versions
        .map((id) => `'${id}'`)
        .join(', ')});`,
    );
  } else {
    lines.push('-- No resume_versions updated.');
  }
  lines.push('COMMIT;', '');
  writeFileSync(ROLLBACK_PATH, lines.join('\n'), 'utf8');
}

async function main(): Promise<void> {
  const { apply, batchSize } = parseArgs(process.argv.slice(2));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`[backfill] mode=${apply ? 'APPLY' : 'DRY-RUN'} batchSize=${batchSize}`);
  console.log(`[backfill] project=${new URL(supabaseUrl).host}`);

  const checkpoint = loadCheckpoint();
  const plans: RowPlan[] = [];

  for (const table of ['resumes', 'resume_versions'] as const) {
    const rows = await fetchAllRows(admin, table);
    console.log(`[backfill] loaded ${table}: ${rows.length} rows with file_url`);
    for (const row of rows) {
      plans.push(planRow(table, row));
    }
  }

  const candidates = plans.filter((p) => p.action === 'would_update');
  const pathCounts = new Map<string, number>();
  for (const p of candidates) {
    if (!p.parsedPath) continue;
    pathCounts.set(p.parsedPath, (pathCounts.get(p.parsedPath) ?? 0) + 1);
  }
  const duplicatePaths = [...pathCounts.entries()]
    .filter(([, n]) => n > 1)
    .map(([path, count]) => ({ path, count }));

  // Verify objects for candidates (and report duplicates but still verify each).
  const folderCache = new Map<string, { ok: true; names: string[] } | { ok: false }>();
  let verified = 0;
  let missing = 0;
  let inaccessible = 0;
  for (let i = 0; i < candidates.length; i++) {
    const plan = candidates[i]!;
    const status = await verifyObjectExists(
      supabaseUrl,
      serviceKey,
      plan.parsedPath!,
      folderCache,
    );
    plan.objectStatus = status;
    if (status === 'verified') {
      verified += 1;
    } else if (status === 'missing') {
      missing += 1;
      plan.action = 'missing_object';
    } else {
      inaccessible += 1;
      plan.action = 'inaccessible_object';
    }
    if ((i + 1) % 25 === 0 || i + 1 === candidates.length) {
      console.log(`[backfill] verified objects ${i + 1}/${candidates.length}`);
    }
  }

  // Sync actions back onto plans array
  const byKey = new Map(plans.map((p) => [`${p.table}:${p.id}`, p]));
  for (const c of candidates) {
    byKey.set(`${c.table}:${c.id}`, c);
  }
  const finalPlans = [...byKey.values()];

  const recoverableVerified = finalPlans.filter(
    (p) => p.action === 'would_update' && p.objectStatus === 'verified',
  );

  let updatedCount = 0;
  let updateFailed = 0;
  if (apply) {
    for (let i = 0; i < recoverableVerified.length; i += batchSize) {
      const batch = recoverableVerified.slice(i, i + batchSize);
      for (const plan of batch) {
        // Idempotent: only update when still null.
        const { data, error } = await admin
          .from(plan.table)
          .update({ storage_path: plan.parsedPath })
          .eq('id', plan.id)
          .is('storage_path', null)
          .select('id')
          .maybeSingle();
        if (error) {
          plan.action = 'update_failed';
          updateFailed += 1;
          console.error(`[backfill] update failed ${plan.table}/${plan.id}: ${error.message}`);
          continue;
        }
        if (!data) {
          // Already filled by a concurrent run — treat as skip.
          plan.action = 'skip_already_set';
          continue;
        }
        plan.action = 'updated';
        updatedCount += 1;
        if (!checkpoint.updatedIds[plan.table].includes(plan.id)) {
          checkpoint.updatedIds[plan.table].push(plan.id);
        }
      }
      saveCheckpoint(checkpoint);
      writeRollbackSql(checkpoint.updatedIds);
      console.log(
        `[backfill] applied batch ${Math.min(i + batch.length, recoverableVerified.length)}/${recoverableVerified.length}`,
      );
    }
  }

  const summary = {
    mode: apply ? 'apply' : 'dry-run',
    generatedAt: new Date().toISOString(),
    projectHost: new URL(supabaseUrl).host,
    totals: {
      rowsWithFileUrl: finalPlans.length,
      skipAlreadySet: finalPlans.filter((p) => p.action === 'skip_already_set').length,
      skipMismatch: finalPlans.filter((p) => p.action === 'skip_already_set_mismatch').length,
      parseUnrecoverable: finalPlans.filter((p) => p.action === 'unrecoverable').length,
      candidates: candidates.length,
      verified,
      missing,
      inaccessible,
      duplicatePathGroups: duplicatePaths.length,
      wouldUpdateOrUpdated: recoverableVerified.length,
      updated: updatedCount,
      updateFailed,
    },
    estimatedRecoveryPercent:
      finalPlans.length === 0
        ? 0
        : Number(
            (
              ((finalPlans.filter((p) => p.action === 'skip_already_set').length +
                recoverableVerified.length) /
                finalPlans.length) *
              100
            ).toFixed(2),
          ),
    duplicatePaths: duplicatePaths.slice(0, 50),
    unrecoverableSamples: finalPlans
      .filter((p) => p.action === 'unrecoverable')
      .slice(0, 20),
    missingObjectSamples: finalPlans
      .filter((p) => p.action === 'missing_object')
      .slice(0, 20),
    plans: finalPlans,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(summary, null, 2), 'utf8');
  if (!apply) {
    // Dry-run still emits empty/partial rollback template from prior checkpoint.
    writeRollbackSql(checkpoint.updatedIds);
  }

  console.log('\n[backfill] SUMMARY');
  console.log(JSON.stringify(summary.totals, null, 2));
  console.log(`[backfill] estimatedRecoveryPercent=${summary.estimatedRecoveryPercent}`);
  console.log(`[backfill] report=${REPORT_PATH}`);
  console.log(`[backfill] rollback=${ROLLBACK_PATH}`);
  console.log(`[backfill] checkpoint=${CHECKPOINT_PATH}`);

  if (!apply) {
    console.log('\n[backfill] DRY-RUN complete — no rows updated. Re-run with --apply to write verified paths.');
  }
}

main().catch((err) => {
  console.error('[backfill] FATAL', err);
  process.exit(1);
});
