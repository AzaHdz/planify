import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { actualizarPaciente } from "@/app/actions/pacientes";
import { Field } from "@/components/ui/Field";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button, buttonVariants } from "@/components/ui/Button";
import { fechaParaInput } from "@/lib/fechas";

export default async function EditarPacientePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { userId } = await requireUser();

  const paciente = await prisma.paciente.findFirst({ where: { id, userId } });
  if (!paciente) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-[12.5px] text-text-3">
        <Link href="/pacientes" className="hover:underline">
          Pacientes
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/pacientes/${paciente.id}`} className="hover:underline">
          {paciente.nombre}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="font-semibold text-text">Editar</span>
      </div>

      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Editar datos</h1>

      <form action={actualizarPaciente} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="pacienteId" value={paciente.id} />

        <Field label="Nombre completo *" htmlFor="nombre">
          <Input id="nombre" name="nombre" required defaultValue={paciente.nombre} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento *" htmlFor="fechaNacimiento">
            <Input
              id="fechaNacimiento"
              name="fechaNacimiento"
              type="date"
              required
              defaultValue={fechaParaInput(paciente.fechaNacimiento)}
            />
          </Field>
          <Field label="Género *" htmlFor="genero">
            <Select id="genero" name="genero" required defaultValue={paciente.genero}>
              <option value="FEMENINO">Femenino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OTRO">Otro</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" defaultValue={paciente.email ?? ""} />
          </Field>
          <Field
            label="Teléfono"
            htmlFor="telefono"
            hint="Se usa para el recordatorio de cita por WhatsApp"
          >
            <Input id="telefono" name="telefono" defaultValue={paciente.telefono ?? ""} />
          </Field>
        </div>

        <Field label="Notas" htmlFor="notas">
          <Textarea id="notas" name="notas" rows={3} defaultValue={paciente.notas ?? ""} />
        </Field>

        <div className="flex gap-2.5">
          <Button type="submit">Guardar cambios</Button>
          <Link
            href={`/pacientes/${paciente.id}`}
            className={buttonVariants({ variant: "secondary" })}
          >
            Cancelar
          </Link>
        </div>
      </form>

      <p className="mt-6 border-t border-border pt-4 text-[12.5px] text-text-3">
        El consentimiento de tratamiento de datos se otorgó al dar de alta al paciente y no se
        edita desde aquí.
      </p>
    </div>
  );
}
