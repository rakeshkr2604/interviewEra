import { permanentRedirect } from 'next/navigation';

/**
 * Legacy T&P marketing URL — permanently consolidated into `/campus`.
 * App routes under `/college/*` (dashboard, signup, join) are unchanged.
 */
export default function CollegeLandingPage() {
  permanentRedirect('/campus');
}
