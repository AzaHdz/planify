"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const PacienteInput = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  fechaNacimiento: z.coerce.date(),
  genero: z.enum(["FEMENINO", "MASCULINO", "OTRO"]),
  email: z.string().email().optional().or(z.literal("")),
  telefono: z.string().optional(),
  notas: z.string().optional(),
  consentimiento: z.coerce.boolean(),
});

export async function crearPaciente(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = PacienteInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const d = parsed.data;
  if (!d.consentimiento) {
    throw new Error("Se requiere el consentimiento del paciente para el tratamiento de sus datos de salud.");
  }

  const paciente = await prisma.paciente.create({
    data: {
      userId,
      nombre: d.nombre,
      fechaNacimiento: d.fechaNacimiento,
      genero: d.genero,
      email: d.email || null,
      telefono: d.telefono || null,
      notas: d.notas || null,
      consentimientoAt: new Date(),
    },
  });

  revalidatePath("/pacientes");
  redirect(`/pacientes/${paciente.id}`);
}

/** Mismos campos que el alta, sin el consentimiento: se otorgó una vez y no se
 *  reedita desde aquí. */
const ActualizarInput = PacienteInput.omit({ consentimiento: true }).extend({
  pacienteId: z.string().min(1),
});

export async function actualizarPaciente(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = ActualizarInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const d = parsed.data;

  // updateMany con userId: un id de otro nutriólogo no actualiza nada
  const r = await prisma.paciente.updateMany({
    where: { id: d.pacienteId, userId },
    data: {
      nombre: d.nombre,
      fechaNacimiento: d.fechaNacimiento,
      genero: d.genero,
      email: d.email || null,
      telefono: d.telefono || null,
      notas: d.notas || null,
    },
  });
  if (r.count === 0) throw new Error("Paciente no encontrado");

  revalidatePath("/pacientes");
  revalidatePath(`/pacientes/${d.pacienteId}`);
  // El teléfono alimenta el recordatorio de la agenda
  revalidatePath("/agenda");
  redirect(`/pacientes/${d.pacienteId}`);
}

export async function eliminarPaciente(pacienteId: string) {
  const { userId } = await requireUser();
  // deleteMany con userId evita borrar pacientes de otro nutriólogo
  await prisma.paciente.deleteMany({ where: { id: pacienteId, userId } });
  revalidatePath("/pacientes");
  redirect("/pacientes");
}
