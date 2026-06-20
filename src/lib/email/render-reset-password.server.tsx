import 'server-only';

import * as React from 'react';
import { render } from '@react-email/render';
import ResetPasswordEmail from '@/emails/ResetPasswordEmail';

export interface RenderResetPasswordEmailInput {
  name?: string;
  resetUrl: string;
}

export async function renderResetPasswordEmail({
  name,
  resetUrl,
}: RenderResetPasswordEmailInput): Promise<{ html: string; subject: string }> {
  const element = React.createElement(ResetPasswordEmail, { name, resetUrl });
  const html = await render(element);
  return { html, subject: 'Reset your InterviewEra password' };
}
