import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { eliminarCita } from "@/app/actions/citas";
import { CitaForm } from "@/components/CitaForm";
import { Button } from "@/components/ui/Button";
import { claveDia, horaEnZona } from "@/lib/fechas";

export default async function EditarCitaPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await requireUser();
  const { id } = await params;

  const cita = await prisma.cita.findFirst({
    where: { id, userId }, // el filtro por userId es lo que impide tocar citas ajenas
    include: { paciente: { select: { nombre: true } } },
  });
  if (!cita) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-[12.5px] text-text-3">
        <Link href="/agenda" className="hover:underline">
          Agenda
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">Reprogramar</span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">
        Reprogramar cita
      </h1>

      <CitaForm
        pacientes={[]}
        nombrePaciente={cita.paciente.nombre}
        valores={{
          citaId: cita.id,
          fecha: claveDia(cita.inicioAt),
          hora: horaEnZona(cita.inicioAt),
          duracionMin: cita.duracionMin,
          notas: cita.notas,
        }}
      />

      <div className="mt-8 border-t border-border pt-5">
        <p className="text-[12.5px] text-text-3">
          Si el paciente avisó que no viene, cancélala desde la agenda: así queda el registro.
          Eliminar es para citas creadas por error y no se puede deshacer.
        </p>
        <form action={eliminarCita} className="mt-3">
          <input type="hidden" name="citaId" value={cita.id} />
          <Button type="submit" variant="destructive" size="sm">
            Eliminar cita
          </Button>
        </form>
      </div>
    </div>
  );
}
