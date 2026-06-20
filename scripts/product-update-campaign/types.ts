export interface CampaignRecipient {
  id: string;
  name: string | null;
  email: string;
}

export interface CampaignSendResult {
  recipient: CampaignRecipient;
  displayName: string;
  firstName: string;
  status: 'success' | 'failed' | 'dry-run';
  messageId?: string;
  error?: string;
}

export interface CampaignSummary {
  total: number;
  success: number;
  failed: number;
  dryRun: number;
  durationMs: number;
}

export interface CampaignOptions {
  dryRun: boolean;
  preview: boolean;
  retryFailed: boolean;
}
