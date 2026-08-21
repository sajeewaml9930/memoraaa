import * as React from "react"

import { cn } from "@/lib/utils"

function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent bg-primary px-2 py-0.5 text-xs font-medium whitespace-nowrap text-primary-foreground transition-colors",
        className
      )}
      {...props}
    />
  )
}

export { Badge }
