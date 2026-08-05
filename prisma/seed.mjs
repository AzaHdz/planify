// Seed de datos demo para Planify.
// Ejecuta:  npm run db:seed        (carga .env / .env.local automáticamente)
// o:        node --env-file=.env --env-file=.env.local prisma/seed.mjs
//
// Crea (o reutiliza) una cuenta de nutrióloga demo y le llena pacientes,
// consultas y planes en varios estados. Es idempotente: borra y recrea los
// datos de ESA cuenta demo en cada corrida (no toca otras cuentas).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_EMAIL = (process.env.SEED_EMAIL ?? "demo@planify.health").toLowerCase();
const DEMO_PASSWORD = process.env.SEED_PASSWORD ?? "planify123";

const dia = 24 * 60 * 60 * 1000;
const hace = (dias) => new Date(Date.now() - dias * dia);

/** Construye un PlanAlimenticio válido y aritméticamente coherente para `kcal`. */
function construirPlan(kcal) {
  const comidasBase = [
    { nombre: "Desayuno", horario: "07:30–08:30", peso: 0.25, ops: [
      { d: "Huevos revueltos con espinaca y tortillas de maíz", a: ["2 huevos", "1 taza de espinaca", "2 tortillas de maíz", "1/2 taza de papaya"] },
      { d: "Avena con plátano y crema de cacahuate", a: ["1/2 taza de avena", "1 plátano", "1 cda de crema de cacahuate", "1 taza de leche"] },
      { d: "Molletes de frijol con pico de gallo", a: ["1 bolillo integral", "1/2 taza de frijoles", "pico de gallo al gusto"] },
    ] },
    { nombre: "Colación matutina", horario: "11:00", peso: 0.1, ops: [
      { d: "Jícama con limón y chile", a: ["1 taza de jícama", "limón y chile al gusto", "puño de garbanzo tostado"] },
      { d: "Manzana con crema de cacahuate", a: ["1 manzana", "1 cda de crema de cacahuate"] },
    ] },
    { nombre: "Comida", horario: "14:30", peso: 0.35, ops: [
      { d: "Pollo a la plancha con arroz integral y nopales", a: ["120 g de pollo", "3/4 taza de arroz integral", "1/2 taza de frijoles", "nopales al gusto"] },
      { d: "Tacos de pescado en tortilla de maíz", a: ["3 tacos", "130 g de pescado blanco", "1/4 de aguacate", "pico de gallo"] },
      { d: "Bowl de lenteja con verduras asadas", a: ["1 taza de lenteja", "verduras asadas al gusto", "1/2 taza de arroz"] },
    ] },
    { nombre: "Colación vespertina", horario: "17:30", peso: 0.1, ops: [
      { d: "Yogur natural con fruta", a: ["3/4 taza de yogur natural", "1/2 taza de fresas"] },
      { d: "Puño de almendras", a: ["20 g de almendras"] },
    ] },
    { nombre: "Cena", horario: "20:30", peso: 0.2, ops: [
      { d: "Tostadas horneadas de tinga de pollo", a: ["2 tostadas horneadas", "80 g de pollo deshebrado", "lechuga y salsa verde"] },
      { d: "Crema de calabaza con pan integral", a: ["1 taza de crema de calabaza", "1 rebanada de pan integral", "1 huevo cocido"] },
    ] },
  ];

  const comidas = comidasBase.map((c) => {
    const objetivo = Math.round(kcal * c.peso);
    return {
      nombre: c.nombre,
      horarioSugerido: c.horario,
      opciones: c.ops.map((o, i) => ({
        descripcion: o.d,
        alimentos: o.a,
        // kcal cercanas al objetivo de la comida (±5%) para que sean intercambiables
        kcalAprox: Math.round(objetivo * (1 + (i - 1) * 0.05)),
      })),
    };
  });

  return {
    kcalObjetivoDiarias: kcal,
    macros: {
      proteinas_g: Math.round((kcal * 0.3) / 4),
      carbohidratos_g: Math.round((kcal * 0.4) / 4),
      grasas_g: Math.round((kcal * 0.3) / 9),
    },
    comidas,
    recomendacionesGenerales: [
      "Toma al menos 2 litros de agua al día.",
      "Realiza 30 minutos de actividad física la mayoría de los días.",
      "Prioriza verduras en comida y cena.",
    ],
    advertencias: [],
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: "Dra. Sofía Ramírez", cedula: "12345678", passwordHash },
    create: { email: DEMO_EMAIL, name: "Dra. Sofía Ramírez", cedula: "12345678", passwordHash },
  });

  // Limpia SOLO los datos de la cuenta demo (cascade borra consultas y citas)
  await prisma.paciente.deleteMany({ where: { userId: user.id } });
  await prisma.solicitud.deleteMany({ where: { userId: user.id } });

  // pacientes: [nombre, genero, edadAnios, email, telefono?, objetivo, restricciones, consultas...]
  // consulta: { d: díasAtrás, peso, altura, cintura?, cadera?, brazo?, grasa?, plan?: kcal, aprobado?: bool }
  //
  // Solo María Fernanda lleva cadera y brazo: es la serie larga con la que se prueban
  // las seis métricas de la gráfica de progreso. Al resto se le dejan en null a
  // propósito, para poder ver el estado vacío por métrica.
  //
  // Los teléfonos van en formatos distintos a propósito (con y sin lada, con +52,
  // con guiones) para ejercitar la normalización a E.164 del recordatorio de
  // WhatsApp. Ana Lucía se queda sin teléfono para ver el botón deshabilitado.
  const pacientes = [
    {
      nombre: "María Fernanda López", genero: "FEMENINO", edad: 34, email: "maria.lopez@gmail.com", telefono: "55 1234 5678",
      objetivo: "Pérdida de grasa gradual", restricciones: "alergia a nuez, intolerancia a lactosa, no come res",
      consultas: [
        { d: 155, peso: 78.1, altura: 165, cintura: 92, cadera: 108, brazo: 32, grasa: 34 },
        { d: 120, peso: 76.0, altura: 165, cintura: 89, cadera: 105.5, brazo: 31, grasa: 33, plan: 1800, aprobado: true },
        { d: 70, peso: 74.5, altura: 165, cintura: 86, cadera: 103, brazo: 30.5, grasa: 32, plan: 1800, aprobado: true },
        { d: 16, peso: 72.4, altura: 165, cintura: 84, cadera: 101, brazo: 29.5, grasa: 31.2, plan: 1840, aprobado: false },
      ],
    },
    {
      nombre: "Carlos Mendoza Ruiz", genero: "MASCULINO", edad: 41, email: "cmendoza@outlook.com", telefono: "+52 55 9876 5432",
      objetivo: "Valoración inicial", restricciones: "Sin restricciones declaradas",
      consultas: [{ d: 1, peso: 92.3, altura: 178, cintura: 104, grasa: 28 }],
    },
    {
      nombre: "Ana Lucía Vargas", genero: "FEMENINO", edad: 29, email: "analu.vargas@gmail.com",
      objetivo: "Control de peso", restricciones: "vegetariana",
      consultas: [
        { d: 60, peso: 63.0, altura: 168, cintura: 76, grasa: 26 },
        { d: 20, peso: 61.5, altura: 168, cintura: 74, grasa: 25, plan: 1600, aprobado: false },
      ],
    },
    {
      nombre: "Jorge Torres Peña", genero: "MASCULINO", edad: 55, email: "jtorres.pena@gmail.com", telefono: "5523456789",
      objetivo: "Manejo de diabetes tipo 2", restricciones: "diabetes tipo 2, hipertensión",
      consultas: [
        { d: 90, peso: 98.0, altura: 176, cintura: 112, grasa: 32 },
        { d: 25, peso: 95.2, altura: 176, cintura: 108, grasa: 31, plan: 1650, aprobado: false },
      ],
    },
    {
      nombre: "Valentina Gómez", genero: "FEMENINO", edad: 26, email: "vale.gomez@hotmail.com", telefono: "(55) 8765-4321",
      objetivo: "Rendimiento deportivo", restricciones: "no come cerdo",
      consultas: [
        { d: 45, peso: 58.0, altura: 163, cintura: 68, grasa: 22 },
        { d: 12, peso: 58.6, altura: 163, cintura: 68, grasa: 21.5, plan: 2100, aprobado: true },
      ],
    },
    {
      nombre: "Ricardo Díaz Osorio", genero: "MASCULINO", edad: 38, email: "ricardo.diaz@gmail.com", telefono: "52 1 55 3344 5566",
      objetivo: "Aumento de masa muscular", restricciones: "Sin restricciones declaradas",
      consultas: [
        { d: 66, peso: 74.0, altura: 175, cintura: 82 },
        { d: 30, peso: 76.5, altura: 175, cintura: 83, plan: 2600, aprobado: true },
      ],
    },
  ];

  let totalConsultas = 0;
  const idPorNombre = new Map();
  for (const p of pacientes) {
    const nac = new Date();
    nac.setFullYear(nac.getFullYear() - p.edad);

    const paciente = await prisma.paciente.create({
      data: {
        userId: user.id,
        nombre: p.nombre,
        fechaNacimiento: nac,
        genero: p.genero,
        email: p.email,
        telefono: p.telefono ?? null,
        consentimientoAt: hace(200),
        createdAt: hace(200),
      },
    });
    idPorNombre.set(p.nombre, paciente.id);

    for (const c of p.consultas) {
      const plan = c.plan ? construirPlan(c.plan) : null;
      await prisma.consulta.create({
        data: {
          userId: user.id,
          pacienteId: paciente.id,
          peso: c.peso,
          altura: c.altura,
          cintura: c.cintura ?? null,
          cadera: c.cadera ?? null,
          brazo: c.brazo ?? null,
          grasaCorporal: c.grasa ?? null,
          objetivos: p.objetivo,
          restricciones: p.restricciones,
          planGenerado: plan ?? undefined,
          planFinal: plan ?? undefined,
          promptVersion: plan ? "plan-v1" : null,
          modeloIA: plan ? "seed-demo" : null,
          inputTokens: plan ? 1200 : null,
          outputTokens: plan ? 2400 : null,
          aprobadoAt: c.aprobado ? hace(c.d) : null,
          createdAt: hace(c.d),
        },
      });
      totalConsultas++;
    }
  }

  // ── Citas ────────────────────────────────────────────────────────────────
  // Este script es .mjs y no puede importar lib/fechas.ts, así que replica su
  // conversión a UTC. Si aquella cambia, cambiar también aquí.
  const ZONA = "America/Mexico_City";

  function desfaseMin(instante) {
    const p = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", {
        timeZone: ZONA, hour12: false,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
        .formatToParts(instante)
        .map((x) => [x.type, x.value])
    );
    const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return (comoUtc - instante.getTime()) / 60000;
  }

  /** Día relativo a hoy (en México) + hora local → el instante UTC que se guarda. */
  function citaEn(diasDesdeHoy, hhmm) {
    const hoy = new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date());
    const [a, m, d] = hoy.split("-").map(Number);
    const [h, min] = hhmm.split(":").map(Number);
    const tentativo = Date.UTC(a, m - 1, d + diasDesdeHoy, h, min);
    return new Date(tentativo - desfaseMin(new Date(tentativo)) * 60000);
  }

  // d = días desde hoy (negativo = pasado). La de Valentina a las 21:00 es la que
  // delata un fallo de zona horaria: en un servidor UTC caería en el día siguiente.
  const citas = [
    { paciente: "María Fernanda López", d: 0, hora: "10:00", dur: 60, estado: "CONFIRMADA", notas: "Revisión de plan y ajuste de macros" },
    { paciente: "Jorge Torres Peña", d: 0, hora: "13:30", dur: 45, estado: "PROGRAMADA" },
    { paciente: "Ana Lucía Vargas", d: 1, hora: "09:00", dur: 60, estado: "PROGRAMADA", notas: "Primera revisión del plan vegetariano" },
    { paciente: "Valentina Gómez", d: 2, hora: "21:00", dur: 45, estado: "PROGRAMADA", notas: "Cita nocturna: entrena por la tarde" },
    { paciente: "Ricardo Díaz Osorio", d: 4, hora: "11:00", dur: 60, estado: "PROGRAMADA" },
    { paciente: "Carlos Mendoza Ruiz", d: 9, hora: "16:00", dur: 90, estado: "PROGRAMADA", notas: "Valoración completa, viene acompañado" },
    { paciente: "María Fernanda López", d: -7, hora: "10:00", dur: 60, estado: "COMPLETADA" },
    { paciente: "Ricardo Díaz Osorio", d: -3, hora: "12:00", dur: 60, estado: "CANCELADA", notas: "Avisó que salía de viaje" },
  ];

  for (const c of citas) {
    await prisma.cita.create({
      data: {
        userId: user.id,
        pacienteId: idPorNombre.get(c.paciente),
        inicioAt: citaEn(c.d, c.hora),
        duracionMin: c.dur,
        estado: c.estado,
        notas: c.notas ?? null,
      },
    });
  }

  // Solicitudes de funcionalidad en distintos estados
  const solicitudes = [
    {
      titulo: "Recordatorios de consulta por WhatsApp",
      descripcion:
        "Me encantaría que el sistema mandara un recordatorio automático por WhatsApp a mis pacientes un día antes de su consulta. Muchos se me olvidan de venir.",
      estado: "NUEVA",
      d: 2,
    },
    {
      titulo: "Exportar expediente completo a PDF",
      descripcion:
        "Además del plan alimenticio, quisiera exportar todo el historial del paciente (mediciones y evolución) en un solo PDF para compartirlo con otros especialistas.",
      estado: "EN_REVISION",
      d: 9,
    },
    {
      titulo: "Gráfica de evolución de peso",
      descripcion:
        "Ver una gráfica con la evolución del peso y la grasa corporal del paciente a lo largo de sus consultas, para mostrársela en pantalla durante la cita.",
      estado: "APROBADA",
      respuesta:
        "¡Gran idea! La aprobamos y la tenemos en la lista para una próxima versión. Te avisamos cuando esté disponible.",
      d: 20,
    },
  ];

  for (const s of solicitudes) {
    await prisma.solicitud.create({
      data: {
        userId: user.id,
        titulo: s.titulo,
        descripcion: s.descripcion,
        estado: s.estado,
        respuestaAdmin: s.respuesta ?? null,
        respondidoAt: s.respuesta ? hace(s.d - 1) : null,
        createdAt: hace(s.d),
      },
    });
  }

  console.log("\n✅ Seed completado");
  console.log(`   Usuario demo: ${DEMO_EMAIL}  ·  contraseña: ${DEMO_PASSWORD}`);
  console.log(`   ${pacientes.length} pacientes · ${totalConsultas} consultas · ${citas.length} citas · ${solicitudes.length} solicitudes`);
  console.log("   Inicia sesión con esa cuenta para ver los datos.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
