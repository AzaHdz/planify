import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { auth } from "@/lib/auth";
import { fechaLarga } from "@/lib/format";
import { kcalDePlan } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";
import { LIMITES_TIER } from "@/lib/limits";

export default async function DashboardPage() {
  const { userId, tier } = await requireUser();
  const session = await auth();
  const nombre = session?.user?.name ?? "Doctor(a)";
  const limiteMes = LIMITES_TIER[tier].consultasMes;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const [
    totalPacientes,
    pacientesNuevosMes,
    consultasMes,
    totalConsultas,
    pendientes,
    ultimasConsultas,
  ] = await Promise.all([
    prisma.paciente.count({ where: { userId } }),
    prisma.paciente.count({ where: { userId, createdAt: { gte: inicioMes } } }),
    prisma.consulta.count({ where: { userId, createdAt: { gte: inicioMes } } }),
    prisma.consulta.count({ where: { userId } }),
    prisma.consulta.findMany({
      where: { userId, planFinal: { not: Prisma.DbNull }, aprobadoAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { paciente: { select: { nombre: true } } },
    }),
    prisma.consulta.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { paciente: { select: { nombre: true } } },
    }),
  ]);

  const hora = new Date().getHours();
  const saludo = hora < 12 ? "Buenos días" : hora < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
            {saludo}, {nombre.split(" ")[0]}
          </h1>
          <p className="mt-0.5 text-sm text-text-3">
            {fechaLarga(new Date())} · {consultasMes} consulta{consultasMes === 1 ? "" : "s"} este mes
          </p>
        </div>
        <div className="flex gap-2.5">
          <Link href="/pacientes/nuevo" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            + Nuevo paciente
          </Link>
          <Link href="/pacientes" className={buttonVariants({ size: "sm" })}>
            + Nueva consulta
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pacientes activos" value={totalPacientes} nota={`+${pacientesNuevosMes} este mes`} notaTone="success" />
        <StatCard
          label="Consultas este mes"
          value={consultasMes}
          nota={
            limiteMes === null
              ? "Sin límite en tu plan"
              : `de ${limiteMes} en tu plan ${LIMITES_TIER[tier].nombre}`
          }
          warning={limiteMes !== null && limiteMes - consultasMes <= 1}
        />
        <StatCard
          label="Planes por aprobar"
          value={pendientes.length}
          nota={pendientes.length ? "Revísalos abajo" : "Todo al día"}
          warning={pendientes.length > 0}
        />
        <StatCard label="Consultas totales" value={totalConsultas} nota="Desde el inicio" />
      </div>

      {/* Cuerpo */}
      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Consultas recientes */}
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="font-display text-[15px] font-bold text-text">Consultas recientes</span>
            <Link href="/pacientes" className="text-xs font-semibold text-primary hover:underline">
              Ver pacientes
            </Link>
          </div>
          {ultimasConsultas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-3">
              Aún no hay consultas. Da de alta un paciente y crea la primera.
            </p>
          ) : (
            ultimasConsultas.map((c) => (
              <Link
                key={c.id}
                href={`/consultas/${c.id}`}
                className="flex items-center gap-3.5 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
              >
                <Avatar nombre={c.paciente.nombre} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-semibold text-text">{c.paciente.nombre}</div>
                  <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                    {c.peso} kg · {c.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </div>
                </div>
                {c.aprobadoAt ? (
                  <Badge tone="success">Aprobada</Badge>
                ) : c.planFinal ? (
                  <Badge tone="warning">Borrador</Badge>
                ) : (
                  <Badge tone="neutral">Sin plan</Badge>
                )}
              </Link>
            ))
          )}
        </Card>

        {/* Columna derecha */}
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-warning-brd bg-warning-soft px-4.5 py-3.5">
              <span className="text-sm font-bold text-warning">Planes por aprobar</span>
              <span className="font-mono text-xs font-semibold text-warning">{pendientes.length}</span>
            </div>
            {pendientes.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-text-3">Nada pendiente. 🎉</p>
            ) : (
              pendientes.map((c) => {
                const kcal = kcalDePlan(c.planFinal);
                return (
                  <div key={c.id} className="flex items-center gap-2.5 border-b border-border px-4 py-3 last:border-0">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-text">{c.paciente.nombre}</div>
                      <div className="text-[11.5px] text-text-3">
                        {c.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        {kcal ? ` · ${kcal.toLocaleString("es-MX")} kcal` : ""}
                      </div>
                    </div>
                    <Link
                      href={`/consultas/${c.id}`}
                      className="rounded-pill border border-primary-soft-brd px-3 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary-soft"
                    >
                      Revisar
                    </Link>
                  </div>
                );
              })
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Accesos rápidos</div>
            <div className="flex flex-col gap-2">
              <AccesoRapido href="/pacientes/nuevo" dot="primary" label="Registrar nuevo paciente" />
              <AccesoRapido href="/pacientes" dot="accent" label="Iniciar consulta con paciente" />
              <AccesoRapido href="/pacientes" dot="info" label="Ver expedientes" />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  nota,
  notaTone,
  warning,
}: {
  label: string;
  value: number;
  nota: string;
  notaTone?: "success";
  warning?: boolean;
}) {
  return (
    <Card className={`p-4.5 ${warning ? "border-warning-brd" : ""}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${warning ? "text-warning" : "text-text-3"}`}>
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-[26px] font-semibold tabular-nums ${warning ? "text-warning" : "text-text"}`}>
        {value}
      </div>
      <div className={`mt-0.5 text-[11.5px] ${notaTone === "success" ? "text-success" : "text-text-3"}`}>
        {nota}
      </div>
    </Card>
  );
}

const dotColors = {
  primary: "bg-primary",
  accent: "bg-accent",
  info: "bg-info",
} as const;

function AccesoRapido({
  href,
  dot,
  label,
}: {
  href: string;
  dot: keyof typeof dotColors;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-ctl border border-border px-3 py-2.5 text-[13px] font-medium text-text transition-colors hover:bg-surface-3"
    >
      <span className={`size-[7px] rounded-full ${dotColors[dot]}`} />
      {label}
    </Link>
  );
}
