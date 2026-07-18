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
  hasFile: boolean;
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
