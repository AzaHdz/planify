import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { CitaForm } from "@/components/CitaForm";
import { buttonVariants } from "@/components/ui/Button";
import { hoyClave } from "@/lib/fechas";

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ dia?: string; paciente?: string }>;
}) {
  const { userId } = await requireUser();
  const sp = await searchParams;

  const pacientes = await prisma.paciente.findMany({
    where: { userId },
    select: { id: true, nombre: true },
    orderBy: { nombre: "asc" },
  });

  const dia = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) ? sp.dia : hoyClave();

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-[12.5px] text-text-3">
        <Link href="/agenda" className="hover:underline">
          Agenda
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">Nueva cita</span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Nueva cita</h1>

      {pacientes.length === 0 ? (
        <div className="mt-6 rounded-card border border-dashed border-border-strong p-8 text-center">
          <p className="text-sm text-text-3">
            Necesitas al menos un paciente para agendar una cita.
          </p>
          <Link
            href="/pacientes/nuevo"
            className={buttonVariants({ size: "sm", className: "mt-3" })}
          >
            + Nuevo paciente
          </Link>
        </div>
      ) : (
        <CitaForm pacientes={pacientes} valores={{ fecha: dia, pacienteId: sp.paciente }} />
      )}
    </div>
  );
}
