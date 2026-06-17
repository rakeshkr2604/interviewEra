import { SendEmailPayload, SendEmailResult } from '../types';

export interface EmailProvider {
  send(payload: SendEmailPayload): Promise<SendEmailResult>;
}
