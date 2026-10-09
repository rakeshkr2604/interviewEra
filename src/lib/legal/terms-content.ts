import { FileText } from 'lucide-react';
import type { LegalDocumentMeta } from './types';
import { COMPANY_ADDRESS } from './privacy-content';
import { PAID_PLANS } from '@/lib/pricing/plans';

/**
 * Terms & Conditions — production content (founder-reviewed July 2026).
 */
export const termsDocument: LegalDocumentMeta = {
  title: 'Terms & Conditions',
  path: '/terms',
  description:
    'Read the terms and conditions governing your use of InterviewEra.com — an AI-powered mock interview platform.',
  icon: FileText,
  effectiveDate: '1 May 2026',
  lastUpdated: '9 October 2026',
  isDraftRevision: false,
  intro:
    'Please read these Terms carefully before using InterviewEra. By creating an account or using the Service you agree to be bound by them.',
  highlightsTitle: 'Key terms at a glance',
  highlights: [
    { label: 'Governing law', value: 'Laws of India' },
    { label: 'Minimum age', value: '18+' },
    { label: 'Paid plans', value: 'One-time · no auto-renewal' },
    { label: 'Liability cap', value: 'Fees paid in prior 3 months' },
    { label: 'Promo / rewards codes', value: 'Non-transferable · anti-fraud rules apply' },
  ],
  sections: [
    {
      id: 'acceptance',
      title: '1. Acceptance of Terms',
      text: 'By accessing or using InterviewEra.com ("the Service"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the Service. These terms apply to all users, including students, professionals, and institutional accounts.',
    },
    {
      id: 'description',
      title: '2. Description of Service',
      text: 'InterviewEra provides an AI-powered mock interview platform that includes resume parsing, personalised question generation, scored answer evaluation, performance tracking, and related practice tools. The Service is offered under a credit-based model with free and paid plan tiers, and may include referral, campaign, or promotional offers from time to time.',
    },
    {
      id: 'accounts',
      title: '3. User Accounts',
      bullets: [
        'You must be at least 18 years old to create an account',
        'You are responsible for maintaining the confidentiality of your login credentials',
        'You must provide accurate and complete registration information',
        'You may not share your account with others or create multiple accounts to circumvent credit limits',
        'You must notify us immediately at support@interviewera.com if you suspect unauthorised access to your account',
      ],
    },
    {
      id: 'credits-billing',
      title: '4. Credits, Billing & Plans',
      content: [
        {
          sub: 'Free Tier',
          text: 'New free accounts receive 3 lifetime credits at no cost. No payment method is required to start. Free credits do not expire.',
        },
        {
          sub: 'Credit Deduction',
          text: 'One credit is deducted when you start a mock interview session. Credits are not deducted on completion. Partially completed sessions still consume a credit.',
        },
        {
          sub: 'Paid Plans (One-Time)',
          text: `Starter (₹${PAID_PLANS.starter.amountInr}) and Pro (₹${PAID_PLANS.pro.amountInr}) are one-time payments that grant 30 days of plan access and a fixed credit allowance for that period. Prices are displayed in Indian Rupees (INR). The total amount payable is shown before you complete checkout. Plans do not auto-renew — renew manually whenever you need continued access.`,
        },
        {
          sub: 'Payment Processing',
          text: 'Payments are processed by Razorpay (UPI, cards, net banking, wallets, and more). By completing checkout, you authorise Razorpay to charge the applicable one-time fee (including any discounted amount after a valid promo or campaign code). InterviewEra does not store your card or bank account details.',
        },
        {
          sub: 'No Auto-Renewal',
          text: 'Paid plans do not renew automatically. When your 30-day access period ends, your account returns to the free tier unless you make another one-time payment. You may renew early from Settings to extend access from your current expiry date; renewal adds the new plan\'s credits to your remaining balance.',
        },
      ],
    },
    {
      id: 'rewards-promos',
      title: '5. Referrals, Promo Codes & Rewards',
      callout: {
        tone: 'critical',
        title: 'Important',
        body: 'Promo codes, campaign codes, sponsorship offers, and referral rewards are privileges, not entitlements. InterviewEra may refuse, reverse, or void redemptions that appear fraudulent, abusive, or obtained in error.',
      },
      content: [
        {
          sub: 'Eligibility & one-time use',
          text: 'Unless we state otherwise in writing for a specific campaign, each user may redeem a given campaign or promo code only once. Codes may be limited to specific plans, time windows, maximum redemption counts, or partner audiences.',
        },
        {
          sub: 'Non-transferable',
          text: 'Codes, reserved discounts, and referral rewards are personal to your account and may not be sold, transferred, shared publicly in a way that enables mass abuse, or exchanged for cash unless we expressly say so.',
        },
        {
          sub: 'Reservations & abandoned checkouts',
          text: 'Applying a code at checkout may temporarily reserve capacity against that code. If payment is not completed, the reservation may be released automatically or on failure of payment. Retrying checkout may release a prior open reservation for the same user and code.',
        },
        {
          sub: 'Fraud & misuse',
          text: 'Creating multiple accounts, using stolen payment instruments, self-referrals designed solely to farm credits, or otherwise gaming rewards programmes is prohibited. We may cancel related credits, discounts, or plan activations and suspend accounts.',
        },
        {
          sub: 'Changes',
          text: 'We may modify, suspend, or end any referral or promo programme at any time. Changes do not affect discounts already successfully paid and activated except where required to correct fraud, error, or legal compliance.',
        },
      ],
    },
    {
      id: 'acceptable-use',
      title: '6. Acceptable Use',
      intro: 'You agree not to:',
      bullets: [
        'Attempt to reverse-engineer, scrape, or extract AI models, prompts, or question banks from the Service',
        'Use the Service for any illegal purpose or in violation of applicable law',
        'Distribute, sell, or sublicense access to the Service or your account credentials',
        'Upload malicious files, attempt to inject harmful code, or probe for security vulnerabilities without explicit written permission',
        'Create fake accounts, manipulate leaderboards, or misrepresent your identity',
        'Use automated scripts or bots to interact with the Service',
        'Abuse referral, promo, or rewards systems as described in Section 5',
      ],
      footer: 'Violations may result in immediate account suspension and, where applicable, legal action.',
    },
    {
      id: 'ip',
      title: '7. Intellectual Property',
      text: 'The Service, including its AI models, user interface, brand identity, and platform code, is owned by InterviewEra and protected by copyright and intellectual property laws. Your resume content and interview transcripts remain your property. By uploading content, you grant InterviewEra a limited, non-exclusive licence to process that content solely to provide the Service.',
    },
    {
      id: 'ai-limitations',
      title: '8. AI-Generated Content',
      text: 'Interview questions and evaluations are generated by AI and are provided for educational and practice purposes only. They do not constitute professional career advice. AI assessments may contain errors or biases. InterviewEra makes no guarantee that practising with the Service will result in job offers or improved interview outcomes. Results depend on the user\'s own effort and preparedness.',
    },
    {
      id: 'disclaimer',
      title: '9. Disclaimer of Warranties',
      text: 'The Service is provided "as is" and "as available" without warranties of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement. InterviewEra does not warrant that the Service will be uninterrupted, error-free, or free of viruses.',
    },
    {
      id: 'liability',
      title: '10. Limitation of Liability',
      callout: {
        tone: 'critical',
        title: 'Liability cap',
        body: 'To the maximum extent permitted by applicable law, InterviewEra’s total aggregate liability to you for any claim shall not exceed the amount you paid to us in the three months preceding the claim.',
      },
      text: 'To the maximum extent permitted by applicable law, InterviewEra shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of or inability to use the Service. Our total aggregate liability to you for any claim shall not exceed the amount you paid to us in the three months preceding the claim.',
    },
    {
      id: 'termination',
      title: '11. Termination',
      text: 'We reserve the right to suspend or terminate your account at our sole discretion if you violate these Terms. You may delete your account at any time from Settings. Upon termination, your right to use the Service ceases immediately. Provisions that by their nature should survive termination (including intellectual property, disclaimers, limitation of liability, and governing law) shall survive.',
    },
    {
      id: 'governing-law',
      title: '12. Governing Law & Disputes',
      text: 'These Terms are governed by and construed in accordance with the laws of India. Before initiating formal proceedings, you agree to attempt resolution by contacting support@interviewera.com or using /contact. Exclusive court venue (if any) will be stated here once the legal entity and registered office are confirmed — until then, disputes are governed by applicable Indian law without a published exclusive venue claim.',
    },
    {
      id: 'changes',
      title: '13. Changes to Terms',
      text: 'We may revise these Terms from time to time. Material changes will be communicated via email or an in-app notice at least 14 days before they take effect where practicable. Continued use of the Service after the effective date constitutes acceptance of the revised Terms.',
    },
    {
      id: 'contact',
      title: '14. Contact',
      text: 'For questions about these Terms, please contact:',
      contact: {
        email: 'support@interviewera.com',
        address: COMPANY_ADDRESS,
      },
    },
  ],
  related: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/refund', label: 'Refund Policy' },
    { href: '/contact', label: 'Contact' },
    { href: '/', label: 'Back to home' },
  ],
};
