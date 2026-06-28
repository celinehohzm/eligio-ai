import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const TONE_CLASSES = {
  urgent: "border-destructive text-destructive",
  review: "border-warning text-warning",
  routine: "border-success text-success",
};

const TONE_LABELS = {
  urgent: "Urgent",
  review: "Needs review",
  routine: "Routine",
};

export default function UrgencyTag({ tone = "routine", label, className }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em]",
        TONE_CLASSES[tone] || TONE_CLASSES.routine,
        className
      )}
    >
      <Flag className="size-3 shrink-0" aria-hidden />
      {label ?? TONE_LABELS[tone] ?? tone}
    </span>
  );
}
