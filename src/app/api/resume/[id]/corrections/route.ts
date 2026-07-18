import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import { canonicalizeSkills } from '@/lib/resume/skill-canonicalize';
import { commitUserCorrection } from '@/lib/resume/version-write';
import { createVersionWriteDb } from '@/lib/resume/version-write-supabase';
import { hashJobDescriptionText } from '@/lib/resume/jd-hash';
import type { ParsedResume } from '@/types/app.types';

type RouteContext = { params: Promise<{ id: string }> };

const experienceEntrySchema = z.object({
  organization: z.string().max(160).default(''),
  title: z.string().max(160).default(''),
  date_range: z.string().max(80).default(''),
  bullets: z.array(z.string().max(280)).max(3).default([]),
});

const educationEntrySchema = z.object({
  institution: z.string().max(160).default(''),
  degree: z.string().max(160).default(''),
  year_range: z.string().max(80).default(''),
});

const projectEntrySchema = z.object({
  name: z.string().max(160).default(''),
  description: z.string().max(400).default(''),
  technologies: z.array(z.string().max(48)).max(12).default([]),
});

const correctionsSchema = z.object({
  /** Version to correct from; defaults to current_version_id when omitted. */
  baseVersionId: z.string().uuid().optional(),
  targetRole: z.string().min(1).max(120),
  skills: z.array(z.string().min(1).max(64)).max(24),
  experienceEstimate: z.string().min(1).max(48),
  experience: z.array(experienceEntrySchema).max(6).optional(),
  education: z.array(educationEntrySchema).max(6).optional(),
  projects: z.array(projectEntrySchema).max(6).optional(),
  /** Optional pasted JD stored as hash only with this version. */
  jobDescription: z.string().max(12000).optional(),
});

/**
 * POST /api/resume/:id/corrections
 * User corrections → immutable version N+1 (never mutates prior versions).
 */
export async function POST(request: Request, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: resumeId } = await context.params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = correctionsSchema.safeParse(rawBody);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request body',
          fieldErrors: validation.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const serviceClient = createServiceClient();
    const { data: resume } = await serviceClient
      .from('resumes')
      .select('id, current_version_id, deleted_at, status')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!resume || resume.deleted_at) {
      return NextResponse.json({ error: 'Resume not found.' }, { status: 404 });
    }
    // Allow corrections while a replacement upload is `parsing` — they target the
    // prior immutable version and bump latest_upload_id so the in-flight parse is discarded.
    if (!resume.current_version_id) {
      return NextResponse.json(
        { error: 'Resume must have a version before corrections can be saved.' },
        { status: 422 },
      );
    }
    if (resume.status !== 'parsed' && resume.status !== 'parsing') {
      return NextResponse.json(
        { error: 'Resume is not in a state that accepts corrections yet.' },
        { status: 422 },
      );
    }

    const baseVersionId = validation.data.baseVersionId ?? (resume.current_version_id as string);
    const { data: baseVersion } = await serviceClient
      .from('resume_versions')
      .select('parsed_data')
      .eq('id', baseVersionId)
      .eq('resume_id', resumeId)
      .maybeSingle();

    const baseParsed = coerceParsedResume(baseVersion?.parsed_data ?? null);
    const skillsExtracted = canonicalizeSkills(validation.data.skills);

    const sectionPayload: Partial<ParsedResume> = {
      experience: validation.data.experience ?? baseParsed.experience ?? [],
      education: validation.data.education ?? baseParsed.education ?? [],
      projects: validation.data.projects ?? baseParsed.projects ?? [],
    };
    sectionPayload.sections_missing = {
      experience: (sectionPayload.experience?.length ?? 0) === 0,
      education: (sectionPayload.education?.length ?? 0) === 0,
      projects: (sectionPayload.projects?.length ?? 0) === 0,
    };

    const parsed = coerceParsedResume({
      target_role: validation.data.targetRole,
      skills: skillsExtracted.map((s) => s.canonical),
      experience_estimate: validation.data.experienceEstimate,
      ...sectionPayload,
    });

    const db = createVersionWriteDb(serviceClient);
    const result = await commitUserCorrection(db, {
      resumeId,
      userId: user.id,
      newUploadId: randomUUID(),
      baseVersionId,
      parsed,
      skillsExtracted,
      jdTextHash: hashJobDescriptionText(validation.data.jobDescription),
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.reason === 'base_not_found' ? 'Base version not found.' : 'Resume not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      resumeId,
      versionId: result.version.id,
      versionNumber: result.version.version_number,
      lifecycleStatus: 'verified',
      parsed: result.version.parsed_data,
      skillsExtracted: result.version.skills_extracted,
    });
  } catch (err) {
    console.error('[resume/corrections] unexpected', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
