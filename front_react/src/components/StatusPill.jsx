import { AlertTriangle, Circle, HelpCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared color+icon vocabulary for status, so the same meaning (done / needs
 * attention / blocked / inactive) always looks the same across the app —
 * never color alone, always paired with an icon and a text label.
 */
export const STATUS_TONE_CLASSES = {
  success: "border-success text-success",
  warning: "border-warning text-warning",
  danger: "border-destructive text-destructive",
  neutral: "border-line text-muted-foreground",
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
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
        STATUS_TONE_CLASSES[tone],
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}
