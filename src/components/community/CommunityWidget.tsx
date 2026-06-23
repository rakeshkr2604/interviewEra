'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronUp, MessageCircle, X } from 'lucide-react';
import { COMMUNITY_COPY } from '@/lib/community/community';
import { getClickablePlatformsForSurface } from '@/lib/community/selectors';
import { trackCommunityInteraction } from '@/lib/community/analytics';
import {
  dismissWidget,
  isWidgetDismissed,
  shouldShowWidget,
} from '@/lib/community/storage';
import { CommunityPlatformIcon } from '@/components/community/CommunityIcons';
import { CommunityLink } from '@/components/community/CommunityLink';
import { CommunityHubLink } from '@/components/community/CommunityHubLink';
import { cn } from '@/lib/utils';

interface CommunityWidgetProps {
  className?: string;
}

export function CommunityWidget({ className }: CommunityWidgetProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const widgetItems = getClickablePlatformsForSurface('widget');

  useEffect(() => {
    if (!shouldShowWidget()) return;
    setVisible(true);
    trackCommunityInteraction('community_widget_impression', {
      platform: 'all',
      placement: 'floating_widget',
    });
  }, []);

  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;

    function onPointerDown(e: PointerEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
        trackCommunityInteraction('community_widget_close', {
          platform: 'all',
          placement: 'floating_widget',
        });
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        trackCommunityInteraction('community_widget_close', {
          platform: 'all',
          placement: 'floating_widget',
        });
        toggleRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!visible || widgetItems.length === 0 || isWidgetDismissed()) return null;

  function toggle() {
    const next = !open;
    setOpen(next);
    trackCommunityInteraction(next ? 'community_widget_expand' : 'community_widget_close', {
      platform: 'all',
      placement: 'floating_widget',
    });
  }

  function handleDismiss() {
    dismissWidget();
    setVisible(false);
    trackCommunityInteraction('community_widget_close', {
      platform: 'dismiss',
      placement: 'floating_widget',
    });
  }

  return (
    <div
      ref={panelRef}
      className={cn(
        'fixed z-[45] hidden flex-col items-end gap-2 sm:flex',
        'bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 sm:bottom-6 sm:right-6',
        className,
      )}
    >
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${panelId}-title`}
          className={cn(
            'w-[min(100vw-2rem,18rem)] overflow-hidden rounded-2xl border shadow-xl',
            !reducedMotion && 'animate-in fade-in slide-in-from-bottom-2 duration-200',
          )}
          style={{
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 96%, transparent)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div
            className="flex items-start justify-between gap-2 border-b px-4 py-3"
            style={{ borderColor: 'var(--card-border)' }}
          >
            <div>
              <p
                id={`${panelId}-title`}
                className="text-sm font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {COMMUNITY_COPY.widgetLabel}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                Job alerts, tips & discussions
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismiss}
              className="shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)]"
              aria-label="Dismiss community widget permanently"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <ul className="max-h-[min(50vh,16rem)] overflow-y-auto p-2" role="list">
            {widgetItems.map((platform) => (
              <li key={platform.id}>
                <CommunityLink
                  href={platform.url}
                  platform={platform.analyticsName}
                  platformId={platform.id}
                  placement="floating_widget"
                  analyticsEvent="community_widget_click"
                  trackJoin={platform.category === 'community' || platform.category === 'channel'}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]"
                  onClick={() => setOpen(false)}
                >
                  <span
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <CommunityPlatformIcon platformId={platform.icon} className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {platform.title}
                    </span>
                    <span
                      className="block truncate text-xs"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {platform.description}
                    </span>
                  </span>
                </CommunityLink>
              </li>
            ))}
            <li className="border-t pt-1" style={{ borderColor: 'var(--card-border)' }}>
              <CommunityHubLink
                placement="floating_widget"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--accent-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]"
              >
                View all channels →
              </CommunityHubLink>
            </li>
          </ul>
        </div>
      ) : null}

      <button
        ref={toggleRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-lg transition-all duration-200',
          !reducedMotion && 'hover:-translate-y-0.5 hover:shadow-xl',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)] focus-visible:ring-offset-2',
          open && 'bg-[var(--accent-primary)] text-white',
        )}
        style={
          open
            ? undefined
            : {
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
              }
        }
      >
        {open ? (
          <>
            <ChevronUp className="size-4" aria-hidden />
            Close
          </>
        ) : (
          <>
            <MessageCircle className="size-4" aria-hidden />
            {COMMUNITY_COPY.widgetLabel}
          </>
        )}
      </button>
    </div>
  );
}
