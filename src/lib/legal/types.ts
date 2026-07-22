import type { LucideIcon } from 'lucide-react';

export type LegalCalloutTone = 'info' | 'warning' | 'critical';

export interface LegalSubBlock {
  sub: string;
  text: string;
  /** Visual marker for founder/legal review — not shown to end users in production copy tone */
  reviewTag?: 'NEW' | 'MODIFIED';
}

export interface LegalSection {
  id: string;
  title: string;
  text?: string;
  intro?: string;
  bullets?: string[];
  footer?: string;
  content?: LegalSubBlock[];
  callout?: {
    tone: LegalCalloutTone;
    title: string;
    body: string;
  };
  contact?: {
    email: string;
    address: string;
    extraLines?: string[];
  };
  /** Shown only in draft mode for internal review */
  reviewNotes?: string[];
}

export interface LegalHighlightRow {
  label: string;
  value: string;
}

export interface LegalDocumentMeta {
  title: string;
  path: '/privacy' | '/terms' | '/refund';
  description: string;
  icon: LucideIcon;
  effectiveDate: string;
  lastUpdated: string;
  /** When true, shows a draft-for-review banner (this revision is not yet live). */
  isDraftRevision: boolean;
  intro: string;
  highlights?: LegalHighlightRow[];
  highlightsTitle?: string;
  sections: LegalSection[];
  related: { href: string; label: string }[];
}
