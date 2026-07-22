import Link from 'next/link';
import type { LegalCalloutTone, LegalDocumentMeta, LegalSection } from '@/lib/legal/types';
import {
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_MARKETING_SURFACE_CARD_STYLE,
} from '@/lib/theme/component-classes';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const CALL_OUT_STYLES: Record<
  LegalCalloutTone,
  { border: string; bg: string; title: string }
> = {
  info: {
    border: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
    bg: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
    title: 'var(--accent-primary)',
  },
  warning: {
    border: 'color-mix(in srgb, var(--accent-warning) 40%, var(--card-border))',
    bg: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
    title: 'var(--accent-warning)',
  },
  critical: {
    border: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
    bg: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
    title: 'var(--accent-danger)',
  },
};

function SectionBody({ section }: { section: LegalSection }) {
  return (
    <>
      {section.callout && (
        <aside
          className="mb-5 rounded-xl border-2 px-4 py-3.5 sm:px-5"
          style={{
            borderColor: CALL_OUT_STYLES[section.callout.tone].border,
            background: CALL_OUT_STYLES[section.callout.tone].bg,
          }}
          aria-label={section.callout.title}
        >
          <p
            className="text-xs font-bold uppercase tracking-wider"
            style={{ color: CALL_OUT_STYLES[section.callout.tone].title }}
          >
            {section.callout.title}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-primary)' }}>
            {section.callout.body}
          </p>
        </aside>
      )}

      {section.text && !section.contact && (
        <p className="text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
          {section.text}
        </p>
      )}

      {section.content && (
        <div className="space-y-5">
          {section.content.map((item) => (
            <div key={item.sub}>
              <p className="mb-1 flex flex-wrap items-center gap-2 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {item.sub}
                {item.reviewTag && (
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-warning) 18%, transparent)',
                      color: 'var(--accent-warning)',
                    }}
                    title="Needs founder/legal review before publishing"
                  >
                    {item.reviewTag} — review
                  </span>
                )}
              </p>
              <p className="text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>
      )}

      {section.bullets && (
        <>
          {section.intro && (
            <p className="mb-3 text-sm sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              {section.intro}
            </p>
          )}
          <ul className="mb-4 space-y-2.5">
            {section.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
                <span
                  className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: 'var(--accent-primary)' }}
                  aria-hidden
                />
                {b}
              </li>
            ))}
          </ul>
          {section.footer && (
            <p className="text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              {section.footer}
            </p>
          )}
        </>
      )}

      {section.contact && (
        <>
          {section.text && (
            <p className="mb-3 text-sm leading-relaxed sm:text-[15px]" style={{ color: 'var(--text-secondary)' }}>
              {section.text}
            </p>
          )}
          <div
            className="rounded-xl border-2 p-4 text-sm"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
            }}
          >
            <p style={{ color: 'var(--text-primary)' }}>
              Email:{' '}
              <Link
                href="/contact"
                className="font-medium underline underline-offset-2 transition-opacity hover:opacity-80"
                style={{ color: 'var(--accent-primary)' }}
              >
                {section.contact.email}
              </Link>
              {' '}
              <span style={{ color: 'var(--text-muted)' }}>(or use our</span>{' '}
              <Link href="/contact" className="underline underline-offset-2" style={{ color: 'var(--accent-primary)' }}>
                contact form
              </Link>
              <span style={{ color: 'var(--text-muted)' }}>)</span>
            </p>
            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
              {section.contact.address}
            </p>
            {section.contact.extraLines?.map((line) => (
              <p key={line} className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                {line}
              </p>
            ))}
          </div>
        </>
      )}

      {section.reviewNotes && section.reviewNotes.length > 0 && (
        <div
          className="mt-4 rounded-lg border border-dashed px-3 py-2 text-xs leading-relaxed"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-warning) 45%, var(--card-border))',
            color: 'var(--text-muted)',
            background: 'color-mix(in srgb, var(--accent-warning) 6%, transparent)',
          }}
        >
          <p className="font-semibold" style={{ color: 'var(--accent-warning)' }}>
            Internal review notes (remove before publish)
          </p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {section.reviewNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function LegalDocument({ doc }: { doc: LegalDocumentMeta }) {
  const Icon = doc.icon;

  return (
    <main
      id="main-content"
      className="ie-landing-type relative overflow-hidden pb-20 pt-2.5 sm:pb-28"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -left-[18%] top-[-16%] h-[min(22rem,72vw)] w-[min(22rem,72vw)] rounded-full blur-[100px]"
          style={{ background: 'color-mix(in srgb, var(--accent-primary) 22%, transparent)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.18] [mask-image:radial-gradient(ellipse_70%_45%_at_50%_-10%,black,transparent)]"
          style={{
            backgroundImage: `linear-gradient(to right, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px),
              linear-gradient(to bottom, color-mix(in srgb, var(--text-secondary) 7%, transparent) 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className={cn(LANDING_PAGE_CONTAINER, 'relative px-4 sm:px-5')}>
        {doc.isDraftRevision && (
          <div
            className="mb-6 rounded-xl border-2 px-4 py-3 text-sm leading-relaxed"
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-warning) 45%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-warning) 12%, transparent)',
              color: 'var(--text-primary)',
            }}
            role="status"
          >
            <strong>Draft for founder + legal review — not yet binding.</strong>{' '}
            Content marked <em>NEW — review</em> or <em>MODIFIED — review</em> needs a decision before publishing.
            Update Effective / Last updated dates when this revision goes live. This draft is not a substitute for legal advice.
          </div>
        )}

        {/* Hero */}
        <header className="mx-auto max-w-3xl text-center">
          <div
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            <Icon className="size-6" aria-hidden />
          </div>
          <p
            className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em]"
            style={{ color: 'var(--accent-hover)' }}
          >
            Legal
          </p>
          <h1
            className="mt-3 font-[family-name:var(--font-bricolage)] text-3xl font-extrabold tracking-tight sm:text-4xl md:text-[2.75rem]"
            style={{ letterSpacing: '-0.03em' }}
          >
            {doc.title}
          </h1>
          <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            Effective date:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{doc.effectiveDate}</strong>
            {' · '}
            Last updated:{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{doc.lastUpdated}</strong>
            {doc.isDraftRevision && (
              <span className="mt-1 block text-xs" style={{ color: 'var(--accent-warning)' }}>
                Dates above reflect the currently published version — bump when this draft is approved.
              </span>
            )}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
            {doc.intro}
          </p>
        </header>

        {/* Highlights */}
        {doc.highlights && doc.highlights.length > 0 && (
          <div className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'mx-auto mt-10 max-w-3xl overflow-hidden')} style={IE_MARKETING_SURFACE_CARD_STYLE}>
            <div
              className="border-b px-5 py-3.5"
              style={{
                borderColor: 'var(--card-border)',
                background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
              }}
            >
              <p className="text-sm font-semibold">{doc.highlightsTitle ?? 'At a glance'}</p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--card-border)' }}>
              {doc.highlights.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm"
                  style={{ borderColor: 'var(--card-border)' }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span className="text-right font-medium" style={{ color: 'var(--text-primary)' }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Body: TOC + sections */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[240px_minmax(0,1fr)]">
          <nav
            className="lg:sticky lg:top-24 lg:self-start"
            aria-label="On this page"
          >
            <div
              className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'p-4')}
              style={IE_MARKETING_SURFACE_CARD_STYLE}
            >
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                On this page
              </p>
              <ul className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto text-sm">
                {doc.sections.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block rounded-lg px-2 py-1.5 leading-snug transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {s.title.replace(/^\d+\.\s*/, '')}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <div className="min-w-0 space-y-6">
            {doc.sections.map((section, i) => (
              <section
                key={section.id}
                id={section.id}
                className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'scroll-mt-24 p-5 sm:p-7')}
                style={{
                  ...IE_MARKETING_SURFACE_CARD_STYLE,
                  background:
                    i % 2 === 0
                      ? 'color-mix(in srgb, var(--card-bg) 94%, transparent)'
                      : 'color-mix(in srgb, var(--accent-primary) 4%, var(--card-bg))',
                }}
              >
                <h2
                  className="mb-4 font-[family-name:var(--font-bricolage)] text-xl font-bold tracking-tight sm:text-2xl"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  {section.title}
                </h2>
                <SectionBody section={section} />
              </section>
            ))}

            <div
              className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t pt-8 text-sm"
              style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
            >
              {doc.related.map((r) => (
                <Link
                  key={r.href}
                  href={r.href}
                  className="transition-opacity hover:opacity-80"
                  style={{ color: r.href === '/' ? 'var(--text-secondary)' : 'var(--accent-primary)' }}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
