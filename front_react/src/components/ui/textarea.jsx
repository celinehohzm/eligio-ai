import * as React from "react"

import { cn } from "@/lib/utils"

const Textarea = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-lg border border-input bg-background/90 px-3 py-2 text-base shadow-sm ring-offset-background transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-muted-foreground focus-visible:border-primary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm hover:border-input resize-y",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }
