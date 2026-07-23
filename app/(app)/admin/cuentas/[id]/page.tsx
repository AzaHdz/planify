import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { LIMITES_TIER, inicioDeMes } from "@/lib/limits";
import { fechaCorta, fechaLarga } from "@/lib/format";
import { cambiarEstadoCuenta, asignarTier, guardarNotaAdmin } from "@/app/actions/admin";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { ResetLinkAdmin } from "@/components/ResetLinkAdmin";

export default async function CuentaAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      cedula: true,
      createdAt: true,
      estado: true,
      tier: true,
      role: true,
      tierUpdatedAt: true,
      suspendedAt: true,
      notasAdmin: true,
      _count: { select: { pacientes: true, consultas: true } },
    },
  });
  if (!user) notFound();

  const [usoTotal, consultasMes, ultimasConsultas] = await Promise.all([
    prisma.consulta.aggregate({
      where: { userId: id },
      _sum: { inputTokens: true, outputTokens: true },
      _max: { createdAt: true },
    }),
    prisma.consulta.count({ where: { userId: id, createdAt: { gte: inicioDeMes() } } }),
    prisma.consulta.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        modeloIA: true,
        inputTokens: true,
        outputTokens: true,
        aprobadoAt: true,
      },
    }),
  ]);

  const limite = LIMITES_TIER[user.tier].consultasMes;
  const esPropia = user.id === admin.userId;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div>
        <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
          ← Administración
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Avatar nombre={user.name ?? user.email} size="md" />
          <div className="min-w-0">
            <h1 className="font-display text-[24px] font-bold tracking-tight text-text">
              {user.name ?? "Sin nombre"}
            </h1>
            <p className="text-sm text-text-3">
              {user.email}
              {user.cedula ? ` · Cédula ${user.cedula}` : ""} · Alta el{" "}
              {fechaLarga(user.createdAt)}
            </p>
          </div>
          <div className="flex gap-2">
            {user.role === "ADMIN" && <Badge tone="info">Admin</Badge>}
            {user.estado === "ACTIVE" ? (
              <Badge tone="success">Activa</Badge>
            ) : user.estado === "SUSPENDED" ? (
              <Badge tone="danger">Suspendida</Badge>
            ) : (
              <Badge tone="warning">Pendiente</Badge>
            )}
            <Badge tone={user.tier === "FREE" ? "neutral" : "primary"}>
              {LIMITES_TIER[user.tier].nombre}
            </Badge>
          </div>
        </div>
        {user.suspendedAt && (
          <p className="mt-2 text-[12.5px] text-danger">
            Suspendida el {fechaLarga(user.suspendedAt)}
          </p>
        )}
      </div>

      {/* Stats de la cuenta */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Pacientes" value={`${user._count.pacientes}`} nota="Registrados" />
        <StatCard label="Consultas totales" value={`${user._count.consultas}`} nota="Desde el alta" />
        <StatCard
          label="Consultas este mes"
          value={limite === null ? `${consultasMes}` : `${consultasMes} / ${limite}`}
          nota={limite === null ? "Sin límite" : `Límite del plan ${LIMITES_TIER[user.tier].nombre}`}
          warning={limite !== null && consultasMes >= limite}
        />
        <StatCard
          label="Tokens IA"
          value={(
            (usoTotal._sum.inputTokens ?? 0) + (usoTotal._sum.outputTokens ?? 0)
          ).toLocaleString("es-MX")}
          nota={
            usoTotal._max.createdAt
              ? `Última actividad ${fechaCorta(usoTotal._max.createdAt)}`
              : "Sin actividad"
          }
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.55fr_1fr]">
        {/* Últimas consultas (solo metadatos — sin contenido clínico) */}
        <Card className="overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <span className="font-display text-[15px] font-bold text-text">Últimas consultas</span>
          </div>
          {ultimasConsultas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-3">Sin consultas todavía.</p>
          ) : (
            ultimasConsultas.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-text">
                    {fechaCorta(c.createdAt)}
                  </div>
                  <div className="font-mono text-[11.5px] tabular-nums text-text-3">
                    {c.modeloIA ?? "Sin plan generado"}
                    {c.inputTokens != null &&
                      ` · ${((c.inputTokens ?? 0) + (c.outputTokens ?? 0)).toLocaleString("es-MX")} tokens`}
                  </div>
                </div>
                {c.aprobadoAt ? (
                  <Badge tone="success">Aprobada</Badge>
                ) : (
                  <Badge tone="neutral">Sin aprobar</Badge>
                )}
              </div>
            ))
          )}
        </Card>

        {/* Controles de admin */}
        <div className="flex flex-col gap-4">
          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Plan</div>
            <form action={asignarTier} className="flex items-center gap-2.5">
              <input type="hidden" name="userId" value={user.id} />
              <select
                name="tier"
                defaultValue={user.tier}
                className="h-9 flex-1 rounded-ctl border border-border-strong bg-surface px-2.5 text-sm text-text"
              >
                {Object.entries(LIMITES_TIER).map(([tier, info]) => (
                  <option key={tier} value={tier}>
                    {info.nombre}
                    {info.consultasMes !== null
                      ? ` — ${info.consultasMes} consultas/mes`
                      : " — sin límite"}
                    {info.precioMXN > 0 ? ` ($${info.precioMXN} MXN)` : ""}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="secondary">
                Guardar
              </Button>
            </form>
            {user.tierUpdatedAt && (
              <p className="mt-2 text-[11.5px] text-text-3">
                Último cambio: {fechaCorta(user.tierUpdatedAt)}
              </p>
            )}
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Nota interna</div>
            <form action={guardarNotaAdmin} className="flex flex-col gap-2.5">
              <input type="hidden" name="userId" value={user.id} />
              <textarea
                name="nota"
                defaultValue={user.notasAdmin ?? ""}
                rows={3}
                maxLength={2000}
                placeholder="Solo visible para ti (acuerdos, contexto, seguimiento)…"
                className="w-full rounded-ctl border border-border-strong bg-surface px-2.5 py-2 text-sm text-text"
              />
              <Button size="sm" variant="secondary" className="self-end">
                Guardar nota
              </Button>
            </form>
          </Card>

          <Card className="p-4.5">
            <div className="mb-2.5 text-sm font-bold text-text">Contraseña</div>
            <p className="mb-3 text-[12.5px] text-text-3">
              Si olvidó su contraseña, genera un link de restablecimiento y compárteselo.
            </p>
            <ResetLinkAdmin userId={user.id} />
          </Card>

          {!esPropia && (
            <Card className="p-4.5">
              <div className="mb-2.5 text-sm font-bold text-text">
                {user.estado === "SUSPENDED" ? "Reactivar cuenta" : "Suspender cuenta"}
              </div>
              <p className="mb-3 text-[12.5px] text-text-3">
                {user.estado === "SUSPENDED"
                  ? "La cuenta podrá volver a iniciar sesión y usar la app."
                  : "La cuenta no podrá iniciar sesión ni usar la app hasta que la reactives. Sus datos no se borran."}
              </p>
              <form action={cambiarEstadoCuenta}>
                <input type="hidden" name="userId" value={user.id} />
                <input
                  type="hidden"
                  name="estado"
                  value={user.estado === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"}
                />
                <Button
                  size="sm"
                  variant={user.estado === "SUSPENDED" ? "secondary" : "destructive"}
                >
                  {user.estado === "SUSPENDED" ? "Reactivar" : "Suspender"}
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  nota,
  warning,
}: {
  label: string;
  value: string;
  nota: string;
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
      <div className="mt-0.5 text-[11.5px] text-text-3">{nota}</div>
    </Card>
  );
}
