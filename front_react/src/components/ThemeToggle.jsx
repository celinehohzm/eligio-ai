import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const modes = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export function ThemeToggle({ className }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("size-9 shrink-0 border-border/70 bg-background/80", className)}
        aria-hidden
        tabIndex={-1}
      />
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn(
            "relative size-9 shrink-0 overflow-hidden border-border/70 bg-background/80 backdrop-blur-sm shadow-sm ring-offset-background transition-[transform,box-shadow] duration-200 hover:bg-accent/75",
            className,
          )}
          aria-label="Color theme"
        >
          <Sun className="size-[1.15rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" aria-hidden />
          <Moon className="absolute size-[1.15rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" aria-hidden />
          <span className="sr-only">Open theme menu</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[10.5rem] p-1">
        <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Appearance</p>
        {modes.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none",
              theme === value && "bg-accent/80 font-medium text-accent-foreground",
            )}
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
