/**
 * Race / idempotency evidence for resume version commits.
 * Simulates: stale parse discarded, double upload resolved, edit-during-parse safe.
 */

import { describe, expect, it } from 'vitest';
import {
  commitParseVersion,
  commitUserCorrection,
  shouldAcceptParseWrite,
  type CorrectionWriteDb,
  type ResumeVersionRow,
  type ResumeWriteRow,
  type VersionWriteDb,
} from '@/lib/resume/version-write';
import type { ParsedResume } from '@/types/app.types';

const parsedA: ParsedResume = {
  target_role: 'Software Engineer',
  skills: ['React'],
  experience_estimate: '0–2 years',
};

const parsedB: ParsedResume = {
  target_role: 'Backend Engineer',
  skills: ['Node.js'],
  experience_estimate: '1–3 years',
};

const parsedCorrected: ParsedResume = {
  target_role: 'Full Stack Engineer',
  skills: ['React', 'Node.js'],
  experience_estimate: '1–3 years',
};

function makeMemoryDb(initial: ResumeWriteRow): VersionWriteDb & CorrectionWriteDb & {
  versions: ResumeVersionRow[];
  resume: ResumeWriteRow;
} {
  const state = {
    resume: { ...initial },
    versions: [] as ResumeVersionRow[],
    seq: 0,
  };

  const db: VersionWriteDb & CorrectionWriteDb & {
    versions: ResumeVersionRow[];
    resume: ResumeWriteRow;
  } = {
    get versions() {
      return state.versions;
    },
    get resume() {
      return state.resume;
    },
    async getResume(resumeId, userId) {
      if (state.resume.id !== resumeId || state.resume.user_id !== userId) return null;
      return { ...state.resume };
    },
    async getVersionByUploadId(resumeId, uploadId) {
      return (
        state.versions.find((v) => v.resume_id === resumeId && v.upload_id === uploadId) ?? null
      );
    },
    async getVersionById(versionId, resumeId) {
      return state.versions.find((v) => v.id === versionId && v.resume_id === resumeId) ?? null;
    },
    async getMaxVersionNumber(resumeId) {
      return state.versions
        .filter((v) => v.resume_id === resumeId)
        .reduce((max, v) => Math.max(max, v.version_number), 0);
    },
    async insertVersion(row) {
      state.seq += 1;
      const created: ResumeVersionRow = {
        id: row.id ?? `ver-${state.seq}`,
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
        created_at: new Date().toISOString(),
      };
      state.versions.push(created);
      return created;
    },
    async updateResumeAfterParse(args) {
      if (
        state.resume.id !== args.resumeId ||
        state.resume.user_id !== args.userId ||
        state.resume.latest_upload_id !== args.expectedUploadId
      ) {
        return { matched: false };
      }
      state.resume.current_version_id = args.versionId;
      state.resume.lifecycle_status = args.lifecycle;
      state.resume.status = 'parsed';
      return { matched: true };
    },
    async setLatestUploadId(resumeId, userId, uploadId) {
      if (state.resume.id === resumeId && state.resume.user_id === userId) {
        state.resume.latest_upload_id = uploadId;
      }
    },
    async updateResumeAfterCorrection(args) {
      state.resume.current_version_id = args.versionId;
      state.resume.latest_upload_id = args.latestUploadId;
      state.resume.lifecycle_status = args.lifecycle;
      state.resume.status = 'parsed';
    },
  };

  return db;
}

describe('shouldAcceptParseWrite', () => {
  it('accepts only matching latest upload_id', () => {
    expect(shouldAcceptParseWrite('u1', 'u1')).toBe(true);
    expect(shouldAcceptParseWrite('u2', 'u1')).toBe(false);
    expect(shouldAcceptParseWrite(null, 'u1')).toBe(false);
  });
});

describe('commitParseVersion races', () => {
  it('discards stale parse when a newer upload_id is latest', async () => {
    const db = makeMemoryDb({
      id: 'r1',
      user_id: 'user1',
      latest_upload_id: 'upload-B',
      current_version_id: null,
      storage_path: 'path-b',
      file_url: 'url-b',
      raw_text: 'text-b',
      lifecycle_status: 'parsing',
      status: 'parsing',
    });

    const stale = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-A',
      parsed: parsedA,
      skillsExtracted: [{ raw: 'ReactJS', canonical: 'React' }],
      rawText: 'text-a',
      storagePath: 'path-a',
      fileUrl: 'url-a',
    });

    expect(stale.ok).toBe(false);
    if (!stale.ok) expect(stale.reason).toBe('stale_upload');
    expect(db.versions).toHaveLength(0);

    const fresh = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-B',
      parsed: parsedB,
      skillsExtracted: [{ raw: 'Node', canonical: 'Node.js' }],
      rawText: 'text-b',
      storagePath: 'path-b',
      fileUrl: 'url-b',
    });

    expect(fresh.ok).toBe(true);
    if (fresh.ok) {
      expect(fresh.version.version_number).toBe(1);
      expect(fresh.version.parsed_data.skills).toEqual(['Node.js']);
    }
    expect(db.versions).toHaveLength(1);
  });

  it('double upload: only latest upload_id wins; earlier commit discarded', async () => {
    const db = makeMemoryDb({
      id: 'r1',
      user_id: 'user1',
      latest_upload_id: 'upload-1',
      current_version_id: null,
      storage_path: null,
      file_url: null,
      raw_text: 'a',
      lifecycle_status: 'parsing',
      status: 'parsing',
    });

    // Second upload lands before either parse finishes
    db.resume.latest_upload_id = 'upload-2';
    db.resume.raw_text = 'b';

    const first = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-1',
      parsed: parsedA,
      skillsExtracted: [],
      rawText: 'a',
      storagePath: null,
      fileUrl: null,
    });
    expect(first.discarded).toBe(true);

    const second = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-2',
      parsed: parsedB,
      skillsExtracted: [],
      rawText: 'b',
      storagePath: null,
      fileUrl: null,
    });
    expect(second.ok).toBe(true);
    expect(db.versions).toHaveLength(1);
    expect(db.versions[0]?.upload_id).toBe('upload-2');
  });

  it('edit-during-parse: correction bumps latest_upload_id; stale parse cannot clobber', async () => {
    const db = makeMemoryDb({
      id: 'r1',
      user_id: 'user1',
      latest_upload_id: 'upload-parse',
      current_version_id: null,
      storage_path: 'p',
      file_url: 'u',
      raw_text: 'raw',
      lifecycle_status: 'parsing',
      status: 'parsing',
    });

    // Parse for original upload commits first
    const parseOk = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-parse',
      parsed: parsedA,
      skillsExtracted: [{ raw: 'react.js', canonical: 'React' }],
      rawText: 'raw',
      storagePath: 'p',
      fileUrl: 'u',
    });
    expect(parseOk.ok).toBe(true);
    if (!parseOk.ok) throw new Error('expected parse ok');

    // User corrects while a *second* parse (re-upload) is in flight
    db.resume.latest_upload_id = 'upload-reparse';
    db.resume.lifecycle_status = 'parsing';

    const correction = await commitUserCorrection(db, {
      resumeId: 'r1',
      userId: 'user1',
      newUploadId: 'upload-correction',
      baseVersionId: parseOk.version.id,
      parsed: parsedCorrected,
      skillsExtracted: [
        { raw: 'ReactJS', canonical: 'React' },
        { raw: 'NodeJS', canonical: 'Node.js' },
      ],
    });
    expect(correction.ok).toBe(true);
    if (!correction.ok) throw new Error('expected correction ok');
    expect(correction.version.version_number).toBe(2);
    expect(correction.version.source).toBe('user_correction');
    expect(db.resume.latest_upload_id).toBe('upload-correction');
    expect(db.resume.current_version_id).toBe(correction.version.id);

    // Stale re-parse finishes later — discarded; correction version remains current
    const stale = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-reparse',
      parsed: parsedB,
      skillsExtracted: [{ raw: 'Node', canonical: 'Node.js' }],
      rawText: 'raw2',
      storagePath: 'p2',
      fileUrl: 'u2',
    });
    expect(stale.discarded).toBe(true);
    expect(db.resume.current_version_id).toBe(correction.version.id);
    expect(db.versions.map((v) => v.source)).toEqual(['upload', 'user_correction']);
  });

  it('idempotent: same upload_id does not create two versions', async () => {
    const db = makeMemoryDb({
      id: 'r1',
      user_id: 'user1',
      latest_upload_id: 'upload-1',
      current_version_id: null,
      storage_path: null,
      file_url: null,
      raw_text: 't',
      lifecycle_status: 'parsing',
      status: 'parsing',
    });

    const a = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-1',
      parsed: parsedA,
      skillsExtracted: [],
      rawText: 't',
      storagePath: null,
      fileUrl: null,
    });
    const b = await commitParseVersion(db, {
      resumeId: 'r1',
      userId: 'user1',
      uploadId: 'upload-1',
      parsed: parsedA,
      skillsExtracted: [],
      rawText: 't',
      storagePath: null,
      fileUrl: null,
    });

    expect(a.ok).toBe(true);
    expect(b.ok).toBe(false);
    if (!b.ok) expect(b.reason).toBe('already_committed');
    expect(db.versions).toHaveLength(1);
  });
});
