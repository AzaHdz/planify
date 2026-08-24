"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { generarPlan } from "@/lib/ai/generarPlan";
import { PlanAlimenticio } from "@/lib/ai/planSchema";
import { edadEnAnios, validarPlan } from "@/lib/calculos";
import {
  LIMITES_TIER,
  MAX_GENERACIONES_POR_CONSULTA,
  consultasUsadasEsteMes,
} from "@/lib/limits";

const ConsultaInput = z.object({
  pacienteId: z.string().min(1),
  peso: z.coerce.number().positive("Peso inválido"),
  altura: z.coerce.number().positive("Altura inválida"),
  cintura: z.coerce.number().positive().optional().or(z.literal("")),
  cadera: z.coerce.number().positive().optional().or(z.literal("")),
  brazo: z.coerce.number().positive().optional().or(z.literal("")),
  grasaCorporal: z.coerce.number().min(1).max(70).optional().or(z.literal("")),
  objetivos: z.string().min(3, "Describe el objetivo"),
  restricciones: z.string().default(""),
});

function num(v: number | "" | undefined): number | null {
  return typeof v === "number" ? v : null;
}

export async function crearConsulta(formData: FormData) {
  const { userId, tier } = await requireUser();

  // Cuota mensual del tier; generarPlanAction aplica sus propios topes.
  // Los errores se devuelven como valor (no throw) para que el formulario
  // los muestre; un throw en producción se enmascara como 500 genérico.
  const limite = LIMITES_TIER[tier].consultasMes;
  if (limite !== null) {
    const usadas = await consultasUsadasEsteMes(userId);
    if (usadas >= limite) {
      return {
        ok: false as const,
        error: `Alcanzaste el límite de ${limite} consultas de tu plan ${LIMITES_TIER[tier].nombre} este mes. El límite se reinicia el día 1; para ampliarlo, contacta al administrador de Planify.`,
      };
    }
  }

  const parsed = ConsultaInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }
  const d = parsed.data;

  // Verificar que el paciente pertenece a este nutriólogo
  const paciente = await prisma.paciente.findFirst({
    where: { id: d.pacienteId, userId },
    select: { id: true },
  });
  if (!paciente) return { ok: false as const, error: "Paciente no encontrado" };

  const consulta = await prisma.consulta.create({
    data: {
      userId,
      pacienteId: d.pacienteId,
      peso: d.peso,
      altura: d.altura,
      cintura: num(d.cintura),
      cadera: num(d.cadera),
      brazo: num(d.brazo),
      grasaCorporal: num(d.grasaCorporal),
      objetivos: d.objetivos,
      restricciones: d.restricciones || "Sin restricciones declaradas",
    },
  });

  redirect(`/consultas/${consulta.id}`);
}

export async function generarPlanAction(consultaId: string) {
  const { userId, tier } = await requireUser();

  const consulta = await prisma.consulta.findFirst({
    where: { id: consultaId, userId },
    include: { paciente: true, user: { select: { estiloPrompt: true } } },
  });
  if (!consulta) throw new Error("Consulta no encontrada");

  // Cada llamada a la IA cuesta tokens reales, así que aquí sí hay topes.
  if (consulta.generaciones >= MAX_GENERACIONES_POR_CONSULTA) {
    return {
      ok: false as const,
      error: `Esta consulta ya usó sus ${MAX_GENERACIONES_POR_CONSULTA} generaciones de plan. Ajusta el plan con el editor.`,
    };
  }
  // La primera generación no revisa la cuota mensual: pertenece a una consulta
  // que ya pasó ese check al crearse (bloquearla dejaría a la última consulta
  // permitida del mes sin plan). Regenerar sí la respeta.
  const limite = LIMITES_TIER[tier].consultasMes;
  if (consulta.generaciones >= 1 && limite !== null) {
    const usadas = await consultasUsadasEsteMes(userId);
    if (usadas >= limite) {
      return {
        ok: false as const,
        error: `Alcanzaste el límite de ${limite} consultas de tu plan ${LIMITES_TIER[tier].nombre} este mes, así que regenerar planes queda pausado hasta el día 1. Puedes seguir editando el plan actual.`,
      };
    }
  }

  const resultado = await generarPlan(
    {
      edadAnios: edadEnAnios(consulta.paciente.fechaNacimiento),
      genero: consulta.paciente.genero,
      pesoKg: consulta.peso,
      alturaCm: consulta.altura,
      medidas: {
        cinturaCm: consulta.cintura,
        caderaCm: consulta.cadera,
        brazoCm: consulta.brazo,
        grasaCorporalPct: consulta.grasaCorporal,
      },
      objetivos: consulta.objetivos,
      restricciones: consulta.restricciones,
    },
    { estiloNutriologo: consulta.user.estiloPrompt }
  );

  await prisma.consulta.update({
    where: { id: consulta.id },
    data: {
      planGenerado: resultado.plan,
      planFinal: resultado.plan, // punto de partida para la edición
      promptVersion: resultado.promptVersion,
      modeloIA: resultado.modelo,
      inputTokens: resultado.inputTokens,
      outputTokens: resultado.outputTokens,
      generaciones: { increment: 1 },
      aprobadoAt: null, // regenerar invalida la aprobación previa
    },
  });

  revalidatePath(`/consultas/${consultaId}`);
  return { ok: true as const };
}

export async function guardarPlanFinal(consultaId: string, planJson: string) {
  const { userId } = await requireUser();

  const parsed = PlanAlimenticio.safeParse(JSON.parse(planJson));
  if (!parsed.success) {
    throw new Error("El plan editado no tiene un formato válido: " +
      parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
  }

  const result = await prisma.consulta.updateMany({
    where: { id: consultaId, userId },
    data: { planFinal: parsed.data, aprobadoAt: null },
  });
  if (result.count === 0) throw new Error("Consulta no encontrada");

  revalidatePath(`/consultas/${consultaId}`);
}

export async function aprobarConsulta(
  consultaId: string,
  opts?: { confirmar?: boolean }
) {
  const { userId } = await requireUser();

  const consulta = await prisma.consulta.findFirst({
    where: { id: consultaId, userId },
    include: { paciente: true },
  });
  if (!consulta) throw new Error("Consulta no encontrada");
  if (!consulta.planFinal) throw new Error("No hay plan que aprobar");

  // Validación aritmética en código antes de permitir la aprobación (§3.5)
  const plan = PlanAlimenticio.parse(consulta.planFinal);
  const advertencias = validarPlan(plan, {
    pesoKg: consulta.peso,
    alturaCm: consulta.altura,
    edad: edadEnAnios(consulta.paciente.fechaNacimiento),
    genero: consulta.paciente.genero,
  });

  // Con advertencias, aprobar exige confirmación explícita: el criterio del
  // nutriólogo puede ganarle al validador, pero nunca por accidente.
  if (advertencias.length > 0 && !opts?.confirmar) {
    return { aprobado: false as const, advertencias };
  }

  await prisma.consulta.update({
    where: { id: consulta.id },
    data: { aprobadoAt: new Date() },
  });

  revalidatePath(`/consultas/${consultaId}`);
  return { aprobado: true as const, advertencias };
}
