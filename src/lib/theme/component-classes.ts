import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Scoped color/shadow transitions — use instead of `transition-all` on interactive UI.
 */
export const IE_TRANSITION_COLORS = cn(
  'transition-[color,background-color,border-color,opacity,box-shadow]',
  'duration-200 ease-out',
  'motion-reduce:transition-none',
)

/**
 * Shared focus-visible ring aligned with auth / premium form fields.
 */
export const IE_FOCUS_VISIBLE = cn(
  'focus-visible:outline-none',
  'focus-visible:border-[var(--ie-focus-border)]',
  'focus-visible:ring-2 focus-visible:ring-[var(--ie-focus-ring)]',
)

/** Consistent placeholder treatment across form fields */
export const IE_PLACEHOLDER_CLASS =
  'placeholder:text-[var(--text-muted)] placeholder:opacity-90'

/** Label typography — block fields */
export const IE_LABEL_CLASS =
  'block text-sm font-semibold sm:text-base text-[var(--text-primary)]'

/** Optional field hint inline with labels */
export const IE_LABEL_OPTIONAL_CLASS = 'font-normal text-[var(--text-muted)]'

/** Standard vertical rhythm for label + control */
export const IE_FIELD_GROUP_CLASS = 'space-y-2'

/** Helper text below inputs */
export const IE_HELPER_TEXT_CLASS = 'text-xs leading-relaxed text-[var(--text-muted)]'

/** Inline field-level validation message */
export const IE_FIELD_ERROR_CLASS = 'text-sm leading-snug text-[var(--accent-danger)]'

/** Shared alert banner chrome (error, success, warning) */
export const IE_ALERT_BANNER_CLASS =
  'rounded-[var(--ie-radius-md)] border-2 px-4 py-3 text-sm font-medium leading-relaxed'

export const IE_ALERT_ERROR_STYLE: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--accent-danger) 35%, var(--card-border))',
  background: 'color-mix(in srgb, var(--accent-danger) 8%, transparent)',
  color: 'var(--accent-danger)',
}

export const IE_ALERT_SUCCESS_STYLE: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--accent-success) 35%, var(--card-border))',
  background: 'color-mix(in srgb, var(--accent-success) 10%, transparent)',
  color: 'var(--text-primary)',
}

export const IE_ALERT_WARNING_STYLE: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--accent-warning) 10%, transparent)',
  color: 'var(--text-primary)',
}

/**
 * Premium primary-form field variants — use on auth, tools, upload, onboarding.
 * Do NOT bake these into `components/ui/input` or `textarea`; keep primitives compact.
 *
 * - `IE_INPUT_CLASS` — native `<input>` in auth flows (border-2, md radius)
 * - `IE_INPUT_TOOL_CLASS` — `<Input>` / tool forms (h-11 touch target)
 * - `IE_TEXTAREA_TOOL_CLASS` — `<Textarea>` in tool / feedback forms
 */
export const IE_INPUT_CLASS = cn(
  'w-full min-w-0 border-2 px-4 py-2.5 text-sm shadow-none',
  'rounded-[var(--ie-radius-md)]',
  IE_PLACEHOLDER_CLASS,
  'disabled:cursor-not-allowed disabled:opacity-60',
  'read-only:cursor-default read-only:opacity-80',
  'aria-invalid:border-[color-mix(in_srgb,var(--accent-danger)_45%,var(--card-border))]',
  'aria-invalid:ring-2 aria-invalid:ring-[color-mix(in_srgb,var(--accent-danger)_18%,transparent)]',
  IE_TRANSITION_COLORS,
  IE_FOCUS_VISIBLE,
)

/** Selects and fields that extend the base input surface */
export const IE_SELECT_CLASS = cn(IE_INPUT_CLASS, 'cursor-pointer appearance-none pr-10')

/** Tool forms — slightly taller fields (h-11, 44px touch target) */
export const IE_INPUT_TOOL_CLASS = cn(IE_INPUT_CLASS, 'h-11 text-base sm:text-sm')

export const IE_SELECT_TOOL_CLASS = cn(
  IE_INPUT_TOOL_CLASS,
  'cursor-pointer appearance-none pl-3.5 pr-10 font-medium',
  'hover:border-[color-mix(in_srgb,var(--accent-primary)_35%,var(--card-border))]',
)

/** Tool textareas — matches input height rhythm */
export const IE_TEXTAREA_TOOL_CLASS = cn(
  IE_INPUT_TOOL_CLASS,
  'h-auto min-h-[5.5rem] resize-y py-3 leading-relaxed',
)

/** Shared inline surface for bordered auth/tool fields */
export const IE_FIELD_SURFACE_STYLE = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 70%, transparent)',
  color: 'var(--text-primary)',
} as const

/** Primary form submit — auth, tools, uploads */
export const IE_SUBMIT_BUTTON_CLASS = cn(
  'landing-cta-lift inline-flex h-12 w-full min-h-[48px] items-center justify-center gap-2',
  'rounded-[14px] px-8 text-base font-semibold text-white',
  'transition-[transform,opacity] duration-150',
  'disabled:pointer-events-none disabled:opacity-60 motion-reduce:transform-none sm:h-[3.25rem]',
)

export const IE_SUBMIT_BUTTON_STYLE: CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
  boxShadow: '0 16px 48px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
}

/** Unified loading spinners */
export const IE_SPINNER_CLASS = 'size-4 shrink-0 animate-spin motion-reduce:animate-none'
export const IE_SPINNER_LG_CLASS = 'size-5 shrink-0 animate-spin motion-reduce:animate-none'

/** Dashed upload dropzone shell */
export const IE_UPLOAD_ZONE_CLASS = cn(
  'flex flex-col items-center justify-center gap-3 text-center',
  'rounded-[var(--ie-radius-md)] border-2 border-dashed px-6 py-10 sm:py-12',
  IE_TRANSITION_COLORS,
)

export const IE_UPLOAD_ZONE_IDLE_STYLE: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--card-border) 85%, transparent)',
  background: 'color-mix(in srgb, var(--bg-secondary) 88%, transparent)',
}

export const IE_UPLOAD_ZONE_DRAG_STYLE: CSSProperties = {
  borderColor: 'color-mix(in srgb, var(--accent-primary) 55%, var(--card-border))',
  background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
  boxShadow: '0 0 0 3px color-mix(in srgb, var(--accent-primary) 18%, transparent)',
}

export const IE_UPLOAD_ICON_SHELL_CLASS =
  'flex size-12 items-center justify-center rounded-2xl sm:size-14'

export const IE_UPLOAD_ICON_SHELL_STYLE: CSSProperties = {
  background: 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
  color: 'var(--accent-primary)',
}

/** Bordered surface panels (banners, recovery cards) */
export const IE_SURFACE_CLASS = cn(
  'rounded-[var(--ie-radius-md)] border-2',
  IE_FOCUS_VISIBLE,
)

/** Premium card shell radius (FreeToolFormCard, dashboard-premium-card mobile) */
export const IE_CARD_RADIUS_CLASS = 'rounded-[var(--ie-radius-xl)] lg:rounded-[var(--ie-radius-2xl)]'

/** Pill eyebrow badge on blog, resources, and tools pages */
export const IE_MARKETING_EYEBROW_PILL_CLASS =
  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide'

export const IE_MARKETING_EYEBROW_PILL_STYLE: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
  color: 'var(--text-primary)',
}

/** Standard bordered marketing surface card (teams, community, sidebar panels) */
export const IE_MARKETING_SURFACE_CARD_CLASS = cn(
  'rounded-2xl border-2 transition-[border-color,box-shadow,transform] duration-150',
  'hover:-translate-y-0.5 motion-reduce:transform-none',
  IE_FOCUS_VISIBLE,
)

export const IE_MARKETING_SURFACE_CARD_STYLE: CSSProperties = {
  borderColor: 'var(--card-border)',
  background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
  boxShadow: 'var(--card-shadow)',
}

/** Primary marketing CTA — hub pages, content cards, resources */
export const IE_MARKETING_CTA_PRIMARY_CLASS = cn(
  'landing-cta-lift inline-flex h-11 min-h-[44px] items-center justify-center gap-2',
  'rounded-[12px] px-6 text-sm font-semibold text-white',
  IE_FOCUS_VISIBLE,
)

export const IE_MARKETING_CTA_PRIMARY_STYLE: CSSProperties = {
  background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
  boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
}

/** Secondary / outline marketing CTA */
export const IE_MARKETING_CTA_SECONDARY_CLASS = cn(
  'inline-flex h-11 min-h-[44px] items-center justify-center gap-2',
  'rounded-[12px] border px-6 text-sm font-semibold transition-colors',
  'hover:border-[color-mix(in_srgb,var(--accent-primary)_35%,var(--card-border))]',
  IE_FOCUS_VISIBLE,
)

export const IE_MARKETING_CTA_SECONDARY_STYLE: CSSProperties = {
  borderColor: 'var(--card-border)',
  color: 'var(--text-secondary)',
}
