"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAdmin } from "@/lib/auth";
import { ESTADOS_ABIERTOS, MAX_SOLICITUDES_ABIERTAS } from "@/lib/solicitudes";

const SolicitudInput = z.object({
  titulo: z
    .string()
    .trim()
    .min(4, "El título es demasiado corto")
    .max(120, "El título no puede pasar de 120 caracteres"),
  descripcion: z
    .string()
    .trim()
    .min(10, "Cuéntanos un poco más sobre lo que necesitas")
    .max(2000, "La descripción no puede pasar de 2000 caracteres"),
});

/** El nutriólogo envía una solicitud de funcionalidad. */
export async function crearSolicitud(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = SolicitudInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const abiertas = await prisma.solicitud.count({
    where: { userId, estado: { in: ESTADOS_ABIERTOS } },
  });
  if (abiertas >= MAX_SOLICITUDES_ABIERTAS) {
    return {
      ok: false,
      error: "Tienes demasiadas solicitudes pendientes de revisión. Espera a que revisemos las anteriores.",
    };
  }

  await prisma.solicitud.create({ data: { userId, ...parsed.data } });

  revalidatePath("/sugerencias");
  revalidatePath("/", "layout"); // badge de solicitudes nuevas en el sidebar admin
  return { ok: true as const };
}

const AdminSolicitudInput = z.object({
  solicitudId: z.string().min(1),
  estado: z.enum(["NUEVA", "EN_REVISION", "APROBADA", "RECHAZADA", "IMPLEMENTADA"]),
  respuesta: z.string().max(2000),
});

/** El admin cambia el estado de una solicitud y/o escribe la respuesta visible. */
export async function actualizarSolicitudAdmin(formData: FormData) {
  await requireAdmin();

  const parsed = AdminSolicitudInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { solicitudId, estado, respuesta } = parsed.data;

  const texto = respuesta.trim();
  await prisma.solicitud.update({
    where: { id: solicitudId },
    data: {
      estado,
      respuestaAdmin: texto || null,
      respondidoAt: texto ? new Date() : null,
    },
  });

  revalidatePath("/admin/solicitudes");
  revalidatePath("/admin");
  revalidatePath("/sugerencias");
  revalidatePath("/", "layout");
}
