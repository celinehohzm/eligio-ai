import { AlertTriangle, Circle, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared color+icon vocabulary for status, so the same meaning (done / needs
 * attention / blocked / inactive) always looks the same across the app —
 * never color alone, always paired with an icon and a text label.
 */
export const STATUS_TONE_CLASSES = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-muted/60 text-muted-foreground",
};

const TONE_ICONS = {
  success: CheckCircle2,
  warning: HelpCircle,
  danger: AlertTriangle,
  neutral: Circle,
};

export default function StatusPill({ tone = "neutral", label, icon: IconOverride, className }) {
  const Icon = IconOverride ?? TONE_ICONS[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        STATUS_TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
