import { createServiceClient } from '@/lib/supabase/server';
import { EmailPreference } from '../types';

export class PreferenceManager {
  private getSupabase() {
    return createServiceClient();
  }

  async getPreferences(userId: string): Promise<EmailPreference> {
    const supabase = this.getSupabase();
    const { data, error } = await supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return {
        userId,
        weeklyReports: true,
        productUpdates: true,
        marketing: true,
        achievements: true,
        interviewReminders: true,
        securityEmails: true,
        unsubscribedAll: false,
      };
    }

    return {
      userId: data.user_id,
      weeklyReports: data.weekly_reports,
      productUpdates: data.product_updates,
      marketing: data.marketing,
      achievements: data.achievements,
      interviewReminders: data.interview_reminders,
      securityEmails: true,
      unsubscribedAll: data.unsubscribed_all,
    };
  }

  async updatePreferences(userId: string, prefs: Partial<EmailPreference>): Promise<void> {
    const supabase = this.getSupabase();
    const dbData: Record<string, unknown> = {};

    if (prefs.weeklyReports !== undefined) dbData.weekly_reports = prefs.weeklyReports;
    if (prefs.productUpdates !== undefined) dbData.product_updates = prefs.productUpdates;
    if (prefs.marketing !== undefined) dbData.marketing = prefs.marketing;
    if (prefs.achievements !== undefined) dbData.achievements = prefs.achievements;
    if (prefs.interviewReminders !== undefined) dbData.interview_reminders = prefs.interviewReminders;
    if (prefs.unsubscribedAll !== undefined) dbData.unsubscribed_all = prefs.unsubscribedAll;
    dbData.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('email_preferences')
      .upsert({ user_id: userId, ...dbData });

    if (error) {
      throw new Error(`Failed to update email preferences: ${error.message}`);
    }
  }

  private templatePreferenceMap: Record<string, keyof EmailPreference> = {
    weekly_progress: 'weeklyReports',
    welcome: 'productUpdates',
    verification: 'securityEmails',
    reset_password: 'securityEmails',
    interview_completed: 'interviewReminders',
    achievement_digest: 'achievements',
  };

  async shouldSend(userId: string, templateName: string): Promise<boolean> {
    const mappedPref = this.templatePreferenceMap[templateName];
    if (!mappedPref) return true;
    if (mappedPref === 'securityEmails') return true;

    const prefs = await this.getPreferences(userId);
    if (prefs.unsubscribedAll) return false;

    return !!prefs[mappedPref];
  }
}
export const preferenceManager = new PreferenceManager();
