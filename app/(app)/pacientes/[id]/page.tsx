import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { edadEnAnios, imc, clasificacionIMC } from "@/lib/calculos";
import { fechaCorta } from "@/lib/format";
import { claveDia, fechaHoraEnZona, hoyClave, inicioDelDia } from "@/lib/fechas";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { buttonVariants } from "@/components/ui/Button";
import { ProgresoChart, type SerieMetrica } from "@/components/ProgresoChart";

const rangoText = { in: "text-range-in", out: "text-range-out", critical: "text-range-critical" } as const;

/** Métricas graficables. El IMC no se persiste: se calcula por consulta. Las medidas
 *  opcionales devuelven null y esa consulta se omite de la serie (no se interpola). */
const METRICAS: {
  key: string;
  label: string;
  unidad: string;
  valor: (c: { peso: number; altura: number; grasaCorporal: number | null; cintura: number | null; cadera: number | null; brazo: number | null }) => number | null;
}[] = [
  { key: "peso", label: "Peso", unidad: "kg", valor: (c) => c.peso },
  { key: "imc", label: "IMC", unidad: "", valor: (c) => imc(c.peso, c.altura) },
  { key: "grasa", label: "% grasa", unidad: "%", valor: (c) => c.grasaCorporal },
  { key: "cintura", label: "Cintura", unidad: "cm", valor: (c) => c.cintura },
  { key: "cadera", label: "Cadera", unidad: "cm", valor: (c) => c.cadera },
  { key: "brazo", label: "Brazo", unidad: "cm", valor: (c) => c.brazo },
];

export default async function PacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const paciente = await prisma.paciente.findFirst({
    where: { id, userId },
    include: { consultas: { orderBy: { createdAt: "desc" } } },
  });
  if (!paciente) notFound();

  // Citas futuras de este paciente, desde el arranque de hoy en México
  const proximasCitas = await prisma.cita.findMany({
    where: {
      userId,
      pacienteId: paciente.id,
      estado: { in: ["PROGRAMADA", "CONFIRMADA"] },
      inicioAt: { gte: inicioDelDia(hoyClave()) },
    },
    orderBy: { inicioAt: "asc" },
    take: 3,
  });

  const consultas = paciente.consultas;
  const ultima = consultas[0];
  const previa = consultas[1];
  const asc = [...consultas].reverse();
  const conPlan = consultas.filter((c) => c.planFinal).length;

  // Series para la gráfica: se arman aquí para que al cliente solo viajen datos
  // planos serializables. `t` es el timestamp, no el índice: el eje X es
  // proporcional al tiempo transcurrido entre consultas.
  const series: SerieMetrica[] = METRICAS.map((m) => ({
    key: m.key,
    label: m.label,
    unidad: m.unidad,
    puntos: asc.flatMap((c) => {
      const valor = m.valor(c);
      return valor == null
        ? []
        : [{ t: c.createdAt.getTime(), fecha: fechaCorta(c.createdAt), valor }];
    }),
  }));

  const restricciones =
    ultima?.restricciones && ultima.restricciones !== "Sin restricciones declaradas"
      ? ultima.restricciones.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [];

  const valorIMC = ultima ? imc(ultima.peso, ultima.altura) : null;
  const claseIMC = valorIMC != null ? clasificacionIMC(valorIMC) : null;

  const delta = (a?: number | null, b?: number | null) =>
    a != null && b != null ? a - b : null;

  const medidas = ultima
    ? [
        { label: "Peso", value: ultima.peso.toFixed(1), unit: "kg", d: delta(ultima.peso, previa?.peso) },
        { label: "IMC", value: valorIMC!.toFixed(1), range: claseIMC!.rango, nota: claseIMC!.etiqueta },
        { label: "% grasa", value: ultima.grasaCorporal?.toFixed(1) ?? "—", unit: ultima.grasaCorporal != null ? "%" : "", d: delta(ultima.grasaCorporal, previa?.grasaCorporal) },
        { label: "Cintura", value: ultima.cintura ?? "—", unit: ultima.cintura != null ? "cm" : "", d: delta(ultima.cintura, previa?.cintura) },
        { label: "Cadera", value: ultima.cadera ?? "—", unit: ultima.cadera != null ? "cm" : "", d: delta(ultima.cadera, previa?.cadera) },
        { label: "Brazo", value: ultima.brazo ?? "—", unit: ultima.brazo != null ? "cm" : "", d: delta(ultima.brazo, previa?.brazo) },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-[12.5px] text-text-3">
        <Link href="/pacientes" className="hover:underline">Pacientes</Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">{paciente.nombre}</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <Avatar nombre={paciente.nombre} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">{paciente.nombre}</h1>
            <Badge tone="success">Activa</Badge>
          </div>
          <p className="mt-1 text-[13px] text-text-2">
            {edadEnAnios(paciente.fechaNacimiento)} años · {paciente.genero.toLowerCase()} · Paciente desde{" "}
            {paciente.createdAt.toLocaleDateString("es-MX", { month: "short", year: "numeric" })}
            {ultima ? <> · Objetivo: <b className="text-text">{ultima.objetivos}</b></> : null}
          </p>
          {restricciones.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {restricciones.map((r, i) => (
                <Badge key={i} tone={/alergia|intoleranc/i.test(r) ? "danger" : "neutral"}>
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2.5">
          {/* Ghost y no secondary: con tres acciones en el encabezado, editar los
              datos es la menos frecuente y no debe competir con las otras dos. */}
          <Link
            href={`/pacientes/${paciente.id}/editar`}
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            Editar datos
          </Link>
          <Link
            href={`/agenda/nueva?paciente=${paciente.id}`}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            Agendar cita
          </Link>
          <Link href={`/consultas/nueva?paciente=${paciente.id}`} className={buttonVariants({ size: "sm" })}>
            + Nueva consulta
          </Link>
        </div>
      </div>

      {/* Tabs (solo Resumen funcional) */}
      <div className="flex gap-6 border-b border-border">
        <span className="border-b-2 border-primary pb-2.5 text-[13.5px] font-semibold text-primary">Resumen</span>
        <span className="pb-2.5 text-[13.5px] font-medium text-text-3">
          Consultas <span className="font-mono text-[11px]">{consultas.length}</span>
        </span>
        <span className="pb-2.5 text-[13.5px] font-medium text-text-3">
          Planes <span className="font-mono text-[11px]">{conPlan}</span>
        </span>
        <span className="cursor-not-allowed pb-2.5 text-[13.5px] font-medium text-text-3 opacity-60" title="Próximamente">
          Documentos
        </span>
      </div>

      {consultas.length === 0 ? (
        <p className="rounded-card border border-dashed border-border-strong p-8 text-center text-sm text-text-3">
          Sin consultas registradas. Crea la primera para ver la evolución.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          {/* Izquierda */}
          <div className="flex flex-col gap-4">
            <Card className="p-5">
              <div className="font-display text-[15px] font-bold text-text">Progreso</div>
              {/* El rango de fechas ya no va en el header: la gráfica rotula sus
                  propios extremos bajo el eje X. */}
              <ProgresoChart series={series} />
            </Card>

            <Card className="p-5">
              <div className="mb-3.5 font-display text-[15px] font-bold text-text">
                Última antropometría{" "}
                <span className="ml-1.5 text-xs font-normal text-text-3">{ultima && fechaCorta(ultima.createdAt)}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {medidas.map((m) => (
                  <div key={m.label}>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-text-3">{m.label}</div>
                    <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${m.range ? rangoText[m.range] : "text-text"}`}>
                      {m.value}
                      {m.unit && <span className="text-[11px] font-normal text-text-3"> {m.unit}</span>}
                    </div>
                    {m.range ? (
                      <div className={`mt-0.5 text-[11px] font-semibold ${rangoText[m.range]}`}>{m.nota}</div>
                    ) : m.d != null && Math.abs(m.d) > 0.01 ? (
                      <div className="mt-0.5 font-mono text-[11px] tabular-nums text-text-3">
                        {m.d > 0 ? "+" : ""}
                        {m.d.toFixed(1)}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Derecha: próximas citas + historial */}
          <div className="flex flex-col gap-4">
            {proximasCitas.length > 0 && (
              <Card className="overflow-hidden">
                <div className="flex items-baseline justify-between border-b border-border px-5 py-4">
                  <span className="font-display text-[15px] font-bold text-text">Próximas citas</span>
                  <Link href="/agenda" className="text-xs font-semibold text-primary hover:underline">
                    Ver agenda
                  </Link>
                </div>
                {proximasCitas.map((c) => (
                  <Link
                    key={c.id}
                    href={`/agenda?dia=${claveDia(c.inicioAt)}`}
                    className="flex items-center justify-between gap-3 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
                  >
                    <span className="font-mono text-[12.5px] tabular-nums text-text-2">
                      {fechaHoraEnZona(c.inicioAt)}
                    </span>
                    {claveDia(c.inicioAt) === hoyClave() && <Badge tone="primary">Hoy</Badge>}
                  </Link>
                ))}
              </Card>
            )}

            {/* La spec de PLAN-2 pedía solo las notas. Se muestra también el contacto
                porque el teléfono alimenta el recordatorio de la agenda y hasta ahora
                no había forma de saber si el paciente tenía uno registrado. */}
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="font-display text-[15px] font-bold text-text">Contacto y notas</span>
                <Link
                  href={`/pacientes/${paciente.id}/editar`}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Editar
                </Link>
              </div>
              <dl className="px-5 py-3.5 text-[13px]">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-text-3">Email</dt>
                  <dd className="min-w-0 break-words text-text-2">{paciente.email ?? "—"}</dd>
                </div>
                <div className="mt-2 flex gap-2">
                  <dt className="w-20 shrink-0 text-text-3">Teléfono</dt>
                  <dd className="min-w-0 break-words text-text-2">
                    {paciente.telefono ?? (
                      <span className="text-text-3">Sin registrar</span>
                    )}
                  </dd>
                </div>
                {paciente.notas && (
                  <div className="mt-3 border-t border-border pt-3">
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-text-3">
                      Notas
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-text-2">{paciente.notas}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <span className="font-display text-[15px] font-bold text-text">Historial de consultas</span>
              </div>
              {consultas.map((c, i) => (
                <Link
                  key={c.id}
                  href={`/consultas/${c.id}`}
                  className="flex gap-3 border-b border-border px-5 py-3 transition-colors last:border-0 hover:bg-surface-3"
                >
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${i === 0 ? "bg-primary" : "bg-primary-soft-brd"}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="text-[13px] font-semibold text-text">
                      Consulta {consultas.length - i}
                    </span>
                    <span className="font-mono text-[11.5px] tabular-nums text-text-3">
                      {c.createdAt.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[12px] text-text-2">
                    {c.peso} kg
                    {c.aprobadoAt ? (
                      <span className="font-semibold text-success"> · plan aprobado</span>
                    ) : c.planFinal ? (
                      <span className="font-semibold text-warning"> · pendiente de aprobar</span>
                    ) : (
                      <span className="text-text-3"> · sin plan</span>
                    )}
                  </span>
                </span>
                </Link>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
