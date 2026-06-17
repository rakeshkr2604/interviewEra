import { Resend } from 'resend';
import { EmailProvider } from './index';
import { SendEmailPayload, SendEmailResult } from '../types';

export class ResendProvider implements EmailProvider {
  private client: Resend;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.RESEND_API_KEY || 're_mock_api_key';
    this.client = new Resend(key);
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const fromAddress = payload.from || process.env.EMAIL_FROM || 'InterviewEra <noreply@interviewera.com>';
      const response = await this.client.emails.send({
        from: fromAddress,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });

      if (response.error) {
        return {
          success: false,
          errorMessage: response.error.message,
        };
      }

      return {
        success: true,
        messageId: response.data?.id || 'resend-id',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown Resend error',
      };
    }
  }
}
