import { EmailProvider } from './index';
import { SendEmailPayload, SendEmailResult } from '../types';

export class AWSProvider implements EmailProvider {
  private region: string;

  constructor(region?: string) {
    this.region = region || process.env.AWS_REGION || 'us-east-1';
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const fromAddress = payload.from || process.env.EMAIL_FROM || 'noreply@interviewera.com';
      
      // AWS SES native integration console/REST stub
      console.log(`[AWS SES - ${this.region}] Dispatching to ${payload.to} via ${fromAddress}`);
      
      return {
        success: true,
        messageId: `ses-${Math.random().toString(36).substring(2, 11)}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown AWS SES error',
      };
    }
  }
}
