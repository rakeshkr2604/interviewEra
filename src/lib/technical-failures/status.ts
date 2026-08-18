import type { TechnicalFailureStatus } from '@/lib/technical-failures/types';

export const TECHNICAL_FAILURE_STATUS_LABELS: Record<TechnicalFailureStatus, string> = {
  submitted: 'Submitted',
  investigating: 'Investigating',
  approved: 'Approved',
  rejected: 'Rejected',
};

export type TechnicalCreditRestorationLabel =
  | 'Pending'
  | 'Restored'
  | 'Not restored'
  | 'Not eligible';

export function technicalCreditRestorationLabel(input: {
  status: TechnicalFailureStatus;
  originalDebitPresent: boolean;
  restorationPresent: boolean;
}): TechnicalCreditRestorationLabel {
  if (input.restorationPresent) return 'Restored';
  if (!input.originalDebitPresent) return 'Not eligible';
  if (input.status === 'rejected') return 'Not restored';
  return 'Pending';
}

export function formatCreditLedgerReason(reason: string | null | undefined): string {
  switch (reason) {
    case 'technical_failure_restore':
      return 'Interview credit restored';
    case 'service_recovery_credit':
      return 'Complimentary service-recovery credit';
    case 'interview_start':
      return 'Interview start';
    case 'interview_start_failed_refund':
      return 'Interview start refund';
    default:
      return reason?.trim() || 'Credit update';
  }
}
