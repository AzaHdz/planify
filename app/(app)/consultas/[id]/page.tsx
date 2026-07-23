import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { edadEnAnios } from "@/lib/calculos";
import { PlanAlimenticio } from "@/lib/ai/planSchema";
import { PlanView } from "@/components/PlanView";
import { PlanResumen } from "@/components/PlanResumen";
import { PlanPanel } from "@/components/PlanPanel";
import { Card } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Stat";
import { Badge } from "@/components/ui/Badge";
import { GenerarPlanButton, AprobarButton } from "@/components/ConsultaAcciones";

export default async function ConsultaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const consulta = await prisma.consulta.findFirst({
    where: { id, userId },
    include: { paciente: true },
  });
  if (!consulta) notFound();

  const plan = consulta.planFinal ? PlanAlimenticio.parse(consulta.planFinal) : null;

  const medidas: [string, number | null, string][] = [
    ["Peso", consulta.peso, "kg"],
    ["Altura", consulta.altura, "cm"],
    ["Cintura", consulta.cintura, "cm"],
    ["Cadera", consulta.cadera, "cm"],
    ["Brazo", consulta.brazo, "cm"],
    ["Grasa", consulta.grasaCorporal, "%"],
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-text-3">
            <Link href={`/pacientes/${consulta.pacienteId}`} className="hover:underline">
              {consulta.paciente.nombre}
            </Link>{" "}
            · {edadEnAnios(consulta.paciente.fechaNacimiento)} años ·{" "}
            {consulta.createdAt.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-bold tracking-tight text-text">
              {plan ? `Plan alimenticio · ${consulta.paciente.nombre.split(" ")[0]}` : "Consulta"}
            </h1>
            {plan && <Badge tone="primary">✦ Generado por IA</Badge>}
            {consulta.aprobadoAt ? (
              <Badge tone="success">Aprobado</Badge>
            ) : plan ? (
              <Badge tone="warning">Borrador — pendiente de aprobar</Badge>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GenerarPlanButton consultaId={consulta.id} yaHayPlan={Boolean(plan)} />
          {plan && <AprobarButton consultaId={consulta.id} aprobado={Boolean(consulta.aprobadoAt)} />}
        </div>
      </div>

      {/* Antropometría */}
      <Card className="p-5">
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {medidas.map(([etiqueta, valor, unidad]) => (
            <Stat key={etiqueta} label={etiqueta} value={valor ?? "—"} unit={valor != null ? unidad : undefined} />
          ))}
        </div>
        <div className="mt-4 grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-text-3">Objetivos</p>
            <p className="text-sm text-text">{consulta.objetivos}</p>
          </div>
          <div>
            <p className="text-xs text-text-3">Restricciones</p>
            <p className="text-sm text-text">{consulta.restricciones}</p>
          </div>
        </div>
      </Card>

      {/* Plan */}
      {!plan ? (
        <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-border-strong p-10 text-center">
          <p className="text-sm text-text-3">
            Aún no se genera el plan. Usa &ldquo;Generar plan con IA&rdquo; para crear un borrador.
          </p>
        </div>
      ) : (
        <PlanPanel
          consultaId={consulta.id}
          plan={plan}
          readView={
            <>
              <PlanView plan={plan} />
              {consulta.promptVersion && (
                <p className="text-xs text-text-3">
                  Generado con {consulta.modeloIA ?? "modelo desconocido"} ({consulta.promptVersion}) ·{" "}
                  {consulta.inputTokens ?? "?"} tokens entrada / {consulta.outputTokens ?? "?"} salida
                </p>
              )}
            </>
          }
          resumen={
            <>
              <PlanResumen plan={plan} />
              {plan.recomendacionesGenerales.length > 0 && (
                <Card className="p-5">
                  <div className="mb-2.5 font-display text-[15px] font-bold text-text">Recomendaciones</div>
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-[13px] text-text-2">
                    {plan.recomendacionesGenerales.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                  <p className="mt-3 text-[11.5px] text-text-3">Aparecen al final del PDF.</p>
                </Card>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
