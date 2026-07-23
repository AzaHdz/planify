import type { PlanAlimenticio } from "@/lib/ai/planSchema";

export type DatosParaPlan = {
  // Solo datos clínicos — NUNCA nombre/email/teléfono del paciente (minimización de datos)
  edadAnios: number;
  genero: "FEMENINO" | "MASCULINO" | "OTRO";
  pesoKg: number;
  alturaCm: number;
  medidas: {
    cinturaCm?: number | null;
    caderaCm?: number | null;
    brazoCm?: number | null;
    grasaCorporalPct?: number | null;
  };
  objetivos: string;
  restricciones: string;
};

export type OpcionesPlan = {
  // Preferencias de estilo del nutriólogo (User.estiloPrompt) — se inyectan
  // en el turno de usuario del prompt, delimitadas como datos
  estiloNutriologo?: string | null;
};

export type ResultadoPlan = {
  plan: PlanAlimenticio;
  promptVersion: string;
  modelo: string;
  inputTokens: number;
  outputTokens: number;
};
