import { z } from "zod";

export const OpcionComida = z.object({
  descripcion: z.string().describe("Nombre corto del platillo, ej. 'Chilaquiles verdes con pollo'"),
  alimentos: z
    .array(z.string())
    .describe("Ingredientes con cantidad en medidas caseras, ej. '1 taza de arroz cocido'"),
  kcalAprox: z.number().describe("Kilocalorías aproximadas de esta opción completa"),
});

export const Comida = z.object({
  nombre: z.string().describe("Ej. 'Desayuno', 'Colación matutina', 'Comida', 'Colación vespertina', 'Cena'"),
  horarioSugerido: z.string().describe("Ej. '7:00–8:00'"),
  opciones: z.array(OpcionComida).describe("Exactamente 5 opciones intercambiables"),
});

export const PlanAlimenticio = z.object({
  kcalObjetivoDiarias: z.number(),
  macros: z.object({
    proteinas_g: z.number(),
    carbohidratos_g: z.number(),
    grasas_g: z.number(),
  }),
  comidas: z.array(Comida).describe("Exactamente 5 comidas"),
  recomendacionesGenerales: z
    .array(z.string())
    .describe("Hidratación, actividad física, hábitos — máximo 6"),
  suplementacion: z
    .array(
      z.object({
        indicacion: z.string().describe("Suplemento, ej. 'Omega 3' o 'Magnesio'"),
        momento: z.string().describe("Cuándo tomarlo, ej. 'después del desayuno'"),
      })
    )
    .default([])
    .describe(
      "Suplementación sugerida SOLO si aporta al objetivo del paciente; máximo 4; vacío si no aplica. El nutriólogo la valida."
    ),
  advertencias: z
    .array(z.string())
    .describe(
      "Cualquier conflicto entre el plan y las restricciones/condiciones del paciente, o dudas que el nutriólogo deba revisar. Vacío si no hay."
    ),
});

export type PlanAlimenticio = z.infer<typeof PlanAlimenticio>;
