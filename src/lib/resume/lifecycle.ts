import type { ResumeLifecycleStatus, ResumeStatus } from '@/types/app.types';

export type { ResumeLifecycleStatus };

export function lifecycleFromLegacyStatus(status: ResumeStatus): ResumeLifecycleStatus {
  switch (status) {
    case 'uploading':
      return 'uploaded';
    case 'parsing':
      return 'parsing';
    case 'parsed':
      return 'review_ready';
    case 'failed':
      return 'parse_failed';
    default:
      return 'uploaded';
  }
}

export function legacyStatusFromLifecycle(lifecycle: ResumeLifecycleStatus): ResumeStatus {
  switch (lifecycle) {
    case 'uploaded':
      return 'uploading';
    case 'parsing':
      return 'parsing';
    case 'parse_failed':
      return 'failed';
    case 'review_ready':
    case 'verified':
      return 'parsed';
    case 'deleted':
      return 'parsed';
    default:
      return 'uploading';
  }
}
