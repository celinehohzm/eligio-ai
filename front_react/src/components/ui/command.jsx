import * as React from "react"
import { Command } from "cmdk"

import { cn } from "@/lib/utils"

const CommandMenu = React.forwardRef(({ className, ...props }, ref) => (
  <Command
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  />
))
CommandMenu.displayName = Command.displayName

const CommandInput = React.forwardRef(({ className, ...props }, ref) => (
  <Command.Input
    ref={ref}
    className={cn(
      "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  />
))
CommandInput.displayName = Command.Input.displayName

const CommandList = React.forwardRef(({ className, ...props }, ref) => (
  <Command.List
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandList.displayName = Command.List.displayName

const CommandEmpty = React.forwardRef(({ className, ...props }, ref) => (
  <Command.Empty
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
))
CommandEmpty.displayName = Command.Empty.displayName

const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (
  <Command.Group
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium",
      className
    )}
    {...props}
  />
))
CommandGroup.displayName = Command.Group.displayName

const CommandSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <Command.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
CommandSeparator.displayName = Command.Separator.displayName

const CommandItem = React.forwardRef(({ className, ...props }, ref) => (
  <Command.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))
CommandItem.displayName = Command.Item.displayName

const CommandShortcut = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "ml-auto text-xs tracking-widest text-muted-foreground",
      className
    )}
    {...props}
  />
))
CommandShortcut.displayName = "CommandShortcut"

export {
  CommandMenu as Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandSeparator,
  CommandItem,
  CommandShortcut,
}
