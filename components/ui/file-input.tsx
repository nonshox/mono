import * as React from "react"
import { cn } from "cn"

/**
 * Hidden file <input> for upload buttons. The one "raw" input Mono allows —
 * wrapped so hidden uploads use the same shadcn path as everything else.
 * Pair with a visible trigger button that clicks this ref.
 */
const FileInput = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(function FileInput({ className, tabIndex = -1, ...props }, ref) {
  return (
    <input
      aria-hidden="true"
      className={cn("hidden", className)}
      data-slot="file-input"
      ref={ref}
      tabIndex={tabIndex}
      type="file"
      {...props}
    />
  )
})

export { FileInput }
