import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY?.trim();

if (!apiKey && process.env.NODE_ENV === 'production') {
  console.warn('[email] Warning: RESEND_API_KEY is not defined in production.');
}

export const resend = new Resend(apiKey || 'mock-key');
