/**
 * Cálculos nutricionales hechos en código — nunca se confía en la aritmética
 * del LLM (§3.5 del manual). Se usan para validar el plan generado.
 */

export function edadEnAnios(fechaNacimiento: Date, hoy = new Date()): number {
  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const m = hoy.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;
  return edad;
}

/** Índice de masa corporal. peso en kg, altura en cm. */
export function imc(pesoKg: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return pesoKg / (m * m);
}

/** Clasifica el IMC y devuelve el rango clínico para colorear la cifra
 *  ("in" = normal, "out" = fuera de rango leve, "critical" = obesidad/bajo peso severo). */
export function clasificacionIMC(valor: number): {
  etiqueta: string;
  rango: "in" | "out" | "critical";
} {
  if (valor < 16) return { etiqueta: "Bajo peso severo", rango: "critical" };
  if (valor < 18.5) return { etiqueta: "Bajo peso", rango: "out" };
  if (valor < 25) return { etiqueta: "Normal", rango: "in" };
  if (valor < 30) return { etiqueta: "Sobrepeso", rango: "out" };
  return { etiqueta: "Obesidad", rango: "critical" };
}

/** Tasa Metabólica Basal — Mifflin-St Jeor. peso en kg, altura en cm. */
export function tmbMifflin(params: {
  pesoKg: number;
  alturaCm: number;
  edad: number;
  genero: "FEMENINO" | "MASCULINO" | "OTRO";
}): number {
  const { pesoKg, alturaCm, edad, genero } = params;
  const base = 10 * pesoKg + 6.25 * alturaCm - 5 * edad;
  // Para OTRO se usa el promedio de ambas fórmulas
  if (genero === "MASCULINO") return base + 5;
  if (genero === "FEMENINO") return base - 161;
  return base - 78;
}

export const FACTORES_ACTIVIDAD = {
  sedentario: 1.2,
  ligero: 1.375,
  moderado: 1.55,
  intenso: 1.725,
} as const;

/**
 * Valida las kcal objetivo que propuso la IA contra el rango plausible
 * (TMB × 1.2 con déficit 25% … TMB × 1.725 con superávit 15%).
 * Devuelve advertencias para mostrar al nutriólogo; lista vacía = OK.
 */
export function validarPlan(plan: {
  kcalObjetivoDiarias: number;
  comidas: { nombre: string; opciones: { kcalAprox: number }[] }[];
  macros: { proteinas_g: number; carbohidratos_g: number; grasas_g: number };
}, paciente: {
  pesoKg: number;
  alturaCm: number;
  edad: number;
  genero: "FEMENINO" | "MASCULINO" | "OTRO";
}): string[] {
  const advertencias: string[] = [];
  const tmb = tmbMifflin(paciente);
  const minimo = tmb * FACTORES_ACTIVIDAD.sedentario * 0.75;
  const maximo = tmb * FACTORES_ACTIVIDAD.intenso * 1.15;

  if (plan.kcalObjetivoDiarias < minimo || plan.kcalObjetivoDiarias > maximo) {
    advertencias.push(
      `Las kcal objetivo (${Math.round(plan.kcalObjetivoDiarias)}) están fuera del rango plausible ` +
      `(${Math.round(minimo)}–${Math.round(maximo)}) para una TMB de ${Math.round(tmb)} kcal.`
    );
  }

  // Cada opción de cada comida debería sumar (entre todas las comidas) ≈ objetivo diario.
  // Se valida el promedio de opciones por comida.
  const promedioDiario = plan.comidas.reduce((total, comida) => {
    if (comida.opciones.length === 0) return total;
    const prom =
      comida.opciones.reduce((s, o) => s + o.kcalAprox, 0) / comida.opciones.length;
    return total + prom;
  }, 0);

  const desvio = Math.abs(promedioDiario - plan.kcalObjetivoDiarias) / plan.kcalObjetivoDiarias;
  if (desvio > 0.15) {
    advertencias.push(
      `La suma promedio de las comidas (${Math.round(promedioDiario)} kcal) se desvía ` +
      `${Math.round(desvio * 100)}% del objetivo diario (${Math.round(plan.kcalObjetivoDiarias)} kcal).`
    );
  }

  // Coherencia de macros: 4/4/9 kcal por gramo
  const kcalDeMacros =
    plan.macros.proteinas_g * 4 + plan.macros.carbohidratos_g * 4 + plan.macros.grasas_g * 9;
  const desvioMacros = Math.abs(kcalDeMacros - plan.kcalObjetivoDiarias) / plan.kcalObjetivoDiarias;
  if (desvioMacros > 0.12) {
    advertencias.push(
      `Los macros declarados equivalen a ${Math.round(kcalDeMacros)} kcal, ` +
      `pero el objetivo es ${Math.round(plan.kcalObjetivoDiarias)} kcal.`
    );
  }

  return advertencias;
}
