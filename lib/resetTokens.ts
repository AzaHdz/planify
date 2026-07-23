import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

// Tokens de restablecimiento de contraseña sobre el modelo VerificationToken
// de Auth.js. El prefijo "reset:" evita colisión con los magic-links de
// Resend (que usan el email a secas como identifier).

const VIGENCIA_MS = 60 * 60 * 1000; // 1 hora

const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const identifier = (email: string) => `reset:${email}`;

/** Genera un token de un solo uso (invalida los previos) y devuelve el token plano. */
export async function crearTokenReset(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");

  await prisma.verificationToken.deleteMany({
    where: { identifier: identifier(email) },
  });
  await prisma.verificationToken.create({
    data: {
      identifier: identifier(email),
      token: hash(token),
      expires: new Date(Date.now() + VIGENCIA_MS),
    },
  });

  return token;
}

/** Valida y consume el token (un solo uso). Devuelve false si no existe o expiró. */
export async function consumirTokenReset(email: string, token: string): Promise<boolean> {
  const registro = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: { identifier: identifier(email), token: hash(token) },
    },
  });
  if (!registro) return false;

  // Consumido o expirado: en ambos casos deja de existir
  await prisma.verificationToken.delete({
    where: {
      identifier_token: { identifier: identifier(email), token: hash(token) },
    },
  });

  return registro.expires > new Date();
}

/** URL absoluta de restablecimiento, con el origin de la petición actual. */
export async function urlReset(email: string, token: string): Promise<string> {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host") ?? "localhost:3000";
  return `${proto}://${host}/restablecer?email=${encodeURIComponent(email)}&token=${token}`;
}
