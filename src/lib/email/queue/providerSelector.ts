import { ResendProvider } from '../providers/resend';
import { PostmarkProvider } from '../providers/postmark';
import { AWSProvider } from '../providers/ses';
import { SMTPProvider } from '../providers/smtp';
import { EmailProvider } from '../providers';

export function getProvider(): EmailProvider {
  const name = (process.env.EMAIL_PROVIDER || 'resend').toLowerCase();
  switch (name) {
    case 'postmark':
      return new PostmarkProvider();
    case 'ses':
      return new AWSProvider();
    case 'smtp':
      return new SMTPProvider();
    case 'resend':
    default:
      return new ResendProvider();
  }
}
