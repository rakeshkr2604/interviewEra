/**
 * InterviewEra pricing WhatsApp support — sales / plan questions.
 * Opens WhatsApp chat (no server round-trip); phone is E.164 without '+'.
 */

export const IE_WHATSAPP_SUPPORT = {
  /** Display number (India) */
  displayPhone: '9709999477',
  /** E.164 without '+': country 91 + mobile */
  e164: '919709999477',
  brand: 'InterviewEra',
} as const;

export type PricingEnquiryPayload = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

/** Direct chat opener — short interest ping. */
export function pricingWhatsAppInterestMessage(): string {
  return `Hi ${IE_WHATSAPP_SUPPORT.brand}! I'm interested in your interview practice plans and have a few questions.`;
}

/** Callback enquiry — structured so the team can reply fast. */
export function pricingWhatsAppCallbackMessage(payload: PricingEnquiryPayload): string {
  const name = payload.name.trim();
  const email = payload.email.trim();
  const phone = payload.phone.trim();
  const message = payload.message.trim();

  const lines = [
    `Hi ${IE_WHATSAPP_SUPPORT.brand}!`,
    '',
    "I'd like a callback about InterviewEra plans.",
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone.startsWith('+') ? phone : `+91 ${phone}`}`,
  ];

  if (message) {
    lines.push('', `Message: ${message}`);
  }

  return lines.join('\n');
}

/**
 * WhatsApp click-to-chat URL (same destination as api.whatsapp.com/send).
 * Prefer wa.me — lighter redirect; works on mobile app + WhatsApp Web.
 */
export function buildWhatsAppChatUrl(text: string): string {
  const params = new URLSearchParams({
    text,
  });
  return `https://wa.me/${IE_WHATSAPP_SUPPORT.e164}?${params.toString()}`;
}
