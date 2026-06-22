import { templateRegistry } from '../../src/lib/email/templates/index';
import { PRODUCT_UPDATE_SUBJECT } from './email-config';
import { extractFirstName } from './recipients';
import { buildCampaignUrls, type CampaignUrls } from './url-validation';
import type { CampaignRecipient } from './types';

export interface RenderedProductUpdateEmail {
  html: string;
  subject: string;
  firstName: string;
  urls: CampaignUrls;
}

export async function renderProductUpdateEmail(
  recipient: CampaignRecipient,
  urls: CampaignUrls = buildCampaignUrls(),
): Promise<RenderedProductUpdateEmail> {
  const firstName = extractFirstName(recipient.name);

  const { html } = await templateRegistry.render('product_update', {
    name: firstName,
    creditsAdded: 3,
    dashboardUrl: urls.secondaryCta,
    interviewUrl: urls.primaryCta,
    feedbackUrl: urls.feedback,
    unsubscribeUrl: urls.settings,
    previewImageUrl: urls.previewImage,
    showPreviewImage: true,
  });

  return { html, subject: PRODUCT_UPDATE_SUBJECT, firstName, urls };
}
