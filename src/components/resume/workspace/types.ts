import type { ParsedResume, ResumeLifecycleStatus, ResumeStatus } from '@/types/app.types';

export type WorkspaceVersionSummary = {
  versionNumber: number;
  source: string;
  parserVersion: string | null;
  createdAt: string;
};

export type WorkspaceResumeItem = {
  id: string;
  status: ResumeStatus;
  lifecycleStatus: ResumeLifecycleStatus | string | null;
  createdAt: string;
  isPrimary: boolean;
  profileGroup: string | null;
  currentVersionId: string | null;
  latestUploadId: string | null;
  hasFile: boolean;
  parsed: ParsedResume | null;
  parseQuality: string | null;
  parseWarning: string | null;
  currentVersion: WorkspaceVersionSummary | null;
};

export type SkillExtracted = { raw: string; canonical: string };

export type VersionDetail = {
  id: string;
  versionNumber: number;
  uploadId: string | null;
  source: string;
  parserVersion: string | null;
  /** Canonical: true only when storage_path is set. */
  hasFile: boolean;
  /** Authenticated download path — GET for a 120s signed URL. Null when !hasFile. */
  fileDownloadPath?: string | null;
  /**
   * @deprecated Durable public Storage URL. Do not open in UI.
   * Prefer `fileDownloadPath` → GET /api/resume/:id/file.
   */
  fileUrl: string | null;
  rawText: string | null;
  parsed: ParsedResume;
  skillsExtracted: SkillExtracted[];
  jdTextHash: string | null;
  createdAt: string;
};

export type UploadPhase =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'parsing'
  | 'review_ready'
  | 'error';

export type UploadErrorKind =
  | 'wrong_type'
  | 'too_large'
  | 'too_many_pages'
  | 'unreadable'
  | 'timeout'
  | 'other';
