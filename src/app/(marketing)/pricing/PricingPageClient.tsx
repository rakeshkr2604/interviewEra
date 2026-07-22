'use client';

import React, { useState } from 'react';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { Check, X } from 'lucide-react';
import { BillingCycleToggle, type BillingCycle } from '@/components/pricing/BillingCycleToggle';
import {
  BILLING_AMOUNTS,
  FREE_TIER_FEATURES,
  STARTER_FEATURES,
  PRO_FEATURES,
} from '@/lib/pricing/tiers';
import {
  marketingPaidCtaLabel,
  planPeriodLine,
  planPriceLine,
} from '@/lib/pricing/copy';
import { PaymentTrustSection } from '@/components/pricing/PaymentTrustSection';
import { UpgradePageFooter } from '@/components/pricing/UpgradePageFooter';
import { PRICING_FAQ } from '@/lib/landing/home-content';
import { PricingPageViewTracker } from '@/components/analytics/PricingPageViewTracker';

const T = {
  bg:     'var(--bg-primary)',
  bg2:    'var(--bg-secondary)',
  card:   'var(--card-bg)',
  bord2:  'var(--card-border)',
  text:   'var(--text-primary)',
  text2:  'var(--text-secondary)',
  text3:  'var(--text-muted)',
  acc:    'var(--accent-primary)',
  acc2:   'var(--accent-link)',
  accdim: 'var(--v3-accdim)',
  accbrd: 'var(--v3-accbrd)',
  ok:     'var(--accent-success)',
} as const;

function FeatureRow({ text, included }: { text: string; included: boolean }) {
  return (
    <p style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: T.text2, margin: 0 }}>
      {included
        ? <Check style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, color: T.ok }} />
        : <X style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, opacity: 0.4, color: T.text3 }} />}
      <span style={included ? undefined : { opacity: 0.7 }}>{text}</span>
    </p>
  );
}

function PaidFeatureRow({ text }: { text: string }) {
  return (
    <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 14, color: T.text2 }}>
      <Check style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, color: T.ok }} />
      {text}
    </li>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ border: `1px solid ${open ? T.acc : T.bord2}`, borderRadius: 16, background: T.card, overflow: 'hidden', transition: 'border-color .2s' }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', gap: 16, padding: '18px 20px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontSize: 15, fontWeight: 600, color: T.text, textAlign: 'left',
          fontFamily: "'DM Sans', sans-serif", WebkitTapHighlightColor: 'transparent',
          minHeight: 56, // easier tap target on mobile
        }}
      >
        <span style={{ flex: 1 }}>{q}</span>
        <span style={{ fontSize: 20, color: T.text3, flexShrink: 0, transition: 'transform .2s', transform: open ? 'rotate(45deg)' : 'none', lineHeight: 1 }}>+</span>
      </button>
      {open && (
        <div style={{ padding: '0 20px 18px', fontSize: 14, lineHeight: 1.8, color: T.text2 }}>{a}</div>
      )}
    </div>
  );
}

export function PricingPageClient() {
  // TEMPORARILY HIDDEN: annual billing toggle (2026-05-14) — cycle fixed to 'monthly'
  // Annual plans still fully supported in backend; toggle hidden to defer annual repricing.
  // Uncomment setCycle and unwrap {false &&} to restore toggle.
  const [cycle, setCycle] = useState<BillingCycle>('monthly');

  const proPerDay    = Math.max(1, Math.round(BILLING_AMOUNTS.pro.monthlyInr / 30));

  return (
    <main id="main-content" style={{ color: 'var(--text-primary)', background: 'var(--bg-primary)' }}>
      <PricingPageViewTracker sourcePage="/pricing" />
      {/* ─── Responsive + cross-browser styles ─── */}
      <style>{`
        /* Base resets for cross-browser consistency */
        .pr-section { box-sizing: border-box; width: 100%; }
        .pr-wrap     { max-width: 1080px; margin: 0 auto; padding: 0 20px; box-sizing: border-box; }
        .pr-wrap-sm  { max-width: 720px;  margin: 0 auto; padding: 0 20px; box-sizing: border-box; }

        /* Hero */
        .pr-hero { position: relative; overflow: hidden; padding: 72px 0 44px; }
        .pr-hero-tex {
          position: absolute; inset: 0; pointer-events: none;
          background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 1px);
          background-size: 32px 32px;
          -webkit-mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%);
          mask-image: radial-gradient(ellipse 80% 50% at 50% 0%, black 20%, transparent 80%);
        }

        /* Cards grid */
        .pr-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .pr-card  {
          display: flex; flex-direction: column;
          border-radius: var(--ie-radius-lg); border: 2px solid var(--card-border);
          background: var(--card-bg); padding: 28px 22px;
          box-shadow: 0 12px 40px -8px rgba(0,0,0,.25);
          transition: transform .3s ease, box-shadow .3s ease;
          -webkit-tap-highlight-color: transparent;
        }
        .pr-card:hover { transform: translateY(-4px); }
        .pr-card--pop {
          border-color: var(--accent-primary);
          position: relative; overflow: visible; padding-top: 38px;
          box-shadow: 0 0 48px color-mix(in srgb, var(--accent-primary) 28%, transparent);
        }
        /* Fallback for browsers that don't support color-mix */
        @supports not (color: color-mix(in srgb, red, blue)) {
          .pr-card--pop { box-shadow: 0 0 48px rgba(99,102,241,.28); }
        }
        .pr-card-badge {
          position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
          background: var(--accent-primary); color: #fff;
          font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          padding: 5px 14px; border-radius: 99px; white-space: nowrap; z-index: 10;
          box-shadow: 0 6px 20px rgba(99,102,241,.4);
        }

        /* CTA buttons — touch-friendly */
        .pr-btn {
          display: block; text-align: center;
          padding: 14px 20px; border-radius: var(--ie-radius-md);
          font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          text-decoration: none; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
          transition: opacity .15s ease, transform .15s ease;
          min-height: 48px; /* WCAG touch target */
          line-height: 1.4;
        }
        .pr-btn:active { opacity: .85; transform: scale(.98); }
        .pr-btn--ghost {
          border: 1.5px solid var(--card-border);
          background: transparent; color: var(--text-primary);
        }
        .pr-btn--accent {
          background: var(--accent-primary); color: #fff;
          box-shadow: 0 10px 28px rgba(99,102,241,.35);
          border: none;
        }
        .pr-btn--accent:hover { opacity: .92; }

        /* CTA section */
        .pr-cta-sec {
          padding: 88px 20px; text-align: center;
          background: linear-gradient(160deg, #0d173a 0%, #120f38 50%, #0d1634 100%);
          border-top: 1px solid var(--card-border);
        }
        .pr-cta-pill {
          display: inline-block; background: var(--v3-accdim); border: 1px solid var(--v3-accbrd);
          border-radius: 99px; padding: 5px 16px;
          font-size: 12px; font-weight: 600; color: var(--accent-hover); margin-bottom: 20px;
        }
        .pr-cta-actions { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .pr-cta-link {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 15px 32px; border-radius: 12px;
          background: var(--accent-primary); color: #fff;
          font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          text-decoration: none; -webkit-tap-highlight-color: transparent;
          min-height: 52px; box-sizing: border-box;
        }

        /* ── Tablet: 2-col cards ── */
        @media (max-width: 900px) {
          .pr-hero { padding: 56px 0 36px; }
          .pr-cards { grid-template-columns: 1fr 1fr; }
          /* Pro card spans full width on 2-col so it's prominent */
          .pr-card--pop { grid-column: 1 / -1; max-width: 500px; justify-self: center; width: 100%; }
        }

        /* ── Mobile: 1-col ── */
        @media (max-width: 600px) {
          .pr-hero  { padding: 48px 0 32px; }
          .pr-cards { grid-template-columns: 1fr; }
          .pr-card--pop { grid-column: auto; max-width: none; justify-self: auto; }
          .pr-card  { padding: 24px 18px; }
          .pr-cta-sec { padding: 64px 20px; }
          .pr-wrap, .pr-wrap-sm { padding: 0 16px; }
        }

        /* ── Safe-area insets for iPhone notch / dynamic island ── */
        @supports (padding: env(safe-area-inset-left)) {
          .pr-wrap, .pr-wrap-sm {
            padding-left: max(20px, env(safe-area-inset-left));
            padding-right: max(20px, env(safe-area-inset-right));
          }
          @media (max-width: 600px) {
            .pr-wrap, .pr-wrap-sm {
              padding-left: max(16px, env(safe-area-inset-left));
              padding-right: max(16px, env(safe-area-inset-right));
            }
          }
        }

        /* ── Smooth scrolling (reduced-motion safe) ── */
        @media (prefers-reduced-motion: no-preference) {
          html { scroll-behavior: smooth; }
        }

        /* ── Focus visible for keyboard / accessibility ── */
        .pr-btn:focus-visible, .pr-cta-link:focus-visible {
          outline: 2px solid var(--accent-primary);
          outline-offset: 3px;
        }
      `}</style>

      {/* ── HERO ── */}
      <section className="pr-section pr-hero">
        <div className="pr-hero-tex" aria-hidden />
        <div className="pr-wrap" style={{ position: 'relative', textAlign: 'center' }}>
          <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: 14 }}>
            Pricing
          </span>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.06, letterSpacing: '-0.03em', marginBottom: 18, color: T.text }}>
            Simple plans.{' '}
            <span style={{ color: T.acc2 }}>No surprises.</span>
          </h1>
          <p style={{ fontSize: 'clamp(14px, 2vw, 16px)', lineHeight: 1.8, color: T.text2, maxWidth: 520, margin: '0 auto' }}>
            Start free with 3 credits — no card needed. Upgrade when you&apos;re ready to practise seriously for placement season.
          </p>
        </div>
      </section>

      {/* ── CARDS ── */}
      <section className="pr-section" style={{ paddingBottom: 80, background: T.bg }}>
        <div className="pr-wrap">
          {/* Persuasion copy */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', fontWeight: 700, lineHeight: 1.5, color: T.text, maxWidth: 600, margin: '0 auto 10px' }}>
              Every interview you practice is one less surprise on the real day.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: T.text2, maxWidth: 520, margin: '0 auto 8px' }}>
              Start <strong style={{ color: T.text }}>free</strong>, no card. Upgrade when you want PDF export, replay, and full analysis on every answer.
            </p>
            <p style={{ fontSize: 14, lineHeight: 1.8, color: T.text2, maxWidth: 520, margin: '0 auto' }}>
              On <strong style={{ color: T.text }}>Pro</strong> you unlock full feedback, PDF export, and replay — about{' '}
              <strong style={{ color: T.acc2 }}>₹{proPerDay}/day</strong> for a 30-day period, less than one coffee.
            </p>
          </div>

          {/* Billing toggle — TEMPORARILY HIDDEN (2026-05-14) — annual plans still supported in backend */}
          {false && (
            <div style={{ marginBottom: 32 }}>
              <BillingCycleToggle value={cycle} onChange={setCycle} id="pricing-billing" variant="default" />
            </div>
          )}

          {/* Cards */}
          <div className="pr-cards">
            {/* Free */}
            <div className="pr-card">
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: T.text }}>Free</h2>
                <p style={{ fontSize: 30, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
                  ₹0<span style={{ fontSize: 13, fontWeight: 400, color: T.text3, marginLeft: 4 }}>Forever</span>
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20 }}>
                {FREE_TIER_FEATURES.map((f) => (
                  <FeatureRow key={f.text} text={f.text} included={f.included} />
                ))}
              </div>
              <TrackedCtaLink href="/signup" ctaKey={CTA_KEYS.GET_STARTED} ctaText="Get started free" section="pricing_grid" className="pr-btn pr-btn--ghost">
                Get started free
              </TrackedCtaLink>
            </div>

            {/* Starter */}
            <div className="pr-card">
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: T.text }}>Starter</h2>
                <p style={{ fontSize: 30, fontWeight: 800, color: T.text, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
                  {planPriceLine('starter')}
                </p>
                <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>{planPeriodLine()}</p>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20, listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                {STARTER_FEATURES.map((f) => <PaidFeatureRow key={f} text={f} />)}
              </ul>
              <TrackedCtaLink
                href={`/signup?plan=starter&cycle=${cycle}`}
                ctaKey={CTA_KEYS.PRICING_CTA}
                ctaText={marketingPaidCtaLabel('starter')}
                section="pricing_grid"
                className="pr-btn pr-btn--accent"
              >
                {marketingPaidCtaLabel('starter')}
              </TrackedCtaLink>
            </div>

            {/* Pro */}
            <div className="pr-card pr-card--pop">
              <span className="pr-card-badge">Popular for heavy practice</span>
              <div style={{ marginBottom: 16 }}>
                <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 18, fontWeight: 700, marginBottom: 8, color: T.text }}>Pro</h2>
                <p style={{ fontSize: 30, fontWeight: 800, color: T.acc2, fontFamily: "'JetBrains Mono', monospace", margin: 0 }}>
                  {planPriceLine('pro')}
                </p>
                <p style={{ fontSize: 12, color: T.text3, marginTop: 4 }}>{planPeriodLine()}</p>
              </div>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, marginBottom: 20, listStyle: 'none', padding: 0, margin: '0 0 20px 0' }}>
                {PRO_FEATURES.map((f) => <PaidFeatureRow key={f} text={f} />)}
              </ul>
              <TrackedCtaLink
                href={`/signup?plan=pro&cycle=${cycle}`}
                ctaKey={CTA_KEYS.PRICING_CTA}
                ctaText={marketingPaidCtaLabel('pro')}
                section="pricing_grid"
                className="pr-btn pr-btn--accent"
              >
                {marketingPaidCtaLabel('pro')}
              </TrackedCtaLink>
            </div>
          </div>

          {/* Anchor copy */}
          <p style={{ fontSize: 14, lineHeight: 1.8, color: T.text2, textAlign: 'center', marginTop: 24, maxWidth: 520, marginLeft: 'auto', marginRight: 'auto' }}>
            ₹{BILLING_AMOUNTS.pro.monthlyInr} for 30 days of full-feedback practice — less than what most spend on a
            single day of takeout, for a month of getting interview-ready.
          </p>
          <PaymentTrustSection variant="marketing" />
          <UpgradePageFooter variant="marketing" />
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="pr-section" style={{ padding: '80px 0', background: T.bg2 }}>
        <div className="pr-wrap-sm">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.acc2, marginBottom: 14 }}>
              Common questions
            </span>
            <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: T.text, letterSpacing: '-0.028em', lineHeight: 1.06, margin: 0 }}>
              Frequently asked questions
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {PRICING_FAQ.map((item) => <FAQItem key={item.q} q={item.q} a={item.a} />)}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ── */}
      <section className="pr-cta-sec" aria-label="Get started">
        <div className="pr-wrap">
          <div className="pr-cta-pill">Free to start — no card required</div>
          <h2 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 'clamp(26px, 5vw, 46px)', fontWeight: 800, marginBottom: 16, color: T.text, letterSpacing: '-0.028em' }}>
            Your next interview<br />shouldn&apos;t be a guess.
          </h2>
          <p style={{ fontSize: 'clamp(14px, 2vw, 16px)', color: T.text2, maxWidth: 440, margin: '0 auto 32px', lineHeight: 1.8 }}>
            Run a scored mock from your actual resume. Walk into every company process knowing your number — not hoping for the best.
          </p>
          <div className="pr-cta-actions">
            <TrackedCtaLink
              href="/signup"
              ctaKey={CTA_KEYS.START_FREE_INTERVIEW}
              ctaText="Start Free"
              section="pricing_bottom"
              className="pr-cta-link"
            >
              Start Free
            </TrackedCtaLink>
          </div>
        </div>
      </section>
    </main>
  );
}
