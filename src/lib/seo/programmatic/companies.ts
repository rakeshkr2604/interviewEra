/**
 * Company data for programmatic SEO pages.
 *
 * Coverage strategy:
 * - Tier `service`:  Mass-hiring IT services; high fresher search volume (TCS NQT, Infosys InfyTQ).
 * - Tier `product`:  Indian product & mid-size companies; aspiration + realistic combined.
 * - Tier `startup`:  High-growth funded startups; brand recognition but smaller hiring volume.
 * - Tier `mnc`:      FAANG/global MNCs; aspirational — low placement volume, very high search demand.
 *
 * Adding a new company:
 * 1. Append an entry to COMPANIES.
 * 2. The new slug automatically joins the CompanySlug union.
 * 3. Add intersection pairs in slugs.ts if the company × role combo has search demand.
 * 4. Add company-specific questions to COMPANY_QUESTION_REGISTRY in questions.ts.
 */

import type { CompanyDefinition } from './types'

export const COMPANIES = [
  // ── Service tier ───────────────────────────────────────────────────────────
  {
    slug: 'tcs',
    label: 'TCS',
    fullName: 'Tata Consultancy Services',
    tier: 'service',
    headquartersCity: 'Mumbai',
    avgPackageRange: '7.09–11.80 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Test (NQT) → Technical → HR',
    sitemapPriority: 0.88,
    fresherHiring: true,
    description:
      "India's largest IT employer. TCS interviews freshers via the National Qualifier Test (NQT) followed by technical and HR rounds — Digital and Prime bands offer ₹7–12 LPA CTC for 2026 campus drives.",
  },
  {
    slug: 'infosys',
    label: 'Infosys',
    fullName: 'Infosys Technologies',
    tier: 'service',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '3.6–6.5 LPA',
    typicalRounds: 3,
    interviewStyle: 'InfyTQ / Hackwithinfy → Technical → HR',
    sitemapPriority: 0.87,
    fresherHiring: true,
    description:
      'Infosys recruits through InfyTQ and Hackwithinfy drives. Interviews test reasoning, coding, and communication across three rounds.',
  },
  {
    slug: 'wipro',
    label: 'Wipro',
    fullName: 'Wipro Limited',
    tier: 'service',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '3.5–6 LPA',
    typicalRounds: 3,
    interviewStyle: 'NLTH Online Test → Technical + HR (combined)',
    sitemapPriority: 0.85,
    fresherHiring: true,
    description:
      'Wipro National Level Talent Hunt (NLTH) is the primary fresher entry point, followed by a combined technical and HR interview.',
  },
  {
    slug: 'hcl',
    label: 'HCL',
    fullName: 'HCL Technologies',
    tier: 'service',
    headquartersCity: 'Noida',
    avgPackageRange: '3.5–7 LPA',
    typicalRounds: 3,
    interviewStyle: 'Aptitude → Technical → HR',
    sitemapPriority: 0.84,
    fresherHiring: true,
    description:
      'HCL Technologies conducts online aptitude tests followed by technical and HR interviews for campus fresher roles.',
  },
  {
    slug: 'cognizant',
    label: 'Cognizant',
    fullName: 'Cognizant Technology Solutions',
    tier: 'service',
    headquartersCity: 'Chennai',
    avgPackageRange: '4–7.5 LPA',
    typicalRounds: 3,
    interviewStyle: 'GenC Online Test → Technical → HR',
    sitemapPriority: 0.84,
    fresherHiring: true,
    description:
      'Cognizant GenC and GenC Elevate tracks offer fresher roles. Interviews include coding assessments, technical, and HR rounds.',
  },
  {
    slug: 'accenture',
    label: 'Accenture',
    fullName: 'Accenture India',
    tier: 'service',
    headquartersCity: 'Mumbai',
    avgPackageRange: '4.5–8 LPA',
    typicalRounds: 3,
    interviewStyle: 'Communication + Cognitive Test → Technical → HR',
    sitemapPriority: 0.84,
    fresherHiring: true,
    description:
      'Accenture mass-recruits freshers with cognitive + communication tests, a technical round, and an HR interview.',
  },
  {
    slug: 'ibm',
    label: 'IBM',
    fullName: 'IBM India',
    tier: 'service',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '4.5–9 LPA',
    typicalRounds: 3,
    interviewStyle: 'Aptitude → Technical → HR',
    sitemapPriority: 0.81,
    fresherHiring: true,
    description:
      'IBM India interviews include aptitude screening, technical rounds covering Cloud and AI topics, and an HR round.',
  },
  {
    slug: 'capgemini',
    label: 'Capgemini',
    fullName: 'Capgemini India',
    tier: 'service',
    headquartersCity: 'Mumbai',
    avgPackageRange: '4–7 LPA',
    typicalRounds: 3,
    interviewStyle: 'Game-based Assessment → Technical → HR',
    sitemapPriority: 0.81,
    fresherHiring: true,
    description:
      'Capgemini uses a game-based assessment (SMART) for screening, followed by technical and HR interview rounds.',
  },
  {
    slug: 'tech-mahindra',
    label: 'Tech Mahindra',
    fullName: 'Tech Mahindra',
    tier: 'service',
    headquartersCity: 'Pune',
    avgPackageRange: '3.25–6 LPA',
    typicalRounds: 3,
    interviewStyle: 'Aptitude → Technical + HR',
    sitemapPriority: 0.79,
    fresherHiring: true,
    description:
      'Tech Mahindra campus hiring includes online aptitude tests and a combined technical + HR interview panel.',
  },
  // ── MNC tier ───────────────────────────────────────────────────────────────
  {
    slug: 'google',
    label: 'Google',
    fullName: 'Google India',
    tier: 'mnc',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '25–60 LPA',
    typicalRounds: 5,
    interviewStyle: 'Phone Screen → DSA × 4 → System Design → Behavioral',
    sitemapPriority: 0.87,
    fresherHiring: false,
    description:
      'Google India interviews are DSA-intensive across 4–5 rounds plus system design and behavioral. FAANG-level preparation is essential.',
  },
  {
    slug: 'microsoft',
    label: 'Microsoft',
    fullName: 'Microsoft India',
    tier: 'mnc',
    headquartersCity: 'Hyderabad',
    avgPackageRange: '20–55 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Assessment → Technical × 3 → Hiring Manager',
    sitemapPriority: 0.86,
    fresherHiring: false,
    description:
      'Microsoft India interviews test DSA, coding, and problem-solving across 3–4 technical rounds plus a hiring manager discussion.',
  },
  {
    slug: 'amazon',
    label: 'Amazon',
    fullName: 'Amazon India',
    tier: 'mnc',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '18–45 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Assessment → Technical × 2 → Bar Raiser',
    sitemapPriority: 0.85,
    fresherHiring: false,
    description:
      'Amazon India combines DSA rounds with Leadership Principles-based behavioral interviews and a Bar Raiser round.',
  },
  // ── Product tier ───────────────────────────────────────────────────────────
  {
    slug: 'flipkart',
    label: 'Flipkart',
    fullName: 'Flipkart Internet Pvt. Ltd.',
    tier: 'product',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '12–32 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Coding → Technical × 2 → Hiring Manager',
    sitemapPriority: 0.83,
    fresherHiring: false,
    description:
      "Flipkart's interview process focuses on DSA and system design for tech roles, with culture-fit rounds for product and business roles.",
  },
  {
    slug: 'swiggy',
    label: 'Swiggy',
    fullName: 'Bundl Technologies (Swiggy)',
    tier: 'product',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '12–28 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Assessment → Technical × 2 → System Design → HR',
    sitemapPriority: 0.81,
    fresherHiring: false,
    description:
      'Swiggy interviews emphasise backend systems, data engineering, and product thinking in a fast-paced, problem-solving format.',
  },
  {
    slug: 'zomato',
    label: 'Zomato',
    fullName: 'Zomato Limited',
    tier: 'product',
    headquartersCity: 'Gurugram',
    avgPackageRange: '12–28 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Coding → Technical × 2 → Cultural Fit',
    sitemapPriority: 0.81,
    fresherHiring: false,
    description:
      'Zomato interviews test algorithmic thinking, backend development skills, and cultural alignment for engineering and analytics roles.',
  },
  {
    slug: 'razorpay',
    label: 'Razorpay',
    fullName: 'Razorpay Software Pvt. Ltd.',
    tier: 'product',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '14–32 LPA',
    typicalRounds: 4,
    interviewStyle: 'DSA Screen → Technical × 2 → System Design → HR',
    sitemapPriority: 0.80,
    fresherHiring: false,
    description:
      'Razorpay focuses on backend systems and payments infrastructure. Interviews are DSA + system design heavy with strong HR culture-fit evaluation.',
  },
  {
    slug: 'phonepe',
    label: 'PhonePe',
    fullName: 'PhonePe Private Limited',
    tier: 'product',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '14–35 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Assessment → Technical × 2 → System Design → HR',
    sitemapPriority: 0.80,
    fresherHiring: false,
    description:
      'PhonePe interviews assess distributed systems knowledge, data engineering, and problem-solving ability across fintech scenarios.',
  },
  {
    slug: 'zoho',
    label: 'Zoho',
    fullName: 'Zoho Corporation',
    tier: 'product',
    headquartersCity: 'Chennai',
    avgPackageRange: '5–12 LPA',
    typicalRounds: 4,
    interviewStyle: 'Written Test → Coding × 2 → Technical Interview → HR',
    sitemapPriority: 0.82,
    fresherHiring: true,
    description:
      'Zoho is one of the few top product companies that actively hires freshers. Interviews include problem-solving, coding, and product discussions.',
  },
  {
    slug: 'freshworks',
    label: 'Freshworks',
    fullName: 'Freshworks Inc.',
    tier: 'product',
    headquartersCity: 'Chennai',
    avgPackageRange: '10–22 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Coding → Technical × 2 → HR',
    sitemapPriority: 0.79,
    fresherHiring: false,
    description:
      'Freshworks interviews evaluate full-stack development capability, product awareness, and collaborative problem-solving skills.',
  },
  {
    slug: 'solera',
    label: 'Solera',
    fullName: 'Solera Holdings, LLC',
    tier: 'product',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '5–12 LPA',
    typicalRounds: 4,
    interviewStyle: 'Cognitive Assessment → Coding → Technical × 2 → HR',
    sitemapPriority: 0.74,
    fresherHiring: true,
    description:
      'Solera builds vehicle lifecycle management SaaS for automotive insurance, claims, and repair. India engineering teams in Bengaluru and Hyderabad hire Associate Software Engineers through cognitive assessments and Java/SQL-focused technical interviews.',
  },
  {
    slug: 'browserstack',
    label: 'BrowserStack',
    fullName: 'BrowserStack Inc.',
    tier: 'product',
    headquartersCity: 'Mumbai',
    avgPackageRange: '12–25 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Assessment → Technical × 3 → HR',
    sitemapPriority: 0.77,
    fresherHiring: false,
    description:
      'BrowserStack interviews are deeply technical with live coding, system design, and debugging challenges across multiple rounds.',
  },
  {
    slug: 'makemytrip',
    label: 'MakeMyTrip',
    fullName: 'MakeMyTrip (India) Pvt. Ltd.',
    tier: 'product',
    headquartersCity: 'Gurugram',
    avgPackageRange: '10–20 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Assessment → Technical × 2 → HR',
    sitemapPriority: 0.76,
    fresherHiring: false,
    description:
      'MakeMyTrip interviews test backend/frontend development skills, SQL, and product-level problem-solving for their travel platform.',
  },
  // ── Startup tier ───────────────────────────────────────────────────────────
  {
    slug: 'cred',
    label: 'CRED',
    fullName: 'CRED (Dreamplug Technologies)',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '18–40 LPA',
    typicalRounds: 4,
    interviewStyle: 'DSA Screen → Technical × 2 → System Design → HR',
    sitemapPriority: 0.79,
    fresherHiring: false,
    description:
      'CRED interviews are highly competitive, emphasising elegant code, distributed systems, and autonomous thinking.',
  },
  {
    slug: 'meesho',
    label: 'Meesho',
    fullName: 'Fashnear Technologies (Meesho)',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '14–30 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Coding → Technical × 2 → System Design → HR',
    sitemapPriority: 0.78,
    fresherHiring: false,
    description:
      'Meesho interviews test backend scalability, data engineering, and first-principles thinking for their social commerce platform.',
  },
  {
    slug: 'groww',
    label: 'Groww',
    fullName: 'Nextbillion Technology (Groww)',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '15–35 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Assessment → Technical × 2 → System Design → Behavioral',
    sitemapPriority: 0.78,
    fresherHiring: false,
    description:
      'Groww interviews focus on fintech problem-solving, real-time systems, and data infrastructure for their investment platform.',
  },
  {
    slug: 'zerodha',
    label: 'Zerodha',
    fullName: 'Zerodha Broking Limited',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '10–25 LPA',
    typicalRounds: 3,
    interviewStyle: 'Take-home Assignment → Technical × 2 → Culture Fit',
    sitemapPriority: 0.76,
    fresherHiring: false,
    description:
      'Zerodha interviews are assignment-heavy and focus on ownership, backend engineering, and deep product thinking.',
  },
  {
    slug: 'paytm',
    label: 'Paytm',
    fullName: 'One 97 Communications (Paytm)',
    tier: 'startup',
    headquartersCity: 'Noida',
    avgPackageRange: '8–18 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Assessment → Technical × 2 → HR',
    sitemapPriority: 0.78,
    fresherHiring: false,
    description:
      'Paytm interviews test payments domain knowledge, backend systems, and data engineering for their fintech ecosystem.',
  },
  {
    slug: 'ola',
    label: 'Ola',
    fullName: 'ANI Technologies (Ola)',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '10–22 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Assessment → Technical × 2 → HR',
    sitemapPriority: 0.76,
    fresherHiring: false,
    description:
      'Ola interviews cover ride-hailing domain challenges, backend systems at scale, and data analytics for mobility products.',
  },
  {
    slug: 'nykaa',
    label: 'Nykaa',
    fullName: 'FSN E-Commerce Ventures (Nykaa)',
    tier: 'startup',
    headquartersCity: 'Mumbai',
    avgPackageRange: '8–18 LPA',
    typicalRounds: 3,
    interviewStyle: 'Online Assessment → Technical × 2 → HR',
    sitemapPriority: 0.75,
    fresherHiring: false,
    description:
      'Nykaa interviews test e-commerce systems, frontend/backend development, and analytical thinking for beauty & fashion.',
  },
  {
    slug: 'juspay',
    label: 'Juspay',
    fullName: 'Juspay Technologies',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '12–26 LPA',
    typicalRounds: 4,
    interviewStyle: 'Functional Programming Test → Technical × 3 → HR',
    sitemapPriority: 0.76,
    fresherHiring: false,
    description:
      'Juspay interviews are unique — strong Haskell/Purescript culture, payments domain expertise, and functional programming proficiency expected.',
  },
  {
    slug: 'inmobi',
    label: 'InMobi',
    fullName: 'InMobi Pte. Ltd.',
    tier: 'startup',
    headquartersCity: 'Bengaluru',
    avgPackageRange: '14–28 LPA',
    typicalRounds: 4,
    interviewStyle: 'Online Coding → Technical × 2 → System Design → HR',
    sitemapPriority: 0.75,
    fresherHiring: false,
    description:
      'InMobi interviews target mobile advertising and AdTech, covering ML systems, real-time bidding, and large-scale data engineering.',
  },
] as const satisfies readonly CompanyDefinition[]

/**
 * Derived union type of all valid company slugs.
 * Automatically stays in sync with the COMPANIES array.
 */
export type CompanySlug = (typeof COMPANIES)[number]['slug']

/**
 * Narrowest type for a single company entry.
 */
export type Company = (typeof COMPANIES)[number]

/** Total number of companies — useful for sitemap capacity planning. */
export const COMPANY_COUNT = COMPANIES.length as number
