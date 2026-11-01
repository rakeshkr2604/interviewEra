/**
 * Fair-use comparison rows for /pricing, derived from the live limiter policy.
 * Server-only consumer (pricing page.tsx): importing the limiter into a client
 * component would bundle the Redis client.
 */

import {
  FREE_TIER_TOOL_LIMITS,
  PAID_TIER_TOOL_LIMITS,
  type FreeToolId,
} from '@/lib/security/free-tool-rate-limit';
import type { ComparisonGroup } from '@/lib/pricing/tiers';

const FAIR_USE_TOOLS: readonly { id: FreeToolId; label: string }[] = [
  { id: 'ats-checker', label: 'ATS Resume Checker' },
  { id: 'question-generator', label: 'Question Generator' },
  { id: 'question-generator-answer', label: 'Answer coaching' },
  { id: 'star-builder', label: 'STAR Answer Builder' },
  { id: 'prompt-builder', label: 'Prompt Builder' },
];

function formatLimit(limits: { hourly: number; daily: number }): string {
  return `${limits.hourly}/hour · ${limits.daily}/day`;
}

export function buildFairUseComparisonGroup(): ComparisonGroup {
  return {
    id: 'fair-use',
    label: 'Fair-use limits (per account)',
    note: 'Limits reset automatically. Reaching one never affects your mock-interview credits.',
    rows: FAIR_USE_TOOLS.map((tool) => ({
      feature: tool.label,
      free: formatLimit(FREE_TIER_TOOL_LIMITS[tool.id]),
      starter: formatLimit(PAID_TIER_TOOL_LIMITS[tool.id]),
      pro: formatLimit(PAID_TIER_TOOL_LIMITS[tool.id]),
    })),
  };
}
