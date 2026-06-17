import { EmailProvider } from './index';
import { SendEmailPayload, SendEmailResult } from '../types';

export class PostmarkProvider implements EmailProvider {
  private serverToken: string;

  constructor(serverToken?: string) {
    this.serverToken = serverToken || process.env.POSTMARK_SERVER_TOKEN || 'pm_mock_token';
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const fromAddress = payload.from || process.env.EMAIL_FROM || 'noreply@interviewera.com';
      
      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Postmark-Server-Token': this.serverToken,
        },
        body: JSON.stringify({
          From: fromAddress,
          To: payload.to,
          Subject: payload.subject,
          HtmlBody: payload.html,
          TextBody: payload.text || '',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          errorMessage: `Postmark error: ${errorText} (status ${response.status})`,
        };
      }

      const data = (await response.json()) as { MessageID?: string };

      return {
        success: true,
        messageId: data.MessageID || 'postmark-id',
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown Postmark error',
      };
    }
  }
}
