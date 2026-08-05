import Link from "next/link";
import type { EstadoCita } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auth, requireUser } from "@/lib/auth";
import { cambiarEstadoCita } from "@/app/actions/citas";
import { Card } from "@/components/ui/Card";
import { Badge, type Tone } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { RecordatorioWhatsApp } from "@/components/RecordatorioWhatsApp";
import {
  DIAS_SEMANA,
  claveDia,
  claveMes,
  fechaLargaEnZona,
  finDelDia,
  horaEnZona,
  horaFinEnZona,
  hoyClave,
  inicioDelDia,
  mesVecino,
  nombreDelMes,
  parsearMes,
  rejillaDelMes,
} from "@/lib/fechas";

const ESTADO: Record<EstadoCita, { label: string; tone: Tone }> = {
  PROGRAMADA: { label: "Programada", tone: "neutral" },
  CONFIRMADA: { label: "Confirmada", tone: "success" },
  CANCELADA: { label: "Cancelada", tone: "danger" },
  COMPLETADA: { label: "Completada", tone: "info" },
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  const { userId } = await requireUser();
  const sesion = await auth();
  const sp = await searchParams;

  const { anio, mes } = parsearMes(sp.mes);
  const celdas = rejillaDelMes(anio, mes);
  const hoy = hoyClave();
  const diaSel = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : null;

  // Un solo query para toda la rejilla, incluidos los días de relleno de los
  // meses vecinos que sí se dibujan.
  const citas = await prisma.cita.findMany({
    where: {
      userId,
      inicioAt: { gte: inicioDelDia(celdas[0].clave), lt: finDelDia(celdas[41].clave) },
    },
    include: { paciente: { select: { id: true, nombre: true, telefono: true } } },
    orderBy: { inicioAt: "asc" },
  });

  // Agrupadas por su día en México, no por el día UTC del instante
  const porDia = new Map<string, typeof citas>();
  for (const c of citas) {
    const k = claveDia(c.inicioAt);
    const lista = porDia.get(k);
    if (lista) lista.push(c);
    else porDia.set(k, [c]);
  }

  const anterior = mesVecino(anio, mes, -1);
  const siguiente = mesVecino(anio, mes, 1);
  const delDia = diaSel ? (porDia.get(diaSel) ?? []) : [];
  const activas = citas.filter((c) => c.estado !== "CANCELADA").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">
          Agenda{" "}
          <span className="font-mono text-sm font-medium text-text-3">
            {activas} cita{activas === 1 ? "" : "s"}
          </span>
        </h1>
        <Link
          href={`/agenda/nueva?dia=${diaSel ?? hoy}`}
          className={buttonVariants({ size: "sm" })}
        >
          + Nueva cita
        </Link>
      </div>

      {/* Navegación de mes */}
      <div className="flex items-center gap-2">
        <Link
          href={`/agenda?mes=${claveMes(anterior.anio, anterior.mes)}`}
          aria-label="Mes anterior"
          className={buttonVariants({ variant: "secondary", size: "sm", className: "px-3" })}
        >
          ‹
        </Link>
        {/* first-letter, no capitalize: "agosto de 2026" debe quedar "Agosto de 2026",
            no "Agosto De 2026" */}
        <span className="min-w-[9.5rem] text-center font-display text-[15px] font-bold text-text first-letter:uppercase">
          {nombreDelMes(anio, mes)}
        </span>
        <Link
          href={`/agenda?mes=${claveMes(siguiente.anio, siguiente.mes)}`}
          aria-label="Mes siguiente"
          className={buttonVariants({ variant: "secondary", size: "sm", className: "px-3" })}
        >
          ›
        </Link>
        <Link
          href={`/agenda?dia=${hoy}`}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Hoy
        </Link>
      </div>

      {/* Rejilla */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border bg-surface-2">
          {DIAS_SEMANA.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-text-3"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {celdas.map((celda) => {
            const delCelda = porDia.get(celda.clave) ?? [];
            const esHoy = celda.clave === hoy;
            const seleccionado = celda.clave === diaSel;

            return (
              <Link
                key={celda.clave}
                href={`/agenda?mes=${claveMes(anio, mes)}&dia=${celda.clave}`}
                aria-current={seleccionado ? "date" : undefined}
                className={`min-h-[96px] border-b border-r border-border p-1.5 transition-colors last:border-r-0 ${
                  seleccionado ? "bg-primary-soft" : celda.delMes ? "hover:bg-surface-3" : "bg-surface-2"
                }`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-pill font-mono text-[11.5px] tabular-nums ${
                    esHoy
                      ? "bg-primary font-bold text-on-primary"
                      : celda.delMes
                        ? "text-text-2"
                        : "text-text-3"
                  }`}
                >
                  {celda.dia}
                </span>

                <div className="mt-1 flex flex-col gap-0.5">
                  {delCelda.slice(0, 3).map((c) => (
                    <span
                      key={c.id}
                      className={`truncate rounded-chip px-1 py-px text-[10.5px] ${
                        c.estado === "CANCELADA"
                          ? "text-text-3 line-through"
                          : "bg-surface-3 text-text-2"
                      }`}
                    >
                      {/* En móvil la celda mide ~48px: el nombre no cabe y lo
                          recortaría todo. Mejor la hora sola, que sí se lee. */}
                      <span className="font-mono tabular-nums">{horaEnZona(c.inicioAt)}</span>
                      <span className="hidden sm:inline"> {c.paciente.nombre.split(" ")[0]}</span>
                    </span>
                  ))}
                  {delCelda.length > 3 && (
                    <span className="px-1 text-[10.5px] font-semibold text-primary">
                      +{delCelda.length - 3} más
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </Card>

      {citas.length === 0 && (
        <p className="text-center text-sm text-text-3">
          Sin citas en {nombreDelMes(anio, mes)}. Usa “+ Nueva cita” para agendar la primera.
        </p>
      )}

      {/* Detalle del día seleccionado */}
      {diaSel && (
        <Card className="overflow-hidden">
          <div className="flex items-baseline justify-between border-b border-border bg-surface-2 px-5 py-3">
            <span className="font-display text-[15px] font-bold text-text first-letter:uppercase">
              {fechaLargaEnZona(inicioDelDia(diaSel))}
            </span>
            <span className="font-mono text-xs text-text-3">
              {delDia.length} cita{delDia.length === 1 ? "" : "s"}
            </span>
          </div>

          {delDia.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-text-3">No hay citas este día.</p>
              <Link
                href={`/agenda/nueva?dia=${diaSel}`}
                className={buttonVariants({ variant: "secondary", size: "sm", className: "mt-3" })}
              >
                Agendar una
              </Link>
            </div>
          ) : (
            delDia.map((c) => (
              <div key={c.id} className="border-b border-border px-5 py-4 last:border-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <span className="font-mono text-[13px] font-semibold tabular-nums text-text">
                    {horaEnZona(c.inicioAt)} – {horaFinEnZona(c.inicioAt, c.duracionMin)}
                  </span>
                  <Link
                    href={`/pacientes/${c.paciente.id}`}
                    className="text-sm font-semibold text-text hover:underline"
                  >
                    {c.paciente.nombre}
                  </Link>
                  <Badge tone={ESTADO[c.estado].tone}>{ESTADO[c.estado].label}</Badge>
                </div>

                {c.notas && <p className="mt-1.5 text-[12.5px] text-text-2">{c.notas}</p>}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {c.estado !== "CANCELADA" && (
                    <RecordatorioWhatsApp
                      paciente={c.paciente.nombre}
                      telefono={c.paciente.telefono}
                      nutriologo={sesion?.user?.name}
                      inicioAt={c.inicioAt}
                    />
                  )}

                  {c.estado === "PROGRAMADA" && (
                    <AccionEstado citaId={c.id} estado="CONFIRMADA" label="Confirmar" />
                  )}
                  {(c.estado === "PROGRAMADA" || c.estado === "CONFIRMADA") && (
                    <>
                      <AccionEstado citaId={c.id} estado="COMPLETADA" label="Completar" />
                      <Link
                        href={`/agenda/${c.id}/editar`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                      >
                        Reprogramar
                      </Link>
                      <AccionEstado
                        citaId={c.id}
                        estado="CANCELADA"
                        label="Cancelar"
                        variant="ghost"
                      />
                    </>
                  )}
                  {c.estado === "CANCELADA" && (
                    <AccionEstado citaId={c.id} estado="PROGRAMADA" label="Reactivar" />
                  )}
                  {c.estado === "COMPLETADA" && (
                    <Link
                      href={`/consultas/nueva?paciente=${c.paciente.id}`}
                      className={buttonVariants({ size: "sm" })}
                    >
                      + Nueva consulta
                    </Link>
                  )}
                </div>
              </div>
            ))
          )}
        </Card>
      )}
    </div>
  );
}

function AccionEstado({
  citaId,
  estado,
  label,
  variant = "secondary",
}: {
  citaId: string;
  estado: EstadoCita;
  label: string;
  variant?: "secondary" | "ghost";
}) {
  return (
    <form action={cambiarEstadoCita}>
      <input type="hidden" name="citaId" value={citaId} />
      <input type="hidden" name="estado" value={estado} />
      <Button type="submit" variant={variant} size="sm">
        {label}
      </Button>
    </form>
  );
}
