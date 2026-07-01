import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"
import { IE_FOCUS_VISIBLE, IE_TRANSITION_COLORS } from "@/lib/theme/component-classes"

/**
 * Compact default for dashboard search, filters, settings, dialogs.
 * Primary / marketing forms: pass `IE_INPUT_TOOL_CLASS` (and surface style) via `className`.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-[var(--ie-radius-sm)] border border-input bg-transparent px-2.5 py-1 text-base outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        IE_TRANSITION_COLORS,
        IE_FOCUS_VISIBLE,
        className
      )}
      {...props}
    />
  )
}

export { Input }
