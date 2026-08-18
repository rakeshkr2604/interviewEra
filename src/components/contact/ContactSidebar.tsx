'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  Copy,
  CreditCard,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORT_EMAIL } from '@/lib/contact/constants';
import { TECHNICAL_ISSUE_FEEDBACK_HREF } from '@/lib/technical-failures/ux';
import {
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
  IE_UPLOAD_ICON_SHELL_CLASS,
  IE_UPLOAD_ICON_SHELL_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  {
    href: '/help-center',
    label: 'Help Center',
    desc: 'Guides for sessions, scoring, and account setup',
    icon: LifeBuoy,
  },
  {
    href: '/help#credits-plans',
    label: 'Billing & credits FAQ',
    desc: 'Plans, payments, and refund policy',
    icon: CreditCard,
  },
  {
    href: '/help',
    label: 'Common questions',
    desc: 'Quick answers before you write in',
    icon: HelpCircle,
  },
] as const;

const cardGlowStyle = {
  ...IE_MARKETING_SURFACE_CARD_STYLE,
  boxShadow:
    'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 8%, transparent)',
} as const;

export function ContactSidebar() {
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(SUPPORT_EMAIL);
      setCopied(true);
      toast.success('Email copied to clipboard');
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — select the address manually.');
    }
  }

  return (
    <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
      {/* Response-time trust badge */}
      <div
        className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'px-5 py-4')}
        style={cardGlowStyle}
      >
        <div className="flex items-start gap-3">
          <span
            className={cn(IE_UPLOAD_ICON_SHELL_CLASS, 'size-10 shrink-0 rounded-xl')}
            style={IE_UPLOAD_ICON_SHELL_STYLE}
          >
            <Clock className="size-5" aria-hidden />
          </span>
          <div>
            <p
              className="inline-flex items-center gap-2 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                borderColor: 'color-mix(in srgb, var(--accent-success) 35%, var(--card-border))',
                background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
                color: 'var(--accent-success)',
              }}
            >
              Typical reply &lt; 1 business day
            </p>
            <p className="mt-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Real humans read every message
            </p>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Billing, account access, or product questions — we&apos;ll get back to you by email.
              Interview technical issues should be reported through{' '}
              <Link
                href={TECHNICAL_ISSUE_FEEDBACK_HREF}
                className="font-semibold underline underline-offset-2"
                style={{ color: 'var(--accent-primary)' }}
              >
                Feedback → Interview technical issue
              </Link>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Direct email — primary fallback for webmail users */}
      <div
        className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'overflow-hidden')}
        style={{
          ...cardGlowStyle,
          borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
        }}
      >
        <div
          className="border-b px-5 py-3"
          style={{
            borderColor: 'var(--card-border)',
            background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Mail className="size-4 shrink-0" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Prefer email directly?
            </p>
          </div>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Use webmail (Gmail, Outlook, etc.) or copy our address if you don&apos;t have a desktop mail app.
          </p>
          <div
            className="flex items-center gap-2 rounded-xl border-2 px-3 py-2.5"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
            }}
          >
            <code
              className="min-w-0 flex-1 truncate text-sm font-medium select-all"
              style={{ color: 'var(--text-primary)' }}
            >
              {SUPPORT_EMAIL}
            </code>
            <button
              type="button"
              onClick={copyEmail}
              className={cn(IE_MARKETING_CTA_SECONDARY_CLASS, 'h-9 shrink-0 px-3 text-xs')}
              style={{
                ...IE_MARKETING_CTA_SECONDARY_STYLE,
                color: copied ? 'var(--accent-success)' : 'var(--text-secondary)',
              }}
            >
              {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className={cn(IE_MARKETING_CTA_SECONDARY_CLASS, 'w-full text-sm')}
            style={IE_MARKETING_CTA_SECONDARY_STYLE}
          >
            <Mail className="size-4" aria-hidden />
            Open mail app
          </a>
        </div>
      </div>

      {/* Quick answers */}
      <div className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'px-5 py-4')} style={cardGlowStyle}>
        <div className="flex items-center gap-2">
          <MessageCircle className="size-4" style={{ color: 'var(--accent-primary)' }} aria-hidden />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Quick answers
          </p>
        </div>
        <ul className="mt-3 space-y-2" role="list">
          {QUICK_LINKS.map(({ href, label, desc, icon: Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="group flex items-start gap-3 rounded-xl border px-3 py-2.5 transition-[border-color,background-color] hover:border-[color-mix(in_srgb,var(--accent-primary)_35%,var(--card-border))]"
                style={{
                  borderColor: 'color-mix(in srgb, var(--card-border) 85%, transparent)',
                  background: 'color-mix(in srgb, var(--bg-secondary) 60%, transparent)',
                }}
              >
                <Icon
                  className="mt-0.5 size-4 shrink-0 transition-colors group-hover:text-[var(--accent-primary)]"
                  style={{ color: 'var(--text-muted)' }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {label}
                    <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {desc}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Product updates and tips on{' '}
          <a
            href="https://x.com/InterviewEra"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-link)' }}
          >
            X / Twitter
          </a>
          {' '}and{' '}
          <a
            href="https://www.linkedin.com/company/interviewera/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--accent-link)' }}
          >
            LinkedIn
          </a>
          .
        </p>
      </div>
    </aside>
  );
}
