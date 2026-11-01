import { persistMilestoneEventOnce } from '@/lib/analytics/milestone-events-store';
import type { ToolUsageTool } from '@/lib/telemetry/tool-usage-logger';

/**
 * Funnel milestone: a verified user's first successful free-tool operation.
 * At most one row per user (migration 120 unique index). Only the tool id is stored —
 * never resume text, job descriptions, prompts or generated answers.
 */
export function recordFreeToolCompleted(userId: string, tool: ToolUsageTool): void {
  persistMilestoneEventOnce('free_tool_first_completed', { user_id: userId, tool });
}
