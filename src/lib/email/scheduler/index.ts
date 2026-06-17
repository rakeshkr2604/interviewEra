import { createServiceClient } from '@/lib/supabase/server';
import { eventProcessor } from '../events';

export class EmailScheduler {
  private getSupabase() {
    return createServiceClient();
  }

  async scheduleWeeklyReports(): Promise<number> {
    const supabase = this.getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name');

    if (error || !users) return 0;

    let triggeredCount = 0;
    for (const user of users) {
      const jobId = await eventProcessor.processEvent(
        'weekly.summary',
        user.id,
        user.email,
        {
          candidateName: user.display_name || 'there',
          weekStart: 'Jun 10',
          weekEnd: 'Jun 17',
          streak: 5,
          interviewsCompleted: 3,
          practiceMinutes: 120,
          previousWeekScore: 79,
          currentWeekScore: 87,
          dimensions: {
            communication: { current: 91, previous: 80 },
            technical: { current: 83, previous: 85 },
            confidence: { current: 89, previous: 85 },
            problemSolving: { current: 86, previous: 82 },
            structure: { current: 84, previous: 80 },
          },
          achievements: [
            '🏅 Excellent Communicator',
            '🔥 5 Mock Interview Streak',
            '⭐ Top 20%',
          ],
          weeklyGoal: {
            goalText: 'Complete 5 mock interviews',
            targetCount: 5,
            currentCount: 3,
          },
          leaderboard: {
            percentile: 18,
            role: 'Frontend Engineer',
          },
          reportUrl: 'https://interviewera.com/dashboard',
          practiceUrl: 'https://interviewera.com/practice',
          unsubscribeUrl: 'https://interviewera.com/unsubscribe',
        }
      );
      if (jobId) triggeredCount++;
    }
    return triggeredCount;
  }

  async scheduleInactivityChecks(): Promise<number> {
    const supabase = this.getSupabase();
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, display_name')
      .limit(10);

    if (error || !users) return 0;

    let triggeredCount = 0;
    for (const user of users) {
      const jobId = await eventProcessor.processEvent(
        'user.inactive.7days',
        user.id,
        user.email,
        {
          candidateName: user.display_name || 'there',
        }
      );
      if (jobId) triggeredCount++;
    }
    return triggeredCount;
  }
}
export const emailScheduler = new EmailScheduler();
