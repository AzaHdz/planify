import { cn } from "./cn";

const fills = {
  primary: "bg-primary",
  accent: "bg-accent",
  info: "bg-info",
} as const;

/** Barra de macronutriente: etiqueta + gramos·% (mono) + barra de progreso. */
export function MacroBar({
  label,
  gramos,
  pct,
  tone = "primary",
}: {
  label: string;
  gramos: number;
  pct: number;
  tone?: keyof typeof fills;
}) {
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-text-2">{label}</span>
        <span className="font-mono text-xs tabular-nums text-text-3">
          {Math.round(gramos)} g · {Math.round(pct)}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-pill bg-surface-3">
        <div className={cn("h-full rounded-pill", fills[tone])} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
