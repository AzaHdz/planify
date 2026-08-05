"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { aUtc, claveDia, claveMes } from "@/lib/fechas";

const CitaInput = z.object({
  pacienteId: z.string().min(1, "Elige un paciente"),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  hora: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida"),
  duracionMin: z.coerce
    .number()
    .int()
    .min(15, "La cita debe durar al menos 15 minutos")
    .max(480, "La cita no puede durar más de 8 horas"),
  notas: z.string().optional(),
});

/** Refresca todo lo que muestra citas. La agenda y el dashboard siempre; la ficha
 *  del paciente solo si sabemos de cuál se trata. */
function refrescar(pacienteId?: string) {
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  if (pacienteId) revalidatePath(`/pacientes/${pacienteId}`);
}

/** Adónde volver tras tocar una cita: al día que ocupa en la rejilla. */
function urlDelDia(inicioAt: Date): string {
  const dia = claveDia(inicioAt);
  const [anio, mes] = dia.split("-").map(Number);
  return `/agenda?mes=${claveMes(anio, mes)}&dia=${dia}`;
}

/** Crear y reprogramar devuelven el error como valor: los llama un formulario
 *  client con useTransition, y un throw en producción se enmascara como un 500
 *  genérico (misma razón que en app/actions/consultas.ts). */
export async function crearCita(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = CitaInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  // El paciente tiene que ser de este nutriólogo, no basta con que exista
  const paciente = await prisma.paciente.findFirst({
    where: { id: d.pacienteId, userId },
    select: { id: true },
  });
  if (!paciente) return { ok: false as const, error: "Paciente no encontrado" };

  const inicioAt = aUtc(d.fecha, d.hora);
  await prisma.cita.create({
    data: {
      userId,
      pacienteId: d.pacienteId,
      inicioAt,
      duracionMin: d.duracionMin,
      notas: d.notas || null,
    },
  });

  refrescar(d.pacienteId);
  redirect(urlDelDia(inicioAt));
}

const ReprogramarInput = CitaInput.omit({ pacienteId: true }).extend({
  citaId: z.string().min(1),
});

export async function reprogramarCita(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = ReprogramarInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  const inicioAt = aUtc(d.fecha, d.hora);
  // updateMany con userId: un id de otro nutriólogo no actualiza nada
  const r = await prisma.cita.updateMany({
    where: { id: d.citaId, userId },
    data: { inicioAt, duracionMin: d.duracionMin, notas: d.notas || null },
  });
  if (r.count === 0) return { ok: false as const, error: "Cita no encontrada" };

  const cita = await prisma.cita.findFirst({
    where: { id: d.citaId, userId },
    select: { pacienteId: true },
  });
  refrescar(cita?.pacienteId);
  redirect(urlDelDia(inicioAt));
}

const EstadoInput = z.object({
  citaId: z.string().min(1),
  estado: z.enum(["PROGRAMADA", "CONFIRMADA", "CANCELADA", "COMPLETADA"]),
});

/** Cambiar estado y eliminar sí lanzan: los invocan formularios de server
 *  component, donde no hay dónde pintar un error devuelto. */
export async function cambiarEstadoCita(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = EstadoInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");

  const r = await prisma.cita.updateMany({
    where: { id: parsed.data.citaId, userId },
    data: { estado: parsed.data.estado },
  });
  if (r.count === 0) throw new Error("Cita no encontrada");

  const cita = await prisma.cita.findFirst({
    where: { id: parsed.data.citaId, userId },
    select: { pacienteId: true },
  });
  refrescar(cita?.pacienteId);
}

export async function eliminarCita(formData: FormData) {
  const { userId } = await requireUser();
  const citaId = String(formData.get("citaId") ?? "");
  if (!citaId) throw new Error("Datos inválidos");

  const cita = await prisma.cita.findFirst({
    where: { id: citaId, userId },
    select: { pacienteId: true, inicioAt: true },
  });
  // deleteMany con userId evita borrar citas de otro nutriólogo
  await prisma.cita.deleteMany({ where: { id: citaId, userId } });

  refrescar(cita?.pacienteId);
  redirect(cita ? urlDelDia(cita.inicioAt) : "/agenda");
}
