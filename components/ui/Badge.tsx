import { cn } from "./cn";

export type Tone = "neutral" | "primary" | "success" | "warning" | "danger" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-3 text-text-2 border-border",
  primary: "bg-primary-soft text-primary border-primary-soft-brd",
  success: "bg-success-soft text-success border-success-brd",
  warning: "bg-warning-soft text-warning border-warning-brd",
  danger: "bg-danger-soft text-danger border-danger-brd",
  info: "bg-info-soft text-info border-info-brd",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
