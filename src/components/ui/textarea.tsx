import * as React from "react"

import { cn } from "@/lib/utils"
import { IE_FOCUS_VISIBLE, IE_TRANSITION_COLORS } from "@/lib/theme/component-classes"

/**
 * Compact default for in-app utility textareas (interview answers, etc.).
 * Primary / marketing forms: pass `IE_TEXTAREA_TOOL_CLASS` (and surface style) via `className`.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-[var(--ie-radius-sm)] border border-input bg-transparent px-2.5 py-2 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        IE_TRANSITION_COLORS,
        IE_FOCUS_VISIBLE,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
