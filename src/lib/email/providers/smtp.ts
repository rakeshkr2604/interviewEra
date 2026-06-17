import { EmailProvider } from './index';
import { SendEmailPayload, SendEmailResult } from '../types';

export class SMTPProvider implements EmailProvider {
  private host: string;
  private port: number;

  constructor(host?: string, port?: number) {
    this.host = host || process.env.SMTP_HOST || 'smtp.hostinger.com';
    this.port = port || Number(process.env.SMTP_PORT) || 587;
  }

  async send(payload: SendEmailPayload): Promise<SendEmailResult> {
    try {
      const fromAddress = payload.from || process.env.EMAIL_FROM || 'noreply@interviewera.com';
      
      // Local SMTP fallback logging stub
      console.log(`[SMTP - ${this.host}:${this.port}] Dispatching to ${payload.to} via ${fromAddress}`);
      
      return {
        success: true,
        messageId: `smtp-${Math.random().toString(36).substring(2, 11)}`,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown SMTP error',
      };
    }
  }
}
