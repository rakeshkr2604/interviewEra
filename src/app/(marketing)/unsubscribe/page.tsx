import type { Metadata } from 'next';
import Link from 'next/link';
import { SUPPORT_EMAIL } from '@/lib/contact/constants';

export const metadata: Metadata = {
  title: 'Unsubscribe',
  description: 'Manage InterviewEra email preferences and unsubscribe from optional digests.',
  robots: { index: false, follow: false },
};

/**
 * Public landing for marketing links that historically pointed at /unsubscribe.
 * One-click digest unsubscribe remains at /api/email/unsubscribe?userId=&token=.
 */
export default function UnsubscribePage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 sm:py-24">
      <h1
        className="font-[family-name:var(--font-bricolage)] text-3xl font-bold tracking-tight"
        style={{ color: 'var(--text-primary)' }}
      >
        Email preferences
      </h1>
      <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        Optional weekly digests and product updates can be turned off from your account settings
        when you are signed in. One-click unsubscribe links in those emails go to a signed API
        endpoint and update your preferences immediately.
      </p>
      <ul className="mt-6 list-disc space-y-2 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <li>
          Signed-in users:{' '}
          <Link href="/settings" className="font-semibold underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}>
            Open Settings → Notifications
          </Link>
        </li>
        <li>
          If an email included an Unsubscribe link, use that link — it is scoped to your account and
          does not expose other users&apos; data.
        </li>
        <li>
          Transactional messages (verification, password reset, billing receipts, security) are not
          marketing and may still be required to operate your account.
        </li>
      </ul>
      <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>
        Need help? Email{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="underline underline-offset-2">
          {SUPPORT_EMAIL}
        </a>
        .
      </p>
    </main>
  );
}
