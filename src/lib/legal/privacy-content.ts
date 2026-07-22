import { Shield } from 'lucide-react';
import type { LegalDocumentMeta } from './types';

/** Company address — keep in sync across privacy / terms / refund contact blocks. */
export const COMPANY_ADDRESS =
  'Friends Colony, Road No. 12, Pandra, Ranchi, Jharkhand, India 835222';

export const GRIEVANCE_OFFICER = {
  name: 'Rakesh Kumar',
  designation: 'Founder',
  email: 'founder@interviewera.com',
} as const;

/**
 * Privacy Policy — production content (founder-reviewed July 2026).
 */
export const privacyDocument: LegalDocumentMeta = {
  title: 'Privacy Policy',
  path: '/privacy',
  description:
    'Learn how InterviewEra collects, uses, and protects your personal data under applicable Indian data protection law.',
  icon: Shield,
  effectiveDate: '1 May 2026',
  lastUpdated: '22 July 2026',
  isDraftRevision: false,
  intro:
    'This policy explains what information InterviewEra.com collects, how we use it, who we share it with, and your rights as a Data Principal under India’s Digital Personal Data Protection Act, 2023 (DPDP Act) and, where applicable, other laws.',
  highlightsTitle: 'Privacy at a glance',
  highlights: [
    { label: 'Data Fiduciary', value: 'InterviewEra (India)' },
    { label: 'Primary storage region', value: 'Singapore (Supabase)' },
    { label: 'We sell your data?', value: 'No' },
    { label: 'Account deletion', value: 'Within 30 days' },
    { label: 'Grievance contact', value: GRIEVANCE_OFFICER.email },
  ],
  sections: [
    {
      id: 'data-fiduciary',
      title: '1. Who We Are (Data Fiduciary)',
      text: `InterviewEra operates InterviewEra.com and related apps (the “Service”). For personal data processed in connection with the Service for individuals in India, InterviewEra acts as a Data Fiduciary under the DPDP Act, 2023. Contact for general privacy queries: support@interviewera.com. Registered / operating address: ${COMPANY_ADDRESS}.`,
      content: [
        {
          sub: 'Scope',
          text: 'This notice covers personal data processed digitally through the Service, including accounts created by campus students, early-career professionals, college administrators, and visitors who submit our contact form.',
        },
      ],
    },
    {
      id: 'data-collected',
      title: '2. Information We Collect',
      content: [
        {
          sub: 'Account & Profile',
          text: 'When you register, we collect your name, email address, and (optionally) your target role and placement date. We do not collect payment card numbers directly — card processing is handled by Razorpay.',
        },
        {
          sub: 'Resume Data',
          text: 'When you upload a resume, we store the original file in Supabase Storage and extract structured data (skills, experience, education) via AI parsing. This parsed data is used to personalise interview questions and related practice features.',
        },
        {
          sub: 'Interview Transcripts & Scores',
          text: 'Your answers to mock interview questions, AI-generated scores, feedback, and related session metadata are stored so you can review history and track progress.',
        },
        {
          sub: 'Referrals, Promo Codes & Rewards',
          text: 'If you use a referral link, campaign / promo code, or sponsorship offer, we store code identifiers, reservation and redemption status, associated plan and discounted amounts, and links to your user account and payment order IDs. This is required to apply discounts correctly, prevent duplicate or fraudulent use, and reconcile payments.',
        },
        {
          sub: 'Contact & Support Messages',
          text: 'If you write to us via the contact form or email, we process your name, email, and message content to respond to your request.',
        },
        {
          sub: 'Usage & Analytics',
          text: 'We collect product and page-usage events (for example pages visited, feature usage, session timing) via our own analytics pipeline and providers such as Vercel Analytics, Google Analytics 4, and Microsoft Clarity, to understand product usage and improve the platform. Where possible we minimise personal identifiers in analytics payloads.',
        },
        {
          sub: 'Payment Information',
          text: 'Plan payments are processed by Razorpay. We store your plan tier, access period, payment status, order identifiers, and amounts (including discounted amounts when a promo code was applied). We never receive or store raw card details.',
        },
      ],
    },
    {
      id: 'how-we-use',
      title: '3. How We Use Your Information',
      bullets: [
        'Deliver and personalise your mock interview sessions',
        'Generate AI-powered questions and evaluations tailored to your resume and target role',
        'Store and display your performance history and score trends',
        'Process one-time plan payments, promo/campaign discounts, and manage plan access',
        'Operate referral and rewards programmes (credit grants, attribution, fraud prevention)',
        'Send transactional emails (welcome, verification, password reset, interview completion, billing) via Resend',
        'Respond to support and contact-form messages',
        'Detect and prevent abuse, fraud, and violations of our Terms',
        'Improve our models and platform features using aggregated or de-identified data where practicable',
      ],
      footer:
        'We do not sell your personal information. We do not use your interview content for third-party advertising.',
    },
    {
      id: 'lawful-basis',
      title: '4. Consent & Lawful Processing',
      content: [
        {
          sub: 'Consent',
          text: 'By creating an account or submitting personal data through the Service, you consent to processing described in this notice for the stated purposes. You may withdraw consent for optional processing by contacting us or using in-product controls where available. Withdrawal does not affect processing already completed lawfully, and may limit your ability to use parts of the Service that depend on that data.',
        },
        {
          sub: 'Necessary for the Service',
          text: 'Certain processing is necessary to provide the Service you request (account authentication, interview delivery, payment fulfilment, security). If you refuse that processing, we may be unable to provide the Service.',
        },
      ],
    },
    {
      id: 'cookies',
      title: '5. Cookies & Local Storage',
      content: [
        {
          sub: 'Session Cookies',
          text: 'We use Supabase Auth session cookies to keep you signed in across page visits. These are strictly necessary for the Service to function.',
        },
        {
          sub: 'Theme Preference',
          text: 'Your light/dark mode choice may be stored in localStorage (for example under "ie-theme"). This preference stays in your browser.',
        },
        {
          sub: 'Analytics',
          text: 'Analytics providers may set first-party or similar identifiers to measure usage. We do not set third-party advertising cookies for ad retargeting.',
        },
      ],
    },
    {
      id: 'data-sharing',
      title: '6. Data Sharing, Processors & Cross-Border Transfers',
      callout: {
        tone: 'info',
        title: 'Cross-border processing',
        body: 'Your data may be processed outside India by our service providers (for example database hosting in Singapore and AI inference providers). Under the DPDP Act, transfers abroad are generally permitted except to countries restricted by the Central Government. We will update this notice if a restricted-country list affects our providers.',
      },
      content: [
        {
          sub: 'Supabase',
          text: 'Database, Auth, and file storage. Data is stored in servers located in Singapore (ap-southeast-1) by default. Supabase acts as a data processor under our instructions.',
        },
        {
          sub: 'AI providers (OpenRouter-routed models)',
          text: 'We send interview-related content (for example resume excerpts and answer text) to large-language-model providers via our routing layer to generate questions and evaluations. We do not intentionally send your account password. Provider data policies apply to content processed by their APIs.',
        },
        {
          sub: 'Razorpay',
          text: "Payment processing in India. Your billing data is governed by Razorpay's privacy policy.",
        },
        {
          sub: 'Vercel',
          text: 'Hosting and CDN. Vercel may log IP addresses and request metadata for security and performance.',
        },
        {
          sub: 'Resend',
          text: 'Transactional email delivery. We share your email address and the content of the email being sent.',
        },
        {
          sub: 'Analytics providers',
          text: 'Vercel Analytics, Google Analytics 4, and Microsoft Clarity may process usage telemetry as described in their respective policies.',
        },
        {
          sub: 'Legal Disclosures',
          text: 'We may disclose your data if required by applicable law, court order, or governmental authority, or to protect the rights and safety of our users.',
        },
      ],
    },
    {
      id: 'security',
      title: '7. Data Security',
      text: 'We implement industry-standard security measures including TLS encryption in transit, Row Level Security (RLS) policies in our database (so each user can normally only access their own data), service-role restrictions for privileged operations, and ongoing security reviews. However, no method of transmission over the Internet is 100% secure. You are responsible for maintaining the confidentiality of your account credentials.',
    },
    {
      id: 'retention',
      title: '8. Data Retention',
      text: 'We retain your account data, resumes, interview history, and rewards/redemption records for as long as your account remains active and as needed to operate the Service. If you delete your account, we permanently delete or irreversibly anonymise personal data within 30 days, except where retention is required by law (for example billing and tax records may be retained for up to 7 years as required under applicable Indian tax rules) or needed to resolve disputes, prevent fraud, or enforce our Terms.',
    },
    {
      id: 'rights',
      title: '9. Your Rights (India — DPDP)',
      bullets: [
        'Access — request a summary of the personal data we hold about you and the processing activities',
        'Correction & completion — ask us to correct inaccurate or incomplete personal data',
        'Erasure — request erasure of personal data when it is no longer necessary for the stated purpose or as otherwise permitted by law',
        'Data portability — where applicable, receive certain data in a machine-readable format',
        'Withdraw consent — withdraw consent for consent-based processing, subject to consequences for Service access',
        'Grievance redressal — raise a complaint with our Grievance Officer (details below)',
        'Nomination — nominate another individual to exercise rights on your behalf in the event of death or incapacity, as provided under the DPDP Act',
      ],
      footer: `To exercise these rights, email support@interviewera.com, message ${GRIEVANCE_OFFICER.email}, or use /contact. We aim to respond within the timelines required by applicable law (and in any event will acknowledge requests promptly). If unresolved, you may escalate to the Data Protection Board of India as provided under the DPDP Act.`,
      callout: {
        tone: 'info',
        title: 'Grievance Officer',
        body: `Privacy and data-protection grievances are handled by ${GRIEVANCE_OFFICER.name} (Founder) at ${GRIEVANCE_OFFICER.email}. See Section 10 for how to raise a grievance.`,
      },
    },
    {
      id: 'grievance',
      title: '10. Grievance Redressal',
      content: [
        {
          sub: 'Grievance Officer',
          text: `Name: ${GRIEVANCE_OFFICER.name} · Designation: ${GRIEVANCE_OFFICER.designation} · Email: ${GRIEVANCE_OFFICER.email} · Postal: ${COMPANY_ADDRESS}`,
        },
        {
          sub: 'How to raise a grievance',
          text: `Email ${GRIEVANCE_OFFICER.email} with your registered email, a clear description of the issue, and any relevant screenshots or request IDs. You may also use our /contact form and mention that it is a privacy grievance. We will acknowledge receipt and work to resolve grievances within the period required under applicable DPDP Rules (generally within ninety (90) days of receipt).`,
        },
        {
          sub: 'Escalation',
          text: 'If you are not satisfied with our response, you may escalate to the Data Protection Board of India in accordance with the DPDP Act and Rules.',
        },
      ],
    },
    {
      id: 'eu-uk',
      title: '11. Additional Notice for EEA / UK Users (If Applicable)',
      text: 'InterviewEra is primarily designed for users in India. The Service is publicly reachable, so visitors from the European Economic Area (EEA) or United Kingdom may create accounts. Where the GDPR or UK GDPR applies to our processing of your personal data, the following additional information is provided without limiting your rights under Indian law.',
      content: [
        {
          sub: 'Controller',
          text: 'InterviewEra is the controller of personal data processed through the Service for EEA/UK users, unless otherwise stated for a specific campus or B2B arrangement.',
        },
        {
          sub: 'Legal bases (summary)',
          text: 'We typically rely on: (a) performance of a contract (providing the Service you request); (b) consent (where required, for example certain cookies or optional communications); and (c) legitimate interests (security, fraud prevention, product improvement) balanced against your rights.',
        },
        {
          sub: 'International transfers',
          text: 'Data may be transferred to and processed in countries outside the EEA/UK (including India, Singapore, and the United States for certain AI or infrastructure providers). Where required, we will use appropriate safeguards such as Standard Contractual Clauses or other lawful transfer mechanisms.',
        },
        {
          sub: 'Your GDPR rights',
          text: `You may have rights of access, rectification, erasure, restriction, objection, and portability, and the right to lodge a complaint with your local supervisory authority. Contact support@interviewera.com or ${GRIEVANCE_OFFICER.email} to exercise these rights.`,
        },
      ],
    },
    {
      id: 'children',
      title: '12. Children\'s Privacy',
      text: 'InterviewEra is intended for users aged 18 and above. We do not knowingly collect personal information from children under 18. If you believe a child has provided us with personal data, please contact us and we will delete it promptly.',
    },
    {
      id: 'changes',
      title: '13. Changes to This Policy',
      text: 'We may update this Privacy Policy from time to time. Material changes will be communicated via email or an in-app notification where appropriate. Continued use of InterviewEra after changes are posted constitutes acceptance of the revised policy to the extent permitted by law.',
    },
    {
      id: 'contact',
      title: '14. Contact Us',
      text: 'For privacy-related queries, data requests, or to report a concern:',
      contact: {
        email: 'support@interviewera.com',
        address: COMPANY_ADDRESS,
        extraLines: [
          `Grievance Officer: ${GRIEVANCE_OFFICER.name} · ${GRIEVANCE_OFFICER.email}`,
        ],
      },
    },
  ],
  related: [
    { href: '/terms', label: 'Terms & Conditions' },
    { href: '/refund', label: 'Refund Policy' },
    { href: '/contact', label: 'Contact' },
    { href: '/', label: 'Back to home' },
  ],
};
