import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    name: "Email y contraseña",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Contraseña", type: "password" },
    },
    async authorize(credentials) {
      const email = String(credentials?.email ?? "").toLowerCase().trim();
      const password = String(credentials?.password ?? "");
      if (!email || !password) return null;

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user?.passwordHash) return null;

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) return null;

      // El primer admin se define por env var — se auto-repara si se recrea la BD
      const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
      if (adminEmail && user.email === adminEmail && user.role !== "ADMIN") {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "ADMIN" },
        });
      }

      if (user.estado === "SUSPENDED") return null;

      return { id: user.id, email: user.email, name: user.name, role: user.role };
    },
  }),
];

// Proveedores opcionales — se activan solo si sus env vars existen
if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(Google);
}
if (process.env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.EMAIL_FROM ?? "Planify <onboarding@resend.dev>",
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers,
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        // El rol en el JWT es solo para UI (mostrar/ocultar link Admin);
        // la autorización real siempre consulta la BD (requireUser/requireAdmin).
        token.role = (user as { role?: Role }).role ?? "NUTRIOLOGO";
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      session.user.role = (token.role as Role) ?? "NUTRIOLOGO";
      return session;
    },
  },
});

/**
 * Devuelve la sesión o lanza. Úsalo al inicio de cada server action / página
 * protegida. Toda query a Prisma debe filtrar por este userId.
 *
 * Consulta la BD en cada invocación: el JWT dura 30 días y no se puede
 * revocar, así que este es el punto donde una suspensión surte efecto.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { estado: true, role: true, tier: true },
  });
  if (!user || user.estado === "SUSPENDED") redirect("/login?error=suspendida");

  return {
    userId: session.user.id,
    email: session.user.email,
    role: user.role,
    tier: user.tier,
  };
}

/** Como requireUser, pero además exige rol ADMIN. */
export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "ADMIN") redirect("/dashboard");
  return u;
}
