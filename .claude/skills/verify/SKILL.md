---
name: verify
description: Cómo levantar y verificar Planify end-to-end por HTTP (login, server actions, panel admin)
---

# Verificar Planify end-to-end

## Levantar

```bash
cd planify
npm run build
AUTH_TRUST_HOST=true npx next start -p 3100   # AUTH_TRUST_HOST es obligatorio: sin él Auth.js da UntrustedHost/500 en prod local
```

`prisma migrate dev` es interactivo y falla en shells no interactivas; usar `prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/<ts>_<nombre>/migration.sql` y luego `prisma migrate deploy`.

## Cuentas

- Seed: `demo@planify.health` / `planify123` (`npm run db:seed`).
- El email en `ADMIN_EMAIL` se auto-promueve a ADMIN al hacer login (se puede sobreescribir por env var al arrancar el server para pruebas).

## Login por curl (Auth.js Credentials)

```bash
CSRF=$(curl -s -c s.jar localhost:3100/api/auth/csrf | jq -r .csrfToken)
curl -s -b s.jar -c s.jar -X POST localhost:3100/api/auth/callback/credentials \
  -d "csrfToken=$CSRF" -d "email=..." -d "password=..."   # 302 = ok
curl -s -b s.jar localhost:3100/api/auth/session           # confirma sesión y rol
```

## Server actions por curl (sin JS)

1. GET de la página que contiene el `<form>`; los IDs están embebidos como `$ACTION_ID_<hash>` (mapear cada hash a su form por los campos hidden vecinos). OJO: solo los forms server-rendered (`<form action={serverAction}>` en un server component) exponen `$ACTION_ID`; el hash que aparece en TODAS las páginas es el signOut del layout.
2. POST multipart a la URL de la página: `curl -b s.jar -X POST <url-pagina> -F '$ACTION_ID_<hash>=' -F "campo=valor" ...`
3. Éxito con redirect = 303; error lanzado en prod = 500 con mensaje enmascarado (verificar efecto en BD con psql, no el mensaje).

## Server actions de forms CLIENTE (patrón AjustesForm: `action={onSubmit}` + useTransition)

Estos no exponen `$ACTION_ID` en el HTML. Invocarlos con el header `Next-Action`:

1. ID real: en `.next/server/server-reference-manifest.json` (`node` → id → workers indica qué páginas usan el módulo de la action).
2. POST multipart a la página con el header y codificación flight: campos de datos con prefijo `_1_`, y el campo raíz `0` AL FINAL (el decode es streaming — si `0` va primero, la FormData llega vacía y zod da "expected string, received undefined"):
   ```bash
   curl -b s.jar -X POST localhost:3100/<pagina> -H 'Next-Action: <id>' \
     -F '_1_campo1=valor' -F '_1_campo2=valor' -F '0=["$K1"]'
   ```
3. Respuesta 200 con flight stream; el valor de retorno (`{ok:...}`) viene en la línea `1:{...}`.

## Gotchas

- `/consultas/nueva` sin `?paciente=<id>` redirige a `/pacientes`.
- Los flujos que valen la pena: guard de `/admin` (admin 200 / no-admin 307 a dashboard), suspensión (sesión viva sale a `/login?error=suspendida` en la siguiente navegación; re-login da CredentialsSignin), cuota (crearConsulta bloquea al llegar al límite del tier del mes calendario).
