import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LIMITES_TIER, inicioDeMes } from "@/lib/limits";
import { fechaCorta } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export default async function AdminPage() {
  const inicioMes = inicioDeMes();

  const [usuarios, uso, usoMes, altasMes, solicitudesNuevas] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        estado: true,
        tier: true,
        role: true,
        _count: { select: { pacientes: true, consultas: true } },
      },
    }),
    prisma.consulta.groupBy({
      by: ["userId"],
      _sum: { inputTokens: true, outputTokens: true },
      _max: { createdAt: true },
      _count: true,
    }),
    prisma.consulta.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: inicioMes } },
      _sum: { inputTokens: true, outputTokens: true },
      _count: true,
    }),
    prisma.user.count({ where: { createdAt: { gte: inicioMes } } }),
    prisma.solicitud.count({ where: { estado: "NUEVA" } }),
  ]);

  const usoPorUser = new Map(uso.map((u) => [u.userId, u]));
  const usoMesPorUser = new Map(usoMes.map((u) => [u.userId, u]));

  const activos = usuarios.filter((u) => u.estado === "ACTIVE").length;
  const tokensMes = usoMes.reduce(
    (acc, u) => acc + (u._sum.inputTokens ?? 0) + (u._sum.outputTokens ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Administración
        </h1>
        <p className="mt-0.5 text-sm text-text-3">
          Cuentas de nutriólogos registradas en Planify
        </p>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Nutriólogos" value={usuarios.length} nota={`+${altasMes} este mes`} />
        <StatCard label="Cuentas activas" value={activos} nota={`${usuarios.length - activos} suspendidas`} />
        <StatCard
          label="Consultas este mes"
          value={usoMes.reduce((acc, u) => acc + u._count, 0)}
          nota="Todas las cuentas"
        />
        <StatCard label="Tokens IA este mes" value={tokensMes} nota="Input + output" />
        <StatCard
          label="Solicitudes nuevas"
          value={solicitudesNuevas}
          nota="Sugerencias de nutriólogos"
        />
      </div>

      {/* Tabla de cuentas */}
      <Card className="overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <span className="font-display text-[15px] font-bold text-text">Cuentas</span>
        </div>
        {usuarios.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-text-3">
            Aún no hay cuentas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-border text-[11px] uppercase tracking-wide text-text-3">
                  <th className="px-5 py-2.5 font-semibold">Cuenta</th>
                  <th className="px-3 py-2.5 font-semibold">Alta</th>
                  <th className="px-3 py-2.5 font-semibold">Estado</th>
                  <th className="px-3 py-2.5 font-semibold">Plan</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Pacientes</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Consultas (mes)</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Tokens IA</th>
                  <th className="px-5 py-2.5 text-right font-semibold">Última actividad</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => {
                  const total = usoPorUser.get(u.id);
                  const mes = usoMesPorUser.get(u.id);
                  const tokens =
                    (total?._sum.inputTokens ?? 0) + (total?._sum.outputTokens ?? 0);
                  const ultima = total?._max.createdAt;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border transition-colors last:border-0 hover:bg-surface-3"
                    >
                      <td className="px-5 py-3">
                        <Link href={`/admin/cuentas/${u.id}`} className="flex items-center gap-3">
                          <Avatar nombre={u.name ?? u.email} />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-text">
                              {u.name ?? "Sin nombre"}
                              {u.role === "ADMIN" && (
                                <Badge tone="info" className="ml-2">Admin</Badge>
                              )}
                            </span>
                            <span className="block truncate text-[11.5px] text-text-3">
                              {u.email}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-text-2">
                        {fechaCorta(u.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        {u.estado === "ACTIVE" ? (
                          <Badge tone="success">Activa</Badge>
                        ) : u.estado === "SUSPENDED" ? (
                          <Badge tone="danger">Suspendida</Badge>
                        ) : (
                          <Badge tone="warning">Pendiente</Badge>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Badge tone={u.tier === "FREE" ? "neutral" : "primary"}>
                          {LIMITES_TIER[u.tier].nombre}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text-2">
                        {u._count.pacientes}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text-2">
                        {u._count.consultas} ({mes?._count ?? 0})
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-text-2">
                        {tokens.toLocaleString("es-MX")}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right text-text-3">
                        {ultima ? fechaCorta(ultima) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function StatCard({ label, value, nota }: { label: string; value: number; nota: string }) {
  return (
    <Card className="p-4.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{label}</div>
      <div className="mt-1.5 font-mono text-[26px] font-semibold tabular-nums text-text">
        {value.toLocaleString("es-MX")}
      </div>
      <div className="mt-0.5 text-[11.5px] text-text-3">{nota}</div>
    </Card>
  );
}
