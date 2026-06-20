import { Suspense } from 'react';
import { AuthConfirmClient } from './AuthConfirmClient';
import { authPageMetadata } from '@/lib/seo/metadata';

export const metadata = authPageMetadata({
  title: 'Confirming your link',
  description: 'Verify your InterviewEra account link.',
  path: '/auth/confirm',
});

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-24 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Loading…
        </div>
      }
    >
      <AuthConfirmClient />
    </Suspense>
  );
}
