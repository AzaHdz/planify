"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const EstadoInput = z.object({
  userId: z.string().min(1),
  estado: z.enum(["ACTIVE", "SUSPENDED"]),
});

export async function cambiarEstadoCuenta(formData: FormData) {
  const admin = await requireAdmin();

  const parsed = EstadoInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { userId, estado } = parsed.data;

  if (userId === admin.userId) {
    throw new Error("No puedes suspender tu propia cuenta de administrador.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      estado,
      suspendedAt: estado === "SUSPENDED" ? new Date() : null,
    },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/cuentas/${userId}`);
}

const TierInput = z.object({
  userId: z.string().min(1),
  tier: z.enum(["FREE", "PRO", "ILIMITADO"]),
});

export async function asignarTier(formData: FormData) {
  await requireAdmin();

  const parsed = TierInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { userId, tier } = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: { tier, tierUpdatedAt: new Date() },
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/cuentas/${userId}`);
}

const NotaInput = z.object({
  userId: z.string().min(1),
  nota: z.string().max(2000),
});

export async function guardarNotaAdmin(formData: FormData) {
  await requireAdmin();

  const parsed = NotaInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Datos inválidos");
  const { userId, nota } = parsed.data;

  await prisma.user.update({
    where: { id: userId },
    data: { notasAdmin: nota.trim() || null },
  });

  revalidatePath(`/admin/cuentas/${userId}`);
}
