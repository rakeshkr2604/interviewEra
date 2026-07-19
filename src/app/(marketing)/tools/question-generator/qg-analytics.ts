'use client';

/**
 * Question Engine v2 telemetry — GA4 + product-events client, mirroring the
 * landing-CTA pattern in src/lib/analytics/cta.ts. Events only (no dashboards):
 *   qg_generate                 — a set was produced (mode/role/level/domain, cached flag)
 *   qg_answer_reveal            — "How to answer" successfully revealed for one card
 *   qg_practice_click           — Practice CTA clicked on a card
 *   qg_profile_created          — preference profile saved for the first time on this device
 *   qg_profile_updated          — preference profile re-saved
 *   qg_profile_saved_to_account — local profile synced into candidate_profile
 *   qg_question_rated           — one up/down quality signal for a generated card
 */

import { standardizeAnalyticsProps } from '@/lib/analytics/schema';
import { trackEvent } from '@/lib/analytics/gtag';
import {
  trackProductEventClient,
  type ProductEventName,
} from '@/lib/analytics/product-events';

function fire(
  eventName: ProductEventName,
  props: Record<string, string | number | boolean | undefined>,
): void {
  if (typeof window === 'undefined') return;
  const standardized = standardizeAnalyticsProps(eventName, props);
  const { event_name: _en, ...productProps } = standardized;
  trackProductEventClient(eventName, productProps);
  trackEvent(eventName, standardized);
}

export function trackQgGenerate(props: {
  mode: string;
  role: string;
  level: string;
  domain: string;
  cached: boolean;
}): void {
  fire('qg_generate', props);
}

export function trackQgAnswerReveal(props: { category: string; difficulty: string }): void {
  fire('qg_answer_reveal', props);
}

export function trackQgPracticeClick(props: { role: string; level: string }): void {
  fire('qg_practice_click', props);
}

export function trackQgQuestionRated(props: {
  rating: 'up' | 'down';
  category: string;
  difficulty: string;
  mode: string;
  order: number;
}): void {
  fire('qg_question_rated', props);
}

interface QgProfileEventProps {
  signedIn: boolean;
  role?: string;
  level?: string;
  domain?: string;
}

function toProfileProps(props: QgProfileEventProps) {
  return {
    signed_in: props.signedIn,
    role: props.role,
    level: props.level,
    domain: props.domain,
  };
}

export function trackQgProfileCreated(props: QgProfileEventProps): void {
  fire('qg_profile_created', toProfileProps(props));
}

export function trackQgProfileUpdated(props: QgProfileEventProps): void {
  fire('qg_profile_updated', toProfileProps(props));
}

export function trackQgProfileSavedToAccount(props: QgProfileEventProps): void {
  fire('qg_profile_saved_to_account', toProfileProps(props));
}
