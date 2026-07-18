/**
 * Supabase adapters for commitParseVersion / commitUserCorrection.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedResume } from '@/types/app.types';
import type { ExtractedSkill } from '@/lib/resume/skill-canonicalize';
import type {
  CorrectionWriteDb,
  ResumeVersionRow,
  ResumeWriteRow,
  VersionSource,
  VersionWriteDb,
} from '@/lib/resume/version-write';
import type { ResumeLifecycleStatus } from '@/lib/resume/lifecycle';
import { legacyStatusFromLifecycle } from '@/lib/resume/lifecycle';

function mapVersion(row: Record<string, unknown>): ResumeVersionRow {
  return {
    id: String(row.id),
    resume_id: String(row.resume_id),
    user_id: String(row.user_id),
    version_number: Number(row.version_number),
    upload_id: (row.upload_id as string | null) ?? null,
    source: row.source as VersionSource,
    parser_version: (row.parser_version as string | null) ?? null,
    storage_path: (row.storage_path as string | null) ?? null,
    file_url: (row.file_url as string | null) ?? null,
    raw_text: (row.raw_text as string | null) ?? null,
    parsed_data: row.parsed_data as ParsedResume,
    skills_extracted: (Array.isArray(row.skills_extracted)
      ? row.skills_extracted
      : []) as ExtractedSkill[],
    jd_text_hash: (row.jd_text_hash as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export function createVersionWriteDb(serviceClient: SupabaseClient): VersionWriteDb & CorrectionWriteDb {
  return {
    async getResume(resumeId, userId) {
      const { data, error } = await serviceClient
        .from('resumes')
        .select(
          'id, user_id, latest_upload_id, current_version_id, storage_path, file_url, raw_text, lifecycle_status, status',
        )
        .eq('id', resumeId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error || !data) return null;
      return {
        id: data.id as string,
        user_id: data.user_id as string,
        latest_upload_id: (data.latest_upload_id as string | null) ?? null,
        current_version_id: (data.current_version_id as string | null) ?? null,
        storage_path: (data.storage_path as string | null) ?? null,
        file_url: (data.file_url as string | null) ?? null,
        raw_text: (data.raw_text as string | null) ?? null,
        lifecycle_status: (data.lifecycle_status as ResumeLifecycleStatus) ?? 'uploaded',
        status: String(data.status),
      } satisfies ResumeWriteRow;
    },

    async getVersionByUploadId(resumeId, uploadId) {
      const { data } = await serviceClient
        .from('resume_versions')
        .select('*')
        .eq('resume_id', resumeId)
        .eq('upload_id', uploadId)
        .maybeSingle();
      return data ? mapVersion(data as Record<string, unknown>) : null;
    },

    async getVersionById(versionId, resumeId) {
      const { data } = await serviceClient
        .from('resume_versions')
        .select('*')
        .eq('id', versionId)
        .eq('resume_id', resumeId)
        .maybeSingle();
      return data ? mapVersion(data as Record<string, unknown>) : null;
    },

    async getMaxVersionNumber(resumeId) {
      const { data } = await serviceClient
        .from('resume_versions')
        .select('version_number')
        .eq('resume_id', resumeId)
        .order('version_number', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data ? Number(data.version_number) : 0;
    },

    async insertVersion(row) {
      const { data, error } = await serviceClient
        .from('resume_versions')
        .insert({
          resume_id: row.resume_id,
          user_id: row.user_id,
          version_number: row.version_number,
          upload_id: row.upload_id,
          source: row.source,
          parser_version: row.parser_version,
          storage_path: row.storage_path,
          file_url: row.file_url,
          raw_text: row.raw_text,
          parsed_data: row.parsed_data,
          skills_extracted: row.skills_extracted,
          jd_text_hash: row.jd_text_hash,
        })
        .select('*')
        .single();
      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to insert resume_versions row');
      }
      return mapVersion(data as Record<string, unknown>);
    },

    async updateResumeAfterParse(args) {
      const { data, error } = await serviceClient
        .from('resumes')
        .update({
          current_version_id: args.versionId,
          parsed_data: args.parsed,
          raw_text: args.rawText,
          lifecycle_status: args.lifecycle,
          status: legacyStatusFromLifecycle(args.lifecycle),
        })
        .eq('id', args.resumeId)
        .eq('user_id', args.userId)
        .eq('latest_upload_id', args.expectedUploadId)
        .select('id')
        .maybeSingle();
      if (error) {
        console.error('[resume:version-write] CAS update failed', error.message);
        return { matched: false };
      }
      return { matched: !!data };
    },

    async setLatestUploadId(resumeId, userId, uploadId) {
      await serviceClient
        .from('resumes')
        .update({ latest_upload_id: uploadId })
        .eq('id', resumeId)
        .eq('user_id', userId);
    },

    async updateResumeAfterCorrection(args) {
      const { error } = await serviceClient
        .from('resumes')
        .update({
          current_version_id: args.versionId,
          parsed_data: args.parsed,
          latest_upload_id: args.latestUploadId,
          lifecycle_status: args.lifecycle,
          status: legacyStatusFromLifecycle(args.lifecycle),
        })
        .eq('id', args.resumeId)
        .eq('user_id', args.userId);
      if (error) {
        throw new Error(error.message);
      }
    },
  };
}
