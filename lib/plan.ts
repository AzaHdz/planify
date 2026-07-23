import type { PlanAlimenticio } from "@/lib/ai/planSchema";

/** Extrae las kcal objetivo del plan guardado (Json) sin parsear todo el schema. */
export function kcalDePlan(planFinal: unknown): number | null {
  if (planFinal && typeof planFinal === "object" && "kcalObjetivoDiarias" in planFinal) {
    const v = (planFinal as { kcalObjetivoDiarias?: unknown }).kcalObjetivoDiarias;
    return typeof v === "number" ? Math.round(v) : null;
  }
  return null;
}

export type MacroResumen = { gramos: number; pct: number };

export type ResumenPlan = {
  objetivo: number;
  kcalPlan: number;
  desvio: number;
  enObjetivo: boolean;
  macros: { proteina: MacroResumen; carbo: MacroResumen; grasa: MacroResumen };
};

/**
 * Aritmética del plan reutilizable en la vista de resumen y en el editor en vivo.
 * kcalPlan = suma del promedio de opciones por comida (mismo criterio que validarPlan).
 * Los % de macros son respecto a las kcal aportadas por los macros (4/4/9 kcal/g).
 */
export function resumenPlan(plan: PlanAlimenticio): ResumenPlan {
  const { proteinas_g, carbohidratos_g, grasas_g } = plan.macros;
  const kcalP = proteinas_g * 4;
  const kcalC = carbohidratos_g * 4;
  const kcalG = grasas_g * 9;
  const kcalMacros = kcalP + kcalC + kcalG || 1;

  const kcalPlan = Math.round(
    plan.comidas.reduce((total, c) => {
      if (c.opciones.length === 0) return total;
      return total + c.opciones.reduce((s, o) => s + o.kcalAprox, 0) / c.opciones.length;
    }, 0),
  );

  const objetivo = Math.round(plan.kcalObjetivoDiarias);
  const desvio = objetivo > 0 ? Math.abs(kcalPlan - objetivo) / objetivo : 0;

  return {
    objetivo,
    kcalPlan,
    desvio,
    enObjetivo: desvio <= 0.15,
    macros: {
      proteina: { gramos: proteinas_g, pct: (kcalP / kcalMacros) * 100 },
      carbo: { gramos: carbohidratos_g, pct: (kcalC / kcalMacros) * 100 },
      grasa: { gramos: grasas_g, pct: (kcalG / kcalMacros) * 100 },
    },
  };
}
