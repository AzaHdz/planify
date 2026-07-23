import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { edadEnAnios } from "@/lib/calculos";
import { fechaCorta } from "@/lib/format";
import { LIMITES_TIER, consultasUsadasEsteMes } from "@/lib/limits";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import { ConsultaForm } from "@/components/ConsultaForm";

export default async function NuevaConsultaPage({
  searchParams,
}: {
  searchParams: Promise<{ paciente?: string }>;
}) {
  const { paciente: pacienteId } = await searchParams;
  const { userId, tier } = await requireUser();

  if (!pacienteId) redirect("/pacientes");

  // Cuota del mes: si ya se alcanzó, avisar antes de llenar el formulario
  // (crearConsulta vuelve a validar — esto es solo UX)
  const limite = LIMITES_TIER[tier].consultasMes;
  const usadas = limite !== null ? await consultasUsadasEsteMes(userId) : 0;
  const cuotaAgotada = limite !== null && usadas >= limite;

  const paciente = await prisma.paciente.findFirst({
    where: { id: pacienteId, userId },
    include: { consultas: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!paciente) notFound();

  const previa = paciente.consultas[0];
  const numero = paciente.consultas.length + 1;
  const restricciones =
    previa?.restricciones && previa.restricciones !== "Sin restricciones declaradas"
      ? previa.restricciones.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean)
      : [];

  return (
    <div className="flex flex-col gap-6">
      {/* Barra de contexto */}
      <div className="flex flex-wrap items-center gap-3">
        <Avatar nombre={paciente.nombre} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-bold tracking-tight text-text">
            Nueva consulta · {paciente.nombre}
          </h1>
          <p className="text-[13px] text-text-3">
            Consulta {numero} ·{" "}
            {previa
              ? `Anterior: ${previa.peso} kg (${fechaCorta(previa.createdAt)})`
              : "Primera consulta · valoración inicial"}
          </p>
        </div>
        {restricciones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {restricciones.slice(0, 3).map((r, i) => (
              <Badge key={i} tone={/alergia|intoleranc/i.test(r) ? "danger" : "neutral"}>
                {r}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {cuotaAgotada ? (
        <Card className="p-6">
          <p className="font-display text-[15px] font-bold text-text">
            Alcanzaste el límite de tu plan {LIMITES_TIER[tier].nombre}
          </p>
          <p className="mt-1.5 max-w-xl text-sm text-text-2">
            Usaste las {limite} consultas incluidas este mes. El contador se reinicia el día 1;
            si necesitas más consultas ahora, contacta al administrador de Planify para ampliar
            tu plan.
          </p>
          <div className="mt-4">
            <Link href="/ajustes" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Ver mi plan en Ajustes
            </Link>
          </div>
        </Card>
      ) : (
        <ConsultaForm
          pacienteId={paciente.id}
          edad={edadEnAnios(paciente.fechaNacimiento)}
          genero={paciente.genero}
        />
      )}
    </div>
  );
}
