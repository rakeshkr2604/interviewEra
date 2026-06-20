import { getCampaignAppBaseUrl } from './env';

const FORBIDDEN_URL_PATTERN =
  /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]|\.local(?:[:/]|$)/i;

export interface CampaignUrls {
  primaryCta: string;
  secondaryCta: string;
  feedback: string;
  settings: string;
  previewImage: string;
  home: string;
}

export function buildCampaignUrls(): CampaignUrls {
  const appUrl = getCampaignAppBaseUrl();

  return {
    primaryCta: `${appUrl}/interview`,
    secondaryCta: `${appUrl}/dashboard`,
    feedback: `${appUrl}/feedback`,
    settings: `${appUrl}/settings`,
    previewImage: 'https://interviewera.com/blog/react-interview-hero.webp',
    home: appUrl,
  };
}

function validateSingleUrl(label: string, url: string): void {
  if (!url.startsWith('https://')) {
    throw new Error(`[url-validation] ${label} must use HTTPS: ${url}`);
  }

  if (FORBIDDEN_URL_PATTERN.test(url)) {
    throw new Error(`[url-validation] ${label} contains forbidden dev/local URL: ${url}`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`[url-validation] ${label} is not a valid URL: ${url}`);
  }

  if (!parsed.hostname.endsWith('interviewera.com')) {
    throw new Error(
      `[url-validation] ${label} must be on interviewera.com (got ${parsed.hostname}): ${url}`,
    );
  }
}

export function assertProductionUrls(urls: CampaignUrls): void {
  for (const [label, url] of Object.entries(urls) as [keyof CampaignUrls, string][]) {
    validateSingleUrl(label, url);
  }
}

function extractUrlsFromHtml(html: string): string[] {
  const urls: string[] = [];
  const patterns = [
    /href="([^"]+)"/gi,
    /src="([^"]+)"/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = pattern.exec(html);
    while (match) {
      urls.push(match[1]);
      match = pattern.exec(html);
    }
  }

  return urls;
}

export function assertNoLocalhostInHtml(html: string): void {
  if (FORBIDDEN_URL_PATTERN.test(html)) {
    throw new Error(
      'Rendered email HTML contains forbidden localhost/dev URL. Aborting campaign.',
    );
  }

  for (const raw of extractUrlsFromHtml(html)) {
    if (raw.startsWith('mailto:') || raw.startsWith('#') || raw.startsWith('tel:')) {
      continue;
    }

    if (FORBIDDEN_URL_PATTERN.test(raw)) {
      throw new Error(`Forbidden URL in rendered HTML: ${raw}`);
    }

    if (raw.startsWith('http://')) {
      throw new Error(`Non-HTTPS URL in rendered HTML: ${raw}`);
    }
  }
}

export function printCampaignUrls(urls: CampaignUrls): void {
  console.log('Primary CTA:');
  console.log(urls.primaryCta);
  console.log('');
  console.log('Secondary CTA:');
  console.log(urls.secondaryCta);
  console.log('');
  console.log('Feedback:');
  console.log(urls.feedback);
  console.log('');
  console.log('Settings:');
  console.log(urls.settings);
  console.log('');
}
