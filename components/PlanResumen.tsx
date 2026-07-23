import type { PlanAlimenticio } from "@/lib/ai/planSchema";
import { resumenPlan } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { MacroBar } from "@/components/ui/MacroBar";

/** Resumen nutricional del día: objetivo vs plan, barras de macros y checklist. */
export function PlanResumen({ plan }: { plan: PlanAlimenticio }) {
  const r = resumenPlan(plan);

  return (
    <Card className="p-5">
      <div className="mb-3.5 font-display text-[15px] font-bold text-text">Resumen nutricional del día</div>

      <div className="mb-4 flex items-baseline justify-between rounded-ctl bg-surface-2 px-3.5 py-2.5">
        <span className="text-[13px] text-text-2">
          <b className="font-mono tabular-nums text-text">{r.objetivo.toLocaleString("es-MX")}</b> kcal objetivo
        </span>
        <span className={`text-[13px] ${r.enObjetivo ? "text-success" : "text-warning"}`}>
          <b className="font-mono tabular-nums">{r.kcalPlan.toLocaleString("es-MX")}</b> kcal plan {r.enObjetivo ? "✓" : "⚠"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <MacroBar label="Proteína" gramos={r.macros.proteina.gramos} pct={r.macros.proteina.pct} tone="primary" />
        <MacroBar label="Carbohidratos" gramos={r.macros.carbo.gramos} pct={r.macros.carbo.pct} tone="accent" />
        <MacroBar label="Grasas" gramos={r.macros.grasa.gramos} pct={r.macros.grasa.pct} tone="info" />
      </div>

      <div className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-border pt-3.5">
        {plan.advertencias.length === 0 ? (
          <div className="flex items-center gap-2 text-[12.5px] text-text-2">
            <span className="size-1.5 rounded-full bg-success" />
            Sin conflictos detectados por la validación.
          </div>
        ) : (
          plan.advertencias.map((a, i) => (
            <div key={i} className="flex items-start gap-2 text-[12.5px] text-text-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
              {a}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
