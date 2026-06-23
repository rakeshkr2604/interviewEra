export type AdoptionStatus = 'confirmed' | 'emerging' | 'projected'

export interface IndiaAdoptionRow {
  segment: string
  status: AdoptionStatus
  timeline: string
  notes: string
}

export const AGENTIC_INDIA_ADOPTION: readonly IndiaAdoptionRow[] = [
  {
    segment: 'AI-native startups (Bengaluru, Hyderabad)',
    status: 'confirmed',
    timeline: '2024–2026',
    notes: 'Reported use of AI-assisted take-homes and live coding with Cursor/Claude in hiring loops.',
  },
  {
    segment: 'GCCs (Microsoft, Google, Amazon India GCC)',
    status: 'emerging',
    timeline: '2025–2026',
    notes: 'Internal engineering uses AI tools daily; pilot interview formats align with global policy shifts.',
  },
  {
    segment: 'SaaS product companies (Freshworks, Zoho, Postman)',
    status: 'emerging',
    timeline: '2025–2026',
    notes: 'Product engineering culture favors realistic workflows; agentic-style rounds in senior loops.',
  },
  {
    segment: 'Unicorns (Razorpay, Swiggy, Flipkart tech)',
    status: 'emerging',
    timeline: '2025–2027',
    notes: 'Mixed loops — DSA remains; plus practical coding with tool policies varying by team.',
  },
  {
    segment: 'Campus placement (tier-1)',
    status: 'emerging',
    timeline: '2026',
    notes: 'Awareness rising; most campus OAs still traditional DSA — agentic rounds rare in mass hiring.',
  },
  {
    segment: 'Service companies (TCS, Infosys, Wipro)',
    status: 'projected',
    timeline: '2027+',
    notes: 'Large-scale OA infrastructure favors gradual adoption after product-tier normalization.',
  },
  {
    segment: 'Consulting / SI firms',
    status: 'projected',
    timeline: '2027+',
    notes: 'Client delivery skills may add AI collaboration modules to technical screens.',
  },
  {
    segment: 'FAANG India hiring centers',
    status: 'emerging',
    timeline: '2025–2026',
    notes: 'Follow global bar; tool policies communicated per loop — fundamentals still non-negotiable.',
  },
  {
    segment: 'Early-stage startups (<50 engineers)',
    status: 'confirmed',
    timeline: '2024–2026',
    notes: 'Founders hire for shipping speed with AI; practical tasks over LeetCode-only screens.',
  },
  {
    segment: 'Enterprise IT (banks, telecom)',
    status: 'projected',
    timeline: '2028+',
    notes: 'Compliance and audit cycles slow format change; AI governance training precedes interview change.',
  },
]

export const AGENTIC_INDIA_WHY_ADOPT = [
  'Engineering teams already use Copilot, Cursor, and ChatGPT in daily delivery — interviews lagging reality mis-hire.',
  'GCC hiring competes globally for AI-native talent; realistic rounds improve signal.',
  'Cost of bad senior hires exceeds cost of longer agentic assessments.',
  'Campus curricula adding GenAI modules — placement offices reporting recruiter questions on AI tool fluency.',
  'Remote pair interviews normalize screen-sharing with AI IDEs.',
] as const

export const AGENTIC_INDIA_CONFIRMED_FACTS = [
  'Major Indian tech employers publicly discuss GenAI adoption in engineering workflows (2024–2026 earnings and engineering blogs).',
  'Developer survey data shows majority of Indian software engineers use AI coding assistants weekly or daily.',
  'Product companies continue parallel DSA/OA filters — agentic rounds supplement rather than replace all coding screens.',
] as const

export const AGENTIC_INDIA_PROJECTIONS = [
  'Mass campus agentic OAs at service companies likely 2027+ as assessment vendors add AI-monitored environments.',
  'Interview training institutes in India will add "agentic coding" modules by 2026–2027.',
  'Regulatory clarity on AI in hiring may drive standardized permitted-tool lists.',
] as const
