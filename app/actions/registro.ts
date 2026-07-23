"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/lib/auth";

const RegistroInput = z.object({
  nombre: z.string().min(2, "Nombre demasiado corto"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/**
 * Registro abierto para el MVP. Antes de lanzar a más usuarios (Fase 4),
 * cambiar a invitaciones o verificación de email.
 */
export async function registrarUsuario(formData: FormData) {
  const parsed = RegistroInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/registro?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }
  const { nombre, email, password } = parsed.data;
  const emailNorm = email.toLowerCase().trim();

  const existente = await prisma.user.findUnique({ where: { email: emailNorm } });
  if (existente) {
    redirect(`/registro?error=${encodeURIComponent("Ya existe una cuenta con ese email")}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { name: nombre, email: emailNorm, passwordHash },
  });

  await signIn("credentials", {
    email: emailNorm,
    password,
    redirectTo: "/dashboard",
  });
}
