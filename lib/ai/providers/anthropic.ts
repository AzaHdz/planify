import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { PlanAlimenticio } from "@/lib/ai/planSchema";
import {
  PROMPT_VERSION,
  SYSTEM_PROMPT_PLAN,
  mensajesFewShot,
  construirMensajeUsuario,
} from "@/lib/ai/prompts/plan-v2";
import type { DatosParaPlan, OpcionesPlan, ResultadoPlan } from "@/lib/ai/types";

const MODELO = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

export async function generarPlanAnthropic(
  datos: DatosParaPlan,
  opciones?: OpcionesPlan
): Promise<ResultadoPlan> {
  const client = new Anthropic();

  // El prefijo (system + few-shots) es estático: un breakpoint de caching en el
  // último few-shot abarata todas las generaciones posteriores. Lo variable
  // (estilo del nutriólogo + datos del paciente) va después, en el último turno.
  const fewShot = mensajesFewShot();
  const mensajes: Anthropic.MessageParam[] = fewShot.map((m, i) =>
    i === fewShot.length - 1
      ? {
          role: m.role,
          content: [
            {
              type: "text" as const,
              text: m.content,
              cache_control: { type: "ephemeral" as const },
            },
          ],
        }
      : { role: m.role, content: m.content }
  );
  mensajes.push({
    role: "user",
    content: construirMensajeUsuario(datos, opciones?.estiloNutriologo),
  });

  const response = await client.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    system: SYSTEM_PROMPT_PLAN,
    messages: mensajes,
    output_config: { format: zodOutputFormat(PlanAlimenticio) },
  });

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("El modelo no pudo generar el plan. Intenta de nuevo o revisa los datos.");
  }

  return {
    plan: response.parsed_output,
    promptVersion: PROMPT_VERSION,
    modelo: MODELO,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}
