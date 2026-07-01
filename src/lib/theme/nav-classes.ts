import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { IE_TRANSITION_COLORS } from '@/lib/theme/component-classes';

/** Sticky marketing / app header height — keep all nav shells aligned */
export const NAV_SHELL_HEIGHT_CLASS = 'h-16';

export const NAV_DESKTOP_LINK_BASE = cn(
  'flex h-9 items-center rounded-[var(--ie-radius-sm)] px-3 text-sm font-medium',
  IE_TRANSITION_COLORS,
  'text-(--text-secondary) hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] hover:text-(--text-primary)',
);

export const NAV_DESKTOP_LINK_ACTIVE = cn(
  'bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] font-semibold text-(--accent-primary)',
);

export const NAV_DROPDOWN_TRIGGER_BASE = cn(
  'flex h-9 items-center gap-1 rounded-[var(--ie-radius-sm)] px-3 text-sm font-medium',
  IE_TRANSITION_COLORS,
);

export const NAV_PRIMARY_CTA_CLASS = cn(
  'inline-flex h-9 min-h-9 items-center justify-center gap-1.5 rounded-[var(--ie-radius-sm)] px-4 text-sm font-semibold text-white',
  'transition-opacity duration-200 hover:opacity-90 motion-reduce:transition-none',
);

export const NAV_PRIMARY_CTA_STYLE: CSSProperties = {
  background: 'var(--accent-primary)',
  boxShadow:
    'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
};

export const NAV_MOBILE_LINK_BASE = cn(
  'flex min-h-11 items-center rounded-[var(--ie-radius-md)] px-4 py-2.5 text-base font-medium text-foreground',
  IE_TRANSITION_COLORS,
  'active:bg-accent',
);

export const NAV_MOBILE_LINK_ACTIVE = cn(
  'bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] font-semibold text-(--accent-primary)',
);

export const NAV_MOBILE_SECTION_LABEL = cn(
  'px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-(--text-muted)',
);

export const NAV_MOBILE_SUB_LINK = cn(
  'flex min-h-11 items-center rounded-[var(--ie-radius-sm)] px-4 py-2.5 text-sm font-medium text-muted-foreground',
  IE_TRANSITION_COLORS,
  'active:bg-accent',
);
