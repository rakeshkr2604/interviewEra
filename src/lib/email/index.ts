import { eventProcessor } from './events';
import { emailQueueWorker } from './queue';
import { emailScheduler } from './scheduler';
import { emailAnalytics } from './analytics';
import { preferenceManager } from './preferences';
import { templateRegistry } from './templates';
import { EmailEventType } from './types';

export class EmailAutomationEngine {
  /**
   * Triggers a lifecycle email event, resolving preferences and queueing a job.
   */
  async triggerEvent(
    eventType: EmailEventType,
    userId: string,
    recipientEmail: string,
    payload: Record<string, unknown>
  ): Promise<string | null> {
    return eventProcessor.processEvent(eventType, userId, recipientEmail, payload);
  }

  /**
   * Processes a batch of queued emails, retrying failures and routing to DLQ.
   */
  async processQueue(batchSize: number = 10): Promise<void> {
    return emailQueueWorker.processBatch(batchSize);
  }

  /**
   * Executes scheduled lifecycle routines (Weekly digest, Reactivation checks).
   */
  async runDailySchedulers(): Promise<{ weeklyReportJobs: number; inactivityJobs: number }> {
    const weeklyReportJobs = await emailScheduler.scheduleWeeklyReports();
    const inactivityJobs = await emailScheduler.scheduleInactivityChecks();
    return { weeklyReportJobs, inactivityJobs };
  }

  get analytics() { return emailAnalytics; }
  get preferences() { return preferenceManager; }
  get templates() { return templateRegistry; }
}

export const emailAutomationEngine = new EmailAutomationEngine();
export * from './types';
