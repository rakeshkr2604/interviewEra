/**
 * Freeze resume content at interview start. Turn/report paths read snapshots only.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ParsedResume } from '@/types/app.types';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { canonicalizeSkills, type ExtractedSkill } from '@/lib/resume/skill-canonicalize';
import { hashJobDescriptionText } from '@/lib/resume/jd-hash';
import { RESUME_PARSER_VERSION } from '@/lib/resume/parser-version';

export type ResumeInterviewSnapshot = {
  id: string;
  interview_id: string;
  resume_id: string;
  resume_version_id: string | null;
  parsed_data: ParsedResume;
  skills_extracted: ExtractedSkill[];
  raw_text: string | null;
  parser_version: string | null;
  jd_text_hash: string | null;
  source: 'version' | 'live_fallback';
};

type VersionSelect = {
  id: string;
  parsed_data: unknown;
  skills_extracted: unknown;
  raw_text: string | null;
  parser_version: string | null;
  jd_text_hash: string | null;
};

function asSkills(raw: unknown): ExtractedSkill[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is ExtractedSkill =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as ExtractedSkill).raw === 'string' &&
        typeof (s as ExtractedSkill).canonical === 'string',
    )
    .map((s) => ({ raw: s.raw, canonical: s.canonical }));
}

/**
 * Create snapshot for an interview (idempotent on interview_id unique).
 * Prefer current immutable version; else freeze live resumes.parsed_data.
 */
export async function createResumeInterviewSnapshot(
  serviceClient: SupabaseClient,
  args: {
    interviewId: string;
    resumeId: string;
    jobDescription?: string | null;
  },
): Promise<ResumeInterviewSnapshot | null> {
  const { data: existing } = await serviceClient
    .from('resume_interview_snapshots')
    .select(
      'id, interview_id, resume_id, resume_version_id, parsed_data, skills_extracted, raw_text, parser_version, jd_text_hash, source',
    )
    .eq('interview_id', args.interviewId)
    .maybeSingle();

  if (existing) {
    return {
      id: existing.id as string,
      interview_id: existing.interview_id as string,
      resume_id: existing.resume_id as string,
      resume_version_id: (existing.resume_version_id as string | null) ?? null,
      parsed_data: coerceParsedResume(existing.parsed_data),
      skills_extracted: asSkills(existing.skills_extracted),
      raw_text: (existing.raw_text as string | null) ?? null,
      parser_version: (existing.parser_version as string | null) ?? null,
      jd_text_hash: (existing.jd_text_hash as string | null) ?? null,
      source: existing.source === 'live_fallback' ? 'live_fallback' : 'version',
    };
  }

  const { data: resume } = await serviceClient
    .from('resumes')
    .select('id, current_version_id, parsed_data, raw_text')
    .eq('id', args.resumeId)
    .maybeSingle();

  if (!resume) {
    console.warn('[resume:snapshot] resume missing', { interviewId: args.interviewId, resumeId: args.resumeId });
    return null;
  }

  let version: VersionSelect | null = null;
  if (resume.current_version_id) {
    const { data: v } = await serviceClient
      .from('resume_versions')
      .select('id, parsed_data, skills_extracted, raw_text, parser_version, jd_text_hash')
      .eq('id', resume.current_version_id)
      .maybeSingle();
    version = (v as VersionSelect | null) ?? null;
  }

  const jdHash = hashJobDescriptionText(args.jobDescription);
  const source: 'version' | 'live_fallback' = version ? 'version' : 'live_fallback';

  const parsed = coerceParsedResume(version?.parsed_data ?? resume.parsed_data);
  let skills = asSkills(version?.skills_extracted);
  if (skills.length === 0 && parsed.skills.length > 0) {
    skills = canonicalizeSkills(parsed.skills);
  }

  // Ensure skills[] in frozen parsed_data are canonical
  const frozen: ParsedResume = {
    ...parsed,
    skills: skills.length > 0 ? skills.map((s) => s.canonical) : parsed.skills,
  };

  const insertPayload = {
    interview_id: args.interviewId,
    resume_id: args.resumeId,
    resume_version_id: version?.id ?? null,
    parsed_data: frozen,
    skills_extracted: skills,
    raw_text: version?.raw_text ?? resume.raw_text ?? null,
    parser_version: version?.parser_version ?? RESUME_PARSER_VERSION,
    jd_text_hash: jdHash ?? version?.jd_text_hash ?? null,
    source,
  };

  const { data: inserted, error } = await serviceClient
    .from('resume_interview_snapshots')
    .insert(insertPayload)
    .select(
      'id, interview_id, resume_id, resume_version_id, parsed_data, skills_extracted, raw_text, parser_version, jd_text_hash, source',
    )
    .single();

  if (error) {
    // Unique race: another writer won
    if (error.code === '23505') {
      const { data: raced } = await serviceClient
        .from('resume_interview_snapshots')
        .select(
          'id, interview_id, resume_id, resume_version_id, parsed_data, skills_extracted, raw_text, parser_version, jd_text_hash, source',
        )
        .eq('interview_id', args.interviewId)
        .maybeSingle();
      if (raced) {
        return {
          id: raced.id as string,
          interview_id: raced.interview_id as string,
          resume_id: raced.resume_id as string,
          resume_version_id: (raced.resume_version_id as string | null) ?? null,
          parsed_data: coerceParsedResume(raced.parsed_data),
          skills_extracted: asSkills(raced.skills_extracted),
          raw_text: (raced.raw_text as string | null) ?? null,
          parser_version: (raced.parser_version as string | null) ?? null,
          jd_text_hash: (raced.jd_text_hash as string | null) ?? null,
          source: raced.source === 'live_fallback' ? 'live_fallback' : 'version',
        };
      }
    }
    console.error('[resume:snapshot] insert failed', {
      interviewId: args.interviewId,
      message: error.message,
      code: error.code,
    });
    return null;
  }

  return {
    id: inserted.id as string,
    interview_id: inserted.interview_id as string,
    resume_id: inserted.resume_id as string,
    resume_version_id: (inserted.resume_version_id as string | null) ?? null,
    parsed_data: coerceParsedResume(inserted.parsed_data),
    skills_extracted: asSkills(inserted.skills_extracted),
    raw_text: (inserted.raw_text as string | null) ?? null,
    parser_version: (inserted.parser_version as string | null) ?? null,
    jd_text_hash: (inserted.jd_text_hash as string | null) ?? null,
    source: inserted.source === 'live_fallback' ? 'live_fallback' : 'version',
  };
}

/**
 * Load snapshot for turn/report. Falls back to live resume with logged flag when null.
 */
export async function loadResumeContextForInterview(
  serviceClient: SupabaseClient,
  args: { interviewId: string; resumeId: string },
): Promise<{ parsed: ParsedResume | null; fromSnapshot: boolean }> {
  const { data: snap } = await serviceClient
    .from('resume_interview_snapshots')
    .select('parsed_data')
    .eq('interview_id', args.interviewId)
    .maybeSingle();

  if (snap?.parsed_data) {
    return { parsed: coerceParsedResume(snap.parsed_data), fromSnapshot: true };
  }

  console.info('[resume:snapshot-fallback]', {
    interviewId: args.interviewId,
    resumeId: args.resumeId,
    flag: 'missing_snapshot_using_live_resume',
  });

  const { data: resume } = await serviceClient
    .from('resumes')
    .select('parsed_data')
    .eq('id', args.resumeId)
    .maybeSingle();

  if (!resume?.parsed_data) return { parsed: null, fromSnapshot: false };
  return { parsed: coerceParsedResume(resume.parsed_data), fromSnapshot: false };
}
