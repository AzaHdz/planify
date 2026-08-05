"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { crearCita, reprogramarCita } from "@/app/actions/citas";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button, buttonVariants } from "@/components/ui/Button";

const DURACIONES = [30, 45, 60, 90, 120];

type Valores = {
  citaId?: string;
  pacienteId?: string;
  fecha?: string;
  hora?: string;
  duracionMin?: number;
  notas?: string | null;
};

/** Alta y reprogramación de una cita. Al reprogramar el paciente no se cambia:
 *  mover una cita a otra persona es cancelarla y crear otra. */
export function CitaForm({
  pacientes,
  valores,
  nombrePaciente,
}: {
  pacientes: { id: string; nombre: string }[];
  valores?: Valores;
  /** Solo en reprogramación, para enseñar de quién es la cita. */
  nombrePaciente?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editando = Boolean(valores?.citaId);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // En éxito la action redirige al día de la cita y no retorna
      const r = editando ? await reprogramarCita(formData) : await crearCita(formData);
      if (r && !r.ok) setError(r.error);
    });
  }

  return (
    <form action={onSubmit} className="mt-6 flex flex-col gap-4">
      {editando && <input type="hidden" name="citaId" value={valores!.citaId} />}

      <Card className="flex flex-col gap-4 p-5">
        {editando ? (
          <Field label="Paciente">
            <p className="text-sm font-semibold text-text">{nombrePaciente}</p>
            <p className="mt-0.5 text-xs text-text-3">
              Para cambiar de paciente, cancela esta cita y crea una nueva.
            </p>
          </Field>
        ) : (
          <Field label="Paciente *" htmlFor="pacienteId">
            <Select id="pacienteId" name="pacienteId" required defaultValue={valores?.pacienteId ?? ""}>
              <option value="" disabled>
                Elige un paciente…
              </option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha *" htmlFor="fecha">
            <Input id="fecha" name="fecha" type="date" required defaultValue={valores?.fecha} />
          </Field>
          <Field label="Hora *" htmlFor="hora">
            <Input id="hora" name="hora" type="time" required defaultValue={valores?.hora ?? "09:00"} />
          </Field>
        </div>

        <Field label="Duración" htmlFor="duracionMin" hint="Horario de la Ciudad de México">
          <Select id="duracionMin" name="duracionMin" defaultValue={String(valores?.duracionMin ?? 60)}>
            {DURACIONES.map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Notas"
          htmlFor="notas"
          hint="Logística de la cita: motivo, si viene acompañado… No datos clínicos."
        >
          <Textarea id="notas" name="notas" rows={3} defaultValue={valores?.notas ?? ""} />
        </Field>
      </Card>

      {error && (
        <div className="rounded-ctl border border-danger-brd bg-danger-soft px-4 py-3 text-[13px] text-danger">
          {error}
        </div>
      )}

      <div className="flex gap-2.5">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : editando ? "Guardar cambios" : "Agendar cita"}
        </Button>
        <Link href="/agenda" className={buttonVariants({ variant: "secondary" })}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}
