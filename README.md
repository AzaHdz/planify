# Planify — MVP (Fase 1)

SaaS para nutriólogos: expedientes, consultas y planes alimenticios generados con IA
(revisados y aprobados por el profesional antes de exportarse).

Guía completa del proyecto: `../MANUAL_DESARROLLO.md`.

## Stack

Next.js 16 (App Router) · React 19 · Tailwind 4 · Prisma 6 + PostgreSQL · Auth.js v5
(email+contraseña; Google OAuth y magic link activables por env) · IA conmutable:
OpenAI (`gpt-5-mini`, por defecto) o Claude (`claude-sonnet-5`), ambas con salidas
estructuradas validadas por el mismo schema Zod (`lib/ai/planSchema.ts`).

## Setup local

1. **Base de datos** — cualquiera de las dos:
   - Postgres de Homebrew ya corriendo (la config actual de `.env.local` apunta ahí), o
   - `docker compose up -d` y cambia `DATABASE_URL` a `postgresql://planify:planify@localhost:5432/planify`.

2. **Variables de entorno** — copia `.env.example` a `.env.local` (ya existe una con la DB local
   y `AUTH_SECRET` generado) y completa:
   - `OPENAI_API_KEY` — necesario para generar planes (proveedor por defecto, `AI_PROVIDER=openai`).
   - Para cambiar a Claude: pon `ANTHROPIC_API_KEY` y `AI_PROVIDER=anthropic`.
   - Login: email + contraseña funciona sin configuración extra (regístrate en `/registro`).
     Google OAuth (`AUTH_GOOGLE_ID/SECRET`) y magic link (`AUTH_RESEND_KEY`) son opcionales
     y se activan solos al definir sus variables.

3. **Migraciones y arranque:**

   ```bash
   npx prisma migrate dev
   npm run dev
   ```

## Flujo del MVP

registro (`/registro`, abierto por ahora — cerrarlo o pasar a invitaciones en Fase 4) → login → /pacientes (alta con consentimiento de datos) → nueva consulta (antropometría +
objetivos + restricciones) → "Generar plan con IA" → revisar/editar → "Aprobar plan"
(corre validación aritmética Mifflin-St Jeor en `lib/calculos.ts`) → Exportar PDF
(`/consultas/[id]/imprimir`, vista de impresión del navegador).

## Reglas del código

- **Multi-tenant:** toda query de Prisma filtra por `userId` (ver `requireUser()` en `lib/auth.ts`).
- **Minimización de datos:** a la IA solo viajan datos clínicos, nunca la identidad del paciente
  (`lib/ai/generarPlan.ts`).
- **Prompts versionados:** `lib/ai/prompts/plan-v1.ts`; cada consulta guarda `promptVersion`,
  `modeloIA` y tokens.
- **Proveedor de IA conmutable:** `lib/ai/generarPlan.ts` despacha a `lib/ai/providers/{openai,anthropic}.ts`
  según `AI_PROVIDER`; ambos usan el mismo prompt y el mismo schema.
- El PDF solo se exporta si `aprobadoAt != null`.
