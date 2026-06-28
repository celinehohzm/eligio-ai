import { cn } from "@/lib/utils";

export function Mark({ className, stroke = "var(--red)", strokeWidth = 2, ...props }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      aria-hidden
      {...props}
    >
      <circle cx="16" cy="16" r="6" />
      <path d="M16 1 V8 M16 24 V31 M1 16 H8 M24 16 H31" />
    </svg>
  );
}

export function Logo({ variant = "default", size = 22, className, markClassName, wordClassName }) {
  const reversed = variant === "reversed";
  return (
    <span className={cn("inline-flex items-center gap-[9px]", className)}>
      <Mark
        className={cn("shrink-0", markClassName)}
        stroke={reversed ? "var(--red)" : "var(--red)"}
        style={{ width: size, height: size }}
      />
      <span
        className={cn(
          "font-display text-[19px] font-extrabold tracking-[-0.03em]",
          reversed ? "text-on-strong" : "text-ink",
          wordClassName
        )}
      >
        Eligio<span className="text-signal">.</span>
      </span>
    </span>
  );
}

export default Logo;
