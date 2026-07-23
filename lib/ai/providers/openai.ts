import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { PlanAlimenticio } from "@/lib/ai/planSchema";
import {
  PROMPT_VERSION,
  SYSTEM_PROMPT_PLAN,
  mensajesFewShot,
  construirMensajeUsuario,
} from "@/lib/ai/prompts/plan-v2";
import type { DatosParaPlan, OpcionesPlan, ResultadoPlan } from "@/lib/ai/types";

const MODELO = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

export async function generarPlanOpenAI(
  datos: DatosParaPlan,
  opciones?: OpcionesPlan
): Promise<ResultadoPlan> {
  const client = new OpenAI();

  // Los modelos con razonamiento (gpt-5*, o*) aceptan `reasoning.effort`;
  // "low" mantiene la aritmética correcta con mucha menos latencia.
  const esRazonador = /^(gpt-5|o\d)/.test(MODELO);

  const response = await client.responses.parse({
    model: MODELO,
    ...(esRazonador && {
      reasoning: {
        effort: (process.env.OPENAI_REASONING_EFFORT ?? "low") as "low",
      },
    }),
    instructions: SYSTEM_PROMPT_PLAN,
    input: [
      ...mensajesFewShot(),
      {
        role: "user" as const,
        content: construirMensajeUsuario(datos, opciones?.estiloNutriologo),
      },
    ],
    text: { format: zodTextFormat(PlanAlimenticio, "plan_alimenticio") },
  });

  if (!response.output_parsed) {
    throw new Error("El modelo no pudo generar el plan. Intenta de nuevo o revisa los datos.");
  }

  return {
    plan: response.output_parsed,
    promptVersion: PROMPT_VERSION,
    modelo: MODELO,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}
