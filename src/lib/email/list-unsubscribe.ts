/**
 * RFC 8058 / one-click List-Unsubscribe helpers for marketing-style sends.
 * Transactional mail must not use these headers.
 */

export type ListUnsubscribeHeaders = {
  'List-Unsubscribe': string;
  'List-Unsubscribe-Post': string;
};

/** Build Resend-compatible custom headers for a signed one-click unsubscribe URL. */
export function buildListUnsubscribeHeaders(unsubscribeUrl: string): ListUnsubscribeHeaders {
  const trimmed = unsubscribeUrl.trim();
  if (!trimmed) {
    throw new Error('unsubscribeUrl is required for List-Unsubscribe headers');
  }
  return {
    'List-Unsubscribe': `<${trimmed}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
