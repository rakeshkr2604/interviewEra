import { templateRegistry } from '../../src/lib/email/templates/index';
import { extractFirstName } from './recipients';
import { getCampaignAppBaseUrl } from './env';
import type { CampaignRecipient } from './types';

export interface RenderedProductUpdateEmail {
  html: string;
  subject: string;
  firstName: string;
}

export function renderProductUpdateEmail(recipient: CampaignRecipient): RenderedProductUpdateEmail {
  const appUrl = getCampaignAppBaseUrl();
  const firstName = extractFirstName(recipient.name);

  const { html, subject } = templateRegistry.render('product_update', {
    name: firstName,
    creditsAdded: 3,
    dashboardUrl: `${appUrl}/dashboard`,
    interviewUrl: `${appUrl}/dashboard`,
    feedbackUrl: `${appUrl}/feedback`,
    unsubscribeUrl: `${appUrl}/settings`,
    showPreviewImage: true,
  });

  return { html, subject, firstName };
}
