import { describe, expect, it } from 'vitest';
import {
  buildWhatsAppChatUrl,
  IE_WHATSAPP_SUPPORT,
  pricingWhatsAppCallbackMessage,
  pricingWhatsAppInterestMessage,
} from '@/lib/pricing/whatsapp-support';

describe('pricing WhatsApp support', () => {
  it('targets the InterviewEra India support number', () => {
    expect(IE_WHATSAPP_SUPPORT.e164).toBe('919709999477');
    expect(IE_WHATSAPP_SUPPORT.displayPhone).toBe('9709999477');
  });

  it('builds a wa.me URL with prefilled interest text', () => {
    const url = buildWhatsAppChatUrl(pricingWhatsAppInterestMessage());
    expect(url.startsWith('https://wa.me/919709999477?')).toBe(true);
    expect(url).toContain(encodeURIComponent('InterviewEra'));
  });

  it('formats callback enquiry with contact fields', () => {
    const text = pricingWhatsAppCallbackMessage({
      name: 'Rakesh',
      email: 'rakesh@example.com',
      phone: '9709999477',
      message: 'Which plan for campus placements?',
    });
    expect(text).toContain('callback');
    expect(text).toContain('Name: Rakesh');
    expect(text).toContain('Email: rakesh@example.com');
    expect(text).toContain('+91 9709999477');
    expect(text).toContain('Which plan for campus placements?');
  });
});
