import { createHmac } from 'crypto';

export function generateSignedUrl(targetUrl: string, jobId: string, secret: string, baseUrl: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(`${jobId}:${targetUrl}`);
  const signature = hmac.digest('hex');
  
  return `${baseUrl}/api/email/track/click?job_id=${encodeURIComponent(jobId)}&url=${encodeURIComponent(targetUrl)}&sig=${signature}`;
}

export function verifySignature(jobId: string, targetUrl: string, signature: string, secret: string): boolean {
  const hmac = createHmac('sha256', secret);
  hmac.update(`${jobId}:${targetUrl}`);
  const expected = hmac.digest('hex');
  return expected === signature;
}

export function injectOpenTracker(html: string, jobId: string, baseUrl: string): string {
  const pixelUrl = `${baseUrl}/api/email/track/open?job_id=${encodeURIComponent(jobId)}`;
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" style="display: none;" alt="" />`;
  
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}</body>`);
  }
  return html + pixelHtml;
}

export function rewriteLinks(html: string, jobId: string, secret: string, baseUrl: string): string {
  const hrefRegex = /href="([^"]+)"/g;
  
  return html.replace(hrefRegex, (match, url) => {
    // Skip anchor tags, email addresses, and tracking links
    if (url.startsWith('#') || url.startsWith('mailto:') || url.includes('/api/email/track/')) {
      return match;
    }
    const signed = generateSignedUrl(url, jobId, secret, baseUrl);
    return `href="${signed}"`;
  });
}
