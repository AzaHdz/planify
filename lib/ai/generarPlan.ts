import { generarPlanAnthropic } from "@/lib/ai/providers/anthropic";
import { generarPlanOpenAI } from "@/lib/ai/providers/openai";
import type { DatosParaPlan, OpcionesPlan, ResultadoPlan } from "@/lib/ai/types";

export type { DatosParaPlan, OpcionesPlan, ResultadoPlan };

type Proveedor = "anthropic" | "openai";

function resolverProveedor(): Proveedor {
  const explicito = process.env.AI_PROVIDER?.toLowerCase();
  if (explicito === "anthropic" || explicito === "openai") return explicito;
  if (explicito) {
    throw new Error(`AI_PROVIDER inválido: "${explicito}". Usa "openai" o "anthropic".`);
  }
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  throw new Error(
    "No hay proveedor de IA configurado. Define OPENAI_API_KEY o ANTHROPIC_API_KEY en .env.local."
  );
}

export async function generarPlan(
  datos: DatosParaPlan,
  opciones?: OpcionesPlan
): Promise<ResultadoPlan> {
  const proveedor = resolverProveedor();
  return proveedor === "anthropic"
    ? generarPlanAnthropic(datos, opciones)
    : generarPlanOpenAI(datos, opciones);
}
