"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const PerfilInput = z.object({
  nombre: z.string().min(2, "El nombre es demasiado corto"),
  cedula: z.string().max(30).optional().or(z.literal("")),
  logoUrl: z.string().url("La URL del logo no es válida").optional().or(z.literal("")),
  estiloPrompt: z.string().max(1500, "Máximo 1500 caracteres").optional().or(z.literal("")),
});

/** Actualiza el perfil del nutriólogo (datos que encabezan el PDF). */
export async function actualizarPerfil(formData: FormData) {
  const { userId } = await requireUser();

  const parsed = PerfilInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const d = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: d.nombre,
      cedula: d.cedula || null,
      logoUrl: d.logoUrl || null,
      estiloPrompt: d.estiloPrompt?.trim() || null,
    },
  });

  // Refresca el nombre del sidebar (layout) y los datos del PDF
  revalidatePath("/", "layout");
  return { ok: true as const };
}
