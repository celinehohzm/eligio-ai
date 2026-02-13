import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}act.HTMLAttributesMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
