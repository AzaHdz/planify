import { PlanAlimenticio } from "@/lib/ai/planSchema";
import type { DatosParaPlan } from "@/lib/ai/types";
import planInicioPerdida from "./plan-inicio-perdida.json";
import planFuerzaRecomposicion from "./plan-fuerza-recomposicion.json";

// Planes reales de una nutrióloga en ejercicio, digitalizados y anonimizados.
// Se validan contra el schema al importar: si el schema cambia y un ejemplo
// queda desalineado, el build truena aquí en lugar de degradar el prompt.
export type EjemploPlan = { datos: DatosParaPlan; plan: PlanAlimenticio };

export const EJEMPLOS: EjemploPlan[] = [
  {
    // Paciente ficticio representativo del plan original (inicio, pérdida de grasa)
    datos: {
      edadAnios: 31,
      genero: "MASCULINO",
      pesoKg: 79,
      alturaCm: 176,
      medidas: { cinturaCm: 87, caderaCm: 99, brazoCm: 36, grasaCorporalPct: 21.5 },
      objetivos:
        "Pérdida de grasa corporal conservando masa muscular. Por indicación médica solo puede hacer ejercicio aeróbico por ahora.",
      restricciones: "Sin restricciones declaradas",
    },
    plan: PlanAlimenticio.parse(planInicioPerdida),
  },
  {
    // Paciente ficticio representativo del plan original (fuerza, recomposición)
    datos: {
      edadAnios: 31,
      genero: "MASCULINO",
      pesoKg: 80,
      alturaCm: 176,
      medidas: { cinturaCm: 84, caderaCm: 99, brazoCm: 37, grasaCorporalPct: 17 },
      objetivos:
        "Recomposición corporal: ganar masa muscular manteniendo el porcentaje de grasa. Entrena fuerza 5 veces por semana, rutina vespertina.",
      restricciones: "Sin restricciones declaradas",
    },
    plan: PlanAlimenticio.parse(planFuerzaRecomposicion),
  },
];
