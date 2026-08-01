/**
 * Idempotent resume version commits — same class as claimReportGeneration.
 *
 * Parse results write ONLY when their upload_id is still resumes.latest_upload_id.
 * User corrections mint a new latest_upload_id so in-flight parses cannot clobber them.
 */

import type { ParsedResume } from '@/types/app.types';
import type { ExtractedSkill } from '@/lib/resume/skill-canonicalize';
import { RESUME_PARSER_VERSION } from '@/lib/resume/parser-version';
import type { ResumeLifecycleStatus } from '@/lib/resume/lifecycle';

export type VersionSource = 'upload' | 'user_correction' | 'backfill';

export type ResumeVersionRow = {
  id: string;
  resume_id: string;
  user_id: string;
  version_number: number;
  upload_id: string | null;
  source: VersionSource;
  parser_version: string | null;
  storage_path: string | null;
  /** @deprecated Legacy public URL dual-write; access via storage_path + /file. */
  file_url: string | null;
  raw_text: string | null;
  parsed_data: ParsedResume;
  skills_extracted: ExtractedSkill[];
  jd_text_hash: string | null;
  created_at: string;
};

export type ResumeWriteRow = {
  id: string;
  user_id: string;
  latest_upload_id: string | null;
  current_version_id: string | null;
  storage_path: string | null;
  /** @deprecated Legacy public URL dual-write; access via storage_path + /file. */
  file_url: string | null;
  raw_text: string | null;
  lifecycle_status: ResumeLifecycleStatus;
  status: string;
};

export type CommitParseVersionInput = {
  resumeId: string;
  userId: string;
  uploadId: string;
  parsed: ParsedResume;
  skillsExtracted: ExtractedSkill[];
  rawText: string | null;
  storagePath: string | null;
  /**
   * @deprecated Legacy public URL dual-write only. Runtime access uses storagePath.
   */
  fileUrl: string | null;
  jdTextHash?: string | null;
  parserVersion?: string;
};

export type CommitParseResult =
  | { ok: true; version: ResumeVersionRow; discarded: false }
  | { ok: false; reason: 'stale_upload' | 'resume_not_found' | 'already_committed'; discarded: true; version?: ResumeVersionRow };

/** Pure gate used by races tests and commitParseVersion. */
export function shouldAcceptParseWrite(
  latestUploadId: string | null | undefined,
  parseUploadId: string,
): boolean {
  return !!latestUploadId && latestUploadId === parseUploadId;
}

export type VersionWriteDb = {
  getResume(resumeId: string, userId: string): Promise<ResumeWriteRow | null>;
  getVersionByUploadId(resumeId: string, uploadId: string): Promise<ResumeVersionRow | null>;
  getMaxVersionNumber(resumeId: string): Promise<number>;
  insertVersion(row: Omit<ResumeVersionRow, 'id' | 'created_at'> & { id?: string }): Promise<ResumeVersionRow>;
  updateResumeAfterParse(args: {
    resumeId: string;
    userId: string;
    expectedUploadId: string;
    versionId: string;
    parsed: ParsedResume;
    rawText: string | null;
    lifecycle: ResumeLifecycleStatus;
  }): Promise<{ matched: boolean }>;
};

/**
 * Commit an upload-derived immutable version if upload_id is still latest.
 * Safe under double-upload and edit-during-parse (correction bumps latest_upload_id).
 */
export async function commitParseVersion(
  db: VersionWriteDb,
  input: CommitParseVersionInput,
): Promise<CommitParseResult> {
  const resume = await db.getResume(input.resumeId, input.userId);
  if (!resume) {
    return { ok: false, reason: 'resume_not_found', discarded: true };
  }

  const existing = await db.getVersionByUploadId(input.resumeId, input.uploadId);
  if (existing) {
    return { ok: false, reason: 'already_committed', discarded: true, version: existing };
  }

  if (!shouldAcceptParseWrite(resume.latest_upload_id, input.uploadId)) {
    console.info('[resume:parse-stale]', {
      resumeId: input.resumeId,
      parseUploadId: input.uploadId,
      latestUploadId: resume.latest_upload_id,
    });
    return { ok: false, reason: 'stale_upload', discarded: true };
  }

  const nextNum = (await db.getMaxVersionNumber(input.resumeId)) + 1;
  const version = await db.insertVersion({
    resume_id: input.resumeId,
    user_id: input.userId,
    version_number: nextNum,
    upload_id: input.uploadId,
    source: 'upload',
    parser_version: input.parserVersion ?? RESUME_PARSER_VERSION,
    storage_path: input.storagePath ?? resume.storage_path,
    file_url: input.fileUrl ?? resume.file_url,
    raw_text: input.rawText ?? resume.raw_text,
    parsed_data: input.parsed,
    skills_extracted: input.skillsExtracted,
    jd_text_hash: input.jdTextHash ?? null,
  });

  // Re-check at update time (compare-and-set on latest_upload_id)
  const cas = await db.updateResumeAfterParse({
    resumeId: input.resumeId,
    userId: input.userId,
    expectedUploadId: input.uploadId,
    versionId: version.id,
    parsed: input.parsed,
    rawText: input.rawText ?? resume.raw_text,
    lifecycle: 'review_ready',
  });

  if (!cas.matched) {
    console.info('[resume:parse-stale]', {
      resumeId: input.resumeId,
      parseUploadId: input.uploadId,
      phase: 'cas_update',
    });
    return { ok: false, reason: 'stale_upload', discarded: true, version };
  }

  return { ok: true, version, discarded: false };
}

export type CommitCorrectionInput = {
  resumeId: string;
  userId: string;
  /** New generation token — invalidates any in-flight parse. */
  newUploadId: string;
  baseVersionId: string;
  parsed: ParsedResume;
  skillsExtracted: ExtractedSkill[];
  jdTextHash?: string | null;
};

export type CorrectionWriteDb = VersionWriteDb & {
  getVersionById(versionId: string, resumeId: string): Promise<ResumeVersionRow | null>;
  setLatestUploadId(resumeId: string, userId: string, uploadId: string): Promise<void>;
  updateResumeAfterCorrection(args: {
    resumeId: string;
    userId: string;
    versionId: string;
    parsed: ParsedResume;
    latestUploadId: string;
    lifecycle: ResumeLifecycleStatus;
  }): Promise<void>;
};

/**
 * User corrections create version N+1 from a prior version.
 * Bumps latest_upload_id first so concurrent parse cannot win the CAS.
 */
export async function commitUserCorrection(
  db: CorrectionWriteDb,
  input: CommitCorrectionInput,
): Promise<{ ok: true; version: ResumeVersionRow } | { ok: false; reason: 'resume_not_found' | 'base_not_found' }> {
  const resume = await db.getResume(input.resumeId, input.userId);
  if (!resume) return { ok: false, reason: 'resume_not_found' };

  const base = await db.getVersionById(input.baseVersionId, input.resumeId);
  if (!base) return { ok: false, reason: 'base_not_found' };

  // Invalidate in-flight parses before inserting the correction version.
  await db.setLatestUploadId(input.resumeId, input.userId, input.newUploadId);

  const nextNum = (await db.getMaxVersionNumber(input.resumeId)) + 1;
  const version = await db.insertVersion({
    resume_id: input.resumeId,
    user_id: input.userId,
    version_number: nextNum,
    upload_id: input.newUploadId,
    source: 'user_correction',
    parser_version: base.parser_version ?? RESUME_PARSER_VERSION,
    storage_path: base.storage_path,
    file_url: base.file_url,
    raw_text: base.raw_text,
    parsed_data: input.parsed,
    skills_extracted: input.skillsExtracted,
    jd_text_hash: input.jdTextHash ?? base.jd_text_hash,
  });

  await db.updateResumeAfterCorrection({
    resumeId: input.resumeId,
    userId: input.userId,
    versionId: version.id,
    parsed: input.parsed,
    latestUploadId: input.newUploadId,
    lifecycle: 'verified',
  });

  return { ok: true, version };
}
