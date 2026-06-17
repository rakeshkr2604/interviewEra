import { createServiceClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { EmailEventType } from '../types';
import { preferenceManager } from '../preferences';

export class EventProcessor {
  private getSupabase() {
    return createServiceClient();
  }

  async processEvent(
    eventType: EmailEventType,
    userId: string,
    recipientEmail: string,
    payload: Record<string, unknown>
  ): Promise<string | null> {
    const supabase = this.getSupabase();
    
    // Log event
    const { data: eventData, error: eventError } = await supabase
      .from('email_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        payload,
      })
      .select('id')
      .single();

    if (eventError || !eventData) {
      throw new Error(`Failed to log email event: ${eventError?.message}`);
    }

    const eventId = eventData.id;

    // Map event type to template name
    let templateName = 'welcome';
    switch (eventType) {
      case 'user.signup':
        templateName = 'welcome';
        break;
      case 'user.email_verified':
        templateName = 'welcome';
        break;
      case 'interview.completed':
        templateName = 'interview_completed';
        break;
      case 'weekly.summary':
        templateName = 'weekly_progress';
        break;
      default:
        templateName = 'welcome';
        break;
    }

    // Verify preferences
    const shouldSend = await preferenceManager.shouldSend(userId, templateName);
    if (!shouldSend) {
      // Mark event processed
      await supabase
        .from('email_events')
        .update({ processed: true })
        .eq('id', eventId);
      
      return null;
    }

    // Create email job
    const correlationId = randomUUID();
    const { data: jobData, error: jobError } = await supabase
      .from('email_jobs')
      .insert({
        event_id: eventId,
        user_id: userId,
        recipient_email: recipientEmail,
        template_name: templateName,
        status: 'pending',
        correlation_id: correlationId,
        payload,
        next_attempt_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (jobError || !jobData) {
      throw new Error(`Failed to queue email job: ${jobError?.message}`);
    }

    // Mark event processed
    await supabase
      .from('email_events')
      .update({ processed: true })
      .eq('id', eventId);

    return jobData.id;
  }
}
export const eventProcessor = new EventProcessor();
