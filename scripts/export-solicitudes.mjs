// Exporta solicitudes de funcionalidad a markdown para analizarlas con Claude Code.
// Ejecuta:  npm run solicitudes:export > pendientes.md
// o:        node --env-file=.env --env-file=.env.local scripts/export-solicitudes.mjs
//
// Por defecto exporta solo las pendientes de análisis (NUEVA / EN_REVISION sin
// analizadoAt). Con --todas exporta todas las solicitudes sin filtro.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const todas = process.argv.includes("--todas");

const fecha = (d) => d.toISOString().slice(0, 10);

async function main() {
  const solicitudes = await prisma.solicitud.findMany({
    where: todas
      ? {}
      : { estado: { in: ["NUEVA", "EN_REVISION"] }, analizadoAt: null },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { name: true, email: true, tier: true } } },
  });

  const lineas = [
    `# Solicitudes de funcionalidad — Planify (${fecha(new Date())})`,
    "",
    "Para cada solicitud: analiza su viabilidad contra el estado actual del codebase,",
    "estima el esfuerzo y da un veredicto: VIABLE / NO_VIABLE / REQUIERE_DISENO.",
    "",
  ];

  solicitudes.forEach((s, i) => {
    lineas.push(
      `## ${i + 1}. ${s.titulo}`,
      "",
      `- id: ${s.id}  |  estado: ${s.estado}  |  fecha: ${fecha(s.createdAt)}`,
      `- cuenta: ${s.user.name ?? "Sin nombre"} <${s.user.email}> (tier ${s.user.tier})`,
      "",
      s.descripcion,
      "",
    );
  });

  if (solicitudes.length === 0) {
    lineas.push("_No hay solicitudes pendientes de análisis._", "");
  }

  process.stdout.write(lineas.join("\n"));
}

main()
  .catch((e) => {
    console.error("❌ Error exportando solicitudes:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
