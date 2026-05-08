import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-[color,background-color,border-color,transform,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-[0.5px] active:transition-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 motion-reduce:transition-none motion-reduce:hover:shadow-none motion-reduce:active:translate-y-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/92 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/92 hover:-translate-y-px hover:shadow-md",
        outline:
          "border border-input bg-background/80 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-border hover:-translate-y-px hover:shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/85 hover:-translate-y-px hover:shadow-sm",
        ghost:
          "hover:bg-accent hover:text-accent-foreground motion-safe:hover:bg-accent/80",
        link: "text-primary underline-offset-4 hover:underline active:translate-y-0 px-1",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
