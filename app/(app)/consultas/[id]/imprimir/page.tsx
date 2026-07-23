import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { edadEnAnios } from "@/lib/calculos";
import { PlanAlimenticio } from "@/lib/ai/planSchema";
import { ImprimirButton } from "@/components/ImprimirButton";

const LETRAS = ["A", "B", "C", "D", "E", "F"];

function kcalComida(opciones: { kcalAprox: number }[]): number {
  if (opciones.length === 0) return 0;
  return Math.round(opciones.reduce((s, o) => s + o.kcalAprox, 0) / opciones.length);
}

export default async function ImprimirPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const consulta = await prisma.consulta.findFirst({
    where: { id, userId },
    include: { paciente: true, user: true },
  });
  if (!consulta) notFound();

  // Regla de aprobación: el PDF solo existe para planes aprobados (§3.6)
  if (!consulta.aprobadoAt || !consulta.planFinal) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-warning-brd bg-warning-soft p-6 text-sm text-warning">
        Este plan aún no está aprobado. Apruébalo en la consulta antes de exportarlo.
      </div>
    );
  }

  const plan = PlanAlimenticio.parse(consulta.planFinal);
  const n = consulta.user;
  const evitar =
    consulta.restricciones && consulta.restricciones !== "Sin restricciones declaradas"
      ? consulta.restricciones
      : null;

  return (
    <div className="mx-auto max-w-3xl bg-surface p-10 print:p-0">
      <div className="mb-6 flex justify-end print:hidden">
        <ImprimirButton />
      </div>

      {/* Membrete */}
      <header className="flex items-start justify-between gap-6 border-b-2 border-primary pb-5">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-ctl border border-dashed border-border-strong text-center text-[9px] text-text-3">
          {n.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={n.logoUrl} alt="Logo" className="size-full object-contain" />
          ) : (
            "logo del nutriólogo"
          )}
        </div>
        <div className="text-right">
          <div className="font-display text-lg font-bold text-text">{n.name ?? "Nutriólogo(a)"}</div>
          <div className="text-[12.5px] text-text-2">
            Nutrióloga clínica
            {n.cedula ? ` · Cédula profesional ${n.cedula}` : ""}
          </div>
          <div className="text-[12.5px] text-text-3">{n.email}</div>
        </div>
      </header>

      {/* Título + fecha */}
      <div className="mt-6 flex items-baseline justify-between">
        <h1 className="font-display text-xl font-bold text-text">Plan alimenticio</h1>
        <span className="font-mono text-sm tabular-nums text-text-3">
          {consulta.aprobadoAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>

      {/* Tira de info del paciente */}
      <div className="mt-4 flex flex-wrap gap-x-7 gap-y-1.5 rounded-ctl bg-surface-2 px-4 py-3 text-[13px] text-text-2">
        <span>
          <b className="text-text">Paciente:</b> {consulta.paciente.nombre}
        </span>
        <span>
          <b className="text-text">Edad:</b> {edadEnAnios(consulta.paciente.fechaNacimiento)} años
        </span>
        <span>
          <b className="text-text">Objetivo:</b> {Math.round(plan.kcalObjetivoDiarias).toLocaleString("es-MX")} kcal/día
        </span>
        {evitar && (
          <span className="text-warning">
            <b>Evitar:</b> {evitar}
          </span>
        )}
      </div>

      {/* Cuerpo del plan (prosa) */}
      <div className="mt-6 flex flex-col gap-4">
        {plan.comidas.map((comida) => (
          <section key={comida.nombre} className="break-inside-avoid">
            <div className="flex items-baseline justify-between border-b border-border pb-1">
              <h2 className="font-display text-base font-semibold text-text">
                {comida.nombre}
                <span className="ml-2 text-sm font-normal text-text-3">{comida.horarioSugerido}</span>
              </h2>
              <span className="font-mono text-xs tabular-nums text-text-3">~{kcalComida(comida.opciones)} kcal</span>
            </div>
            <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-text-2">
              {comida.opciones.map((op, i) => (
                <p key={i}>
                  <b className="text-text">Opción {LETRAS[i] ?? i + 1}.</b> {op.descripcion} — {op.alimentos.join(", ")}.
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Indicaciones */}
      {plan.recomendacionesGenerales.length > 0 && (
        <div className="mt-6 rounded-ctl bg-surface-2 px-4 py-3 text-[13px] text-text-2">
          <b className="text-text">Indicaciones:</b>{" "}
          {plan.recomendacionesGenerales.join(" ")}
        </div>
      )}

      {/* Suplementación */}
      {(plan.suplementacion?.length ?? 0) > 0 && (
        <div className="mt-3 rounded-ctl bg-surface-2 px-4 py-3 text-[13px] text-text-2">
          <b className="text-text">Suplementación:</b>{" "}
          {plan.suplementacion.map((s) => `${s.indicacion} (${s.momento})`).join(" · ")}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-10 flex items-end justify-between gap-6">
        <p className="max-w-md text-[11px] text-text-3">
          Plan revisado y aprobado por {n.name ?? "el nutriólogo tratante"}
          {n.cedula ? ` (cédula ${n.cedula})` : ""} el{" "}
          {consulta.aprobadoAt.toLocaleDateString("es-MX")} · Elaborado con Planify. Este documento
          es una herramienta de apoyo nutricional individualizada; no sustituye una valoración médica.
        </p>
        <div className="w-48 shrink-0 border-t border-text-3 pt-1.5 text-center text-[11px] text-text-3">
          Firma
        </div>
      </footer>
    </div>
  );
}
