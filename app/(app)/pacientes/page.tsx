import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { imc, clasificacionIMC } from "@/lib/calculos";
import { fechaCorta } from "@/lib/format";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";

const rangoColor = {
  in: "text-range-in",
  out: "text-range-out",
  critical: "text-range-critical",
} as const;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filtro?: string }>;
}) {
  const { userId } = await requireUser();
  const { q, filtro } = await searchParams;
  const query = q?.trim();

  const total = await prisma.paciente.count({ where: { userId } });

  const pacientes = await prisma.paciente.findMany({
    where: {
      userId,
      ...(query
        ? {
            OR: [
              { nombre: { contains: query, mode: "insensitive" } },
              { email: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { consultas: true } },
      consultas: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // Filtro "Plan pendiente" (computado en memoria sobre la última consulta)
  const filtrados =
    filtro === "pendiente"
      ? pacientes.filter((p) => {
          const u = p.consultas[0];
          return u?.planFinal && !u.aprobadoAt;
        })
      : pacientes;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Pacientes <span className="font-mono text-sm font-medium text-text-3">{total}</span>
        </h1>
        <Link href="/pacientes/nuevo" className={buttonVariants({ size: "sm" })}>
          + Nuevo paciente
        </Link>
      </div>

      {/* Búsqueda + filtros */}
      <div className="flex flex-wrap items-center gap-2.5">
        <form className="flex max-w-sm flex-1 items-center gap-2 rounded-pill border border-border-strong bg-surface px-4 py-2">
          <SearchIcon />
          <input
            name="q"
            defaultValue={query}
            placeholder="Buscar por nombre o correo…"
            className="w-full bg-transparent text-sm text-text placeholder:text-text-3 focus:outline-none"
          />
          {filtro && <input type="hidden" name="filtro" value={filtro} />}
        </form>
        <FiltroChip label="Todos" activo={!filtro} href={query ? `/pacientes?q=${query}` : "/pacientes"} />
        <FiltroChip
          label="Plan pendiente"
          activo={filtro === "pendiente"}
          href={`/pacientes?filtro=pendiente${query ? `&q=${query}` : ""}`}
        />
      </div>

      <Card className="overflow-hidden">
        {/* thead */}
        <div className="grid grid-cols-[2fr_1.1fr_1.3fr_1.1fr_0.7fr] items-center gap-2 border-b border-border bg-surface-2 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-text-3">
          <span>Paciente</span>
          <span>Última consulta</span>
          <span>Objetivo</span>
          <span>Plan actual</span>
          <span>IMC</span>
        </div>

        {filtrados.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-text-3">
            {query || filtro ? "Ningún paciente coincide con el filtro." : "Sin pacientes todavía. Crea el primero para empezar."}
          </p>
        ) : (
          filtrados.map((p) => {
            const u = p.consultas[0];
            const valorIMC = u ? imc(u.peso, u.altura) : null;
            const clase = valorIMC != null ? clasificacionIMC(valorIMC) : null;
            const estado = !u
              ? { tone: "neutral" as const, label: "Sin consulta" }
              : u.aprobadoAt
                ? { tone: "success" as const, label: "Aprobado" }
                : u.planFinal
                  ? { tone: "warning" as const, label: "Pendiente" }
                  : { tone: "neutral" as const, label: "Sin plan" };
            return (
              <Link
                key={p.id}
                href={`/pacientes/${p.id}`}
                className="grid grid-cols-[2fr_1.1fr_1.3fr_1.1fr_0.7fr] items-center gap-2 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
              >
                <span className="flex items-center gap-2.5">
                  <Avatar nombre={p.nombre} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-semibold text-text">{p.nombre}</span>
                    <span className="block truncate text-[11.5px] text-text-3">{p.email ?? "—"}</span>
                  </span>
                </span>
                <span className="font-mono text-[12.5px] tabular-nums text-text-2">
                  {u ? fechaCorta(u.createdAt) : "—"}
                </span>
                <span className="truncate text-[13px] text-text">{u?.objetivos ?? "—"}</span>
                <span>
                  <Badge tone={estado.tone}>{estado.label}</Badge>
                </span>
                <span className={`flex items-center gap-1.5 font-mono text-[12.5px] tabular-nums ${clase ? rangoColor[clase.rango] : "text-text-3"}`}>
                  {valorIMC != null ? valorIMC.toFixed(1) : "—"}
                  {clase && <span className={`size-1.5 rounded-full ${bgRango[clase.rango]}`} />}
                </span>
              </Link>
            );
          })
        )}
      </Card>

      <p className="text-[12.5px] text-text-3">
        Mostrando {filtrados.length} de {total} paciente{total === 1 ? "" : "s"}
      </p>
    </div>
  );
}

const bgRango = {
  in: "bg-range-in",
  out: "bg-range-out",
  critical: "bg-range-critical",
} as const;

function FiltroChip({ label, activo, href }: { label: string; activo: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={
        activo
          ? "rounded-pill border border-primary-soft-brd bg-primary-soft px-3.5 py-1.5 text-[12.5px] font-semibold text-primary"
          : "rounded-pill border border-border-strong px-3.5 py-1.5 text-[12.5px] font-medium text-text-2 transition-colors hover:bg-surface-3"
      }
    >
      {label}
    </Link>
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
