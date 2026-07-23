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

export async function eliminarPaciente(pacienteId: string) {
  const { userId } = await requireUser();
  // deleteMany con userId evita borrar pacientes de otro nutriólogo
  await prisma.paciente.deleteMany({ where: { id: pacienteId, userId } });
  revalidatePath("/pacientes");
  redirect("/pacientes");
}
