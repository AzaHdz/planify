import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { fechaCorta } from "@/lib/format";
import { kcalDePlan } from "@/lib/plan";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

type Estado = "todas" | "aprobadas" | "pendientes" | "sin-plan";

const filtros: { key: Estado; label: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "aprobadas", label: "Aprobadas" },
  { key: "pendientes", label: "Pendientes" },
  { key: "sin-plan", label: "Sin plan" },
];

function whereEstado(estado: Estado): Prisma.ConsultaWhereInput {
  switch (estado) {
    case "aprobadas":
      return { aprobadoAt: { not: null } };
    case "pendientes":
      return { planFinal: { not: Prisma.DbNull }, aprobadoAt: null };
    case "sin-plan":
      return { planFinal: { equals: Prisma.DbNull } };
    default:
      return {};
  }
}

export default async function ConsultasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string }>;
}) {
  const { userId } = await requireUser();
  const { q, estado: estadoRaw } = await searchParams;
  const query = q?.trim();
  const estado: Estado = filtros.some((f) => f.key === estadoRaw)
    ? (estadoRaw as Estado)
    : "todas";

  const consultas = await prisma.consulta.findMany({
    where: {
      userId,
      ...whereEstado(estado),
      ...(query
        ? {
            paciente: {
              OR: [
                { nombre: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: { paciente: { select: { nombre: true, email: true } } },
    orderBy: { createdAt: "desc" },
  });

  const chipHref = (key: Estado) => {
    const p = new URLSearchParams();
    if (key !== "todas") p.set("estado", key);
    if (query) p.set("q", query);
    const s = p.toString();
    return s ? `/consultas?${s}` : "/consultas";
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
        Consultas <span className="font-mono text-sm font-medium text-text-3">{consultas.length}</span>
      </h1>

      {/* Búsqueda + filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <form className="flex max-w-sm flex-1 items-center gap-2 rounded-pill border border-border-strong bg-surface px-4 py-2">
          <SearchIcon />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por paciente…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
          />
          {estado !== "todas" && <input type="hidden" name="estado" value={estado} />}
        </form>
        {filtros.map((f) => (
          <Link
            key={f.key}
            href={chipHref(f.key)}
            className={
              estado === f.key
                ? "rounded-pill border border-primary-soft-brd bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-primary"
                : "rounded-pill border border-border-strong px-3.5 py-1.5 text-[12.5px] font-medium text-text-2 transition-colors hover:bg-surface-3"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1.4fr_0.8fr_1fr] items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          <span>Paciente</span>
          <span>Fecha</span>
          <span>Objetivo</span>
          <span>Kcal</span>
          <span>Estado</span>
        </div>

        {consultas.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-3">
            {query || estado !== "todas"
              ? "Ninguna consulta coincide con el filtro."
              : "Aún no hay consultas registradas."}
          </p>
        ) : (
          consultas.map((c) => {
            const kcal = kcalDePlan(c.planFinal);
            const est = c.aprobadoAt
              ? { tone: "success" as const, label: "Aprobada" }
              : c.planFinal
                ? { tone: "warning" as const, label: "Pendiente" }
                : { tone: "neutral" as const, label: "Sin plan" };
            return (
              <Link
                key={c.id}
                href={`/consultas/${c.id}`}
                className="grid grid-cols-[2fr_1fr_1.4fr_0.8fr_1fr] items-center gap-2 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
              >
                <span className="flex items-center gap-2.5">
                  <Avatar nombre={c.paciente.nombre} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-text">{c.paciente.nombre}</span>
                    <span className="block truncate text-[11.5px] text-text-3">{c.paciente.email ?? "—"}</span>
                  </span>
                </span>
                <span className="font-mono text-[12.5px] tabular-nums text-text-2">{fechaCorta(c.createdAt)}</span>
                <span className="truncate text-[13px] text-text">{c.objetivos}</span>
                <span className="font-mono text-[12.5px] tabular-nums text-text-2">
                  {kcal ? kcal.toLocaleString("es-MX") : "—"}
                </span>
                <span>
                  <Badge tone={est.tone}>{est.label}</Badge>
                </span>
              </Link>
            );
          })
        )}
      </Card>

      <p className="text-[12.5px] text-text-3">Mostrando {consultas.length} consulta{consultas.length === 1 ? "" : "s"}</p>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-3" aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
