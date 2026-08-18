import { ReceiptText } from 'lucide-react';
import type { LegalDocumentMeta } from './types';
import { COMPANY_ADDRESS } from './privacy-content';

/**
 * Refund Policy — production content (founder-reviewed July 2026).
 */
export const refundDocument: LegalDocumentMeta = {
  title: 'Refund Policy',
  path: '/refund',
  description:
    "Understand InterviewEra's refund policy for one-time plan payments, credits, and promotional discounts.",
  icon: ReceiptText,
  effectiveDate: '1 May 2026',
  lastUpdated: '22 July 2026',
  isDraftRevision: false,
  intro:
    'We want you to be happy with InterviewEra. Here is our straightforward policy on credits, cancellations, promotional discounts, and refunds.',
  highlightsTitle: 'Policy at a glance',
  highlights: [
    { label: 'Credit refunds', value: 'Technical issues only' },
    { label: 'Plan access period', value: '30 days per payment' },
    { label: 'Auto-renewal', value: 'None — renew manually' },
    { label: 'Pro-rated refunds', value: 'Not applicable' },
    { label: 'Promo code after refund', value: 'May be voided / not reusable' },
    { label: 'Response time', value: 'Within 5 business days' },
  ],
  sections: [
    {
      id: 'credits',
      title: '1. Credit Policy',
      content: [
        {
          sub: 'When Credits Are Deducted',
          text: 'One credit is consumed when you start a mock interview session. Credits are deducted at session start, not on completion. A session that is started but abandoned still uses the credit.',
        },
        {
          sub: 'Credit Refunds',
          text: 'Credits are generally non-refundable once consumed. If a technical issue prevents your interview from being completed, report it through Feedback → Interview technical issue with details. Screenshots are optional but can help investigation. If the issue is confirmed after review, the interview credit may be restored. Payment billing errors remain a separate refund process via support@interviewera.com or /contact.',
        },
        {
          sub: 'Free Credits',
          text: 'The lifetime free credits (3 for new signups) cannot be refunded or transferred. Unused free credits do not carry over if you delete your account.',
        },
      ],
    },
    {
      id: 'plans',
      title: '2. Paid Plan Payments',
      callout: {
        tone: 'warning',
        title: 'Generally non-refundable',
        body: 'One-time plan payments are generally non-refundable once access has been granted, except where required by law, where a billing error occurred, or as expressly described in this policy.',
      },
      content: [
        {
          sub: 'One-Time Access (Starter & Pro)',
          text: 'Starter and Pro are one-time payments that grant 30 days of plan access and a fixed credit allowance for that period. There is no auto-renewal. When access expires, your account returns to the free tier unless you pay again. The amount charged may be a discounted price if a valid promo or campaign code was applied at checkout.',
        },
        {
          sub: 'Early Renewal',
          text: 'You may renew before your current period ends from Settings → Billing. A new payment extends your access from your existing expiry date. Renewal adds the new plan\'s credits to your remaining balance.',
        },
        {
          sub: 'Refund Eligibility',
          text: 'One-time plan payments are generally non-refundable once access has been granted, except where required by law or where a billing error occurred. Unused credits within an active 30-day period are not refundable on their own.',
        },
      ],
    },
    {
      id: 'promo-codes',
      title: '3. Promo Codes, Campaign Discounts & Referrals',
      content: [
        {
          sub: 'Discounted checkouts',
          text: 'If you pay a discounted amount using a promo or campaign code, any approved monetary refund (for example for a verified duplicate charge) is calculated against the amount actually paid via Razorpay — not the undiscounted list price — unless we state otherwise in writing.',
        },
        {
          sub: 'Code consumption',
          text: 'When a discounted payment successfully activates a plan, the related code redemption is typically marked consumed and counted against the campaign’s limits. A refund of that payment does not automatically entitle you to reuse the same code. We may void, reverse, or refuse further redemptions associated with refunded or chargebacked orders to prevent abuse.',
        },
        {
          sub: 'Failed or abandoned payments',
          text: 'If checkout fails or is dismissed before successful payment, temporary code reservations may be released so the code can be tried again subject to remaining campaign limits and eligibility rules.',
        },
        {
          sub: 'Referral / reward credits',
          text: 'Credits granted through referral or reward programmes are promotional. They are not cash-refundable. Fraudulent or self-referral farming may result in clawback of credits and related benefits.',
        },
      ],
    },
    {
      id: 'prorated',
      title: '4. Pro-Rated Refunds',
      text: 'We do not offer pro-rated refunds for partial access periods or unused credits on paid plans. For example, if you purchase Pro and use 10 credits, you will not receive a partial refund for the remaining credits if your 30-day period ends. Billing errors and technical issues are handled as described below.',
    },
    {
      id: 'technical',
      title: '5. Refunds for Technical Issues',
      text: 'If you experience a billing error (e.g., charged twice, wrong amount), contact us within 30 days of the issue. If a technical issue prevents your interview from being completed, report it through Feedback → Interview technical issue. If the issue is confirmed after review, the interview credit may be restored.',
      bullets: [
        'Duplicate charge: full refund of the duplicate amount actually paid',
        'Wrong amount charged vs authorised order: correction or refund of the difference after verification',
        'Confirmed technical interview failure: interview credit may be restored after review',
      ],
    },
    {
      id: 'process',
      title: '6. Refund Process',
      content: [
        {
          sub: 'Requesting a Refund',
          text: 'Email support@interviewera.com or use /contact with your registered email address, the Razorpay order or payment ID (from your billing receipt), the reason for the refund request, and any relevant screenshots or error details. If a promo code was used, include the code.',
        },
        {
          sub: 'Processing Time',
          text: 'We will review your request and respond within 5 business days. Approved refunds are processed within 7–10 business days and credited to the original payment method (credit/debit card or bank account). UPI refunds typically arrive within 2–3 business days. Exact bank posting times are outside InterviewEra’s control.',
        },
        {
          sub: 'Currency',
          text: 'All refunds are issued in Indian Rupees (INR) via Razorpay. If your card was charged in a different currency due to bank conversion, the refund amount in INR may differ from the amount shown on your statement.',
        },
      ],
    },
    {
      id: 'campus',
      title: '7. Campus / Institutional Plans',
      text: 'Refund terms for Campus B2B plans are governed by the specific agreement between InterviewEra and the institution. Please refer to your contract or contact your InterviewEra account manager for details.',
    },
    {
      id: 'contact',
      title: '8. Contact Us',
      text: 'For refund requests, billing queries, or cancellation assistance:',
      contact: {
        email: 'support@interviewera.com',
        address: COMPANY_ADDRESS,
      },
    },
  ],
  related: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms & Conditions' },
    { href: '/contact', label: 'Contact' },
    { href: '/', label: 'Back to home' },
  ],
};
