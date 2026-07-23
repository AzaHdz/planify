"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { crearTokenReset, consumirTokenReset, urlReset } from "@/lib/resetTokens";
import { enviarCorreoReset } from "@/lib/email";

const SolicitudInput = z.object({
  email: z.string().email("Email inválido"),
});

/**
 * Solicita el restablecimiento. La respuesta es SIEMPRE la misma exista o no
 * la cuenta (sin enumeración de emails registrados).
 */
export async function solicitarReset(formData: FormData) {
  const parsed = SolicitudInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/recuperar?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const email = parsed.data.email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email },
    select: { estado: true, passwordHash: true },
  });

  if (user && user.estado !== "SUSPENDED" && user.passwordHash) {
    const token = await crearTokenReset(email);
    await enviarCorreoReset(email, await urlReset(email, token));
  }

  redirect("/recuperar?ok=1");
}

const RestablecerInput = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  confirmar: z.string(),
});

export async function restablecerPassword(formData: FormData) {
  const parsed = RestablecerInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/recuperar?error=${encodeURIComponent("Solicitud inválida, pide un link nuevo")}`);
  }
  const { token, password, confirmar } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  if (password !== confirmar) {
    redirect(
      `/restablecer?email=${encodeURIComponent(email)}&token=${token}&error=${encodeURIComponent("Las contraseñas no coinciden")}`
    );
  }

  const valido = await consumirTokenReset(email, token);
  if (!valido) {
    redirect(
      `/recuperar?error=${encodeURIComponent("El link es inválido o expiró. Solicita uno nuevo.")}`
    );
  }

  await prisma.user.update({
    where: { email },
    data: { passwordHash: await bcrypt.hash(password, 12) },
  });

  redirect("/login?ok=password-reset");
}
