import { crearPaciente } from "@/app/actions/pacientes";
import { Field } from "@/components/ui/Field";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function NuevoPacientePage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Nuevo paciente</h1>

      <form action={crearPaciente} className="mt-6 flex flex-col gap-4">
        <Field label="Nombre completo *" htmlFor="nombre">
          <Input id="nombre" name="nombre" required />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Fecha de nacimiento *" htmlFor="fechaNacimiento">
            <Input id="fechaNacimiento" name="fechaNacimiento" type="date" required />
          </Field>
          <Field label="Género *" htmlFor="genero">
            <Select id="genero" name="genero" required>
              <option value="FEMENINO">Femenino</option>
              <option value="MASCULINO">Masculino</option>
              <option value="OTRO">Otro</option>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" />
          </Field>
          <Field label="Teléfono" htmlFor="telefono">
            <Input id="telefono" name="telefono" />
          </Field>
        </div>

        <Field label="Notas" htmlFor="notas">
          <Textarea id="notas" name="notas" rows={3} />
        </Field>

        <label className="flex items-start gap-2 rounded-ctl bg-surface-3 p-3 text-sm text-text-2">
          <input type="checkbox" name="consentimiento" value="true" required className="mt-0.5 accent-primary" />
          <span>
            El paciente otorgó su consentimiento para el tratamiento de sus
            datos personales y de salud conforme al aviso de privacidad. *
          </span>
        </label>

        <Button type="submit" className="self-start">
          Guardar paciente
        </Button>
      </form>
    </div>
  );
}
