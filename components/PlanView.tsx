import type { PlanAlimenticio } from "@/lib/ai/planSchema";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

function kcalComida(opciones: { kcalAprox: number }[]): number {
  if (opciones.length === 0) return 0;
  return Math.round(opciones.reduce((s, o) => s + o.kcalAprox, 0) / opciones.length);
}

/** Cards por comida con sus opciones (vista de pantalla). Solo lectura. */
export function PlanView({ plan }: { plan: PlanAlimenticio }) {
  return (
    <div className="flex flex-col gap-3.5">
      {plan.comidas.map((comida) => (
        <div key={comida.nombre} className="overflow-hidden rounded-card border border-border bg-surface break-inside-avoid">
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-sm font-bold text-text">{comida.nombre}</span>
            <span className="font-mono text-[11.5px] tabular-nums text-text-3">
              {comida.horarioSugerido} · ~{kcalComida(comida.opciones)} kcal
            </span>
          </div>
          <ol className="flex flex-col divide-y divide-border">
            {comida.opciones.map((op, i) => (
              <li key={i} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-px shrink-0 rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-text-2">
                  {LETRAS[i] ?? i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13.5px] font-semibold text-text">{op.descripcion}</p>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-3">
                      ~{Math.round(op.kcalAprox)} kcal
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12.5px] text-text-2">{op.alimentos.join(" · ")}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}

      {(plan.suplementacion?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-card border border-border bg-surface break-inside-avoid">
          <div className="border-b border-border bg-surface-2 px-4 py-2.5">
            <span className="font-display text-sm font-bold text-text">Suplementación</span>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {plan.suplementacion.map((s, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 px-4 py-2.5">
                <span className="text-[13.5px] font-semibold text-text">{s.indicacion}</span>
                <span className="text-[12.5px] text-text-2">{s.momento}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
