import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { requireEnv } from './env';
import type { CampaignRecipient } from './types';

const emailSchema = z.string().email();

const CREDITS_REQUIRED = 3;

function createDbClient() {
  return createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return emailSchema.safeParse(email.trim()).success;
}

/** First token of display name for email greeting. */
export function extractFirstName(fullName: string | null | undefined): string {
  const trimmed = fullName?.trim();
  if (!trimmed) return 'there';
  const first = trimmed.split(/\s+/)[0];
  return first || 'there';
}

export function getDisplayName(fullName: string | null | undefined, email: string): string {
  const trimmed = fullName?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : email;
}

/**
 * Fetch users eligible for the one-time product update email.
 * Does not modify the database.
 */
export async function fetchEligibleRecipients(): Promise<{
  recipients: CampaignRecipient[];
  skippedInvalid: number;
  skippedDuplicate: number;
}> {
  const supabase = createDbClient();

  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, credits_remaining')
    .eq('credits_remaining', CREDITS_REQUIRED)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch recipients: ${error.message}`);
  }

  const seenEmails = new Set<string>();
  const recipients: CampaignRecipient[] = [];
  let skippedInvalid = 0;
  let skippedDuplicate = 0;

  for (const row of data ?? []) {
    const rawEmail = row.email?.trim();
    if (!rawEmail) {
      skippedInvalid += 1;
      continue;
    }

    if (!isValidEmail(rawEmail)) {
      skippedInvalid += 1;
      continue;
    }

    const normalized = normalizeEmail(rawEmail);
    if (seenEmails.has(normalized)) {
      skippedDuplicate += 1;
      continue;
    }

    seenEmails.add(normalized);
    recipients.push({
      id: row.id,
      name: row.name,
      email: rawEmail,
    });
  }

  return { recipients, skippedInvalid, skippedDuplicate };
}
