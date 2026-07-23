"use client";

import { useState, useTransition } from "react";
import { crearConsulta } from "@/app/actions/consultas";
import { imc, tmbMifflin, FACTORES_ACTIVIDAD, clasificacionIMC } from "@/lib/calculos";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Genero = "FEMENINO" | "MASCULINO" | "OTRO";

/** Formulario de nueva consulta con cálculo en vivo de IMC y GET. */
export function ConsultaForm({
  pacienteId,
  edad,
  genero,
}: {
  pacienteId: string;
  edad: number;
  genero: Genero;
}) {
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // En éxito la action redirige a la consulta creada y no retorna
      const r = await crearConsulta(formData);
      if (r && !r.ok) setError(r.error);
    });
  }

  const p = parseFloat(peso);
  const a = parseFloat(altura);
  const hayBase = p > 0 && a > 0;
  const valorIMC = hayBase ? imc(p, a) : null;
  const claseIMC = valorIMC != null ? clasificacionIMC(valorIMC) : null;
  const get = hayBase
    ? Math.round(tmbMifflin({ pesoKg: p, alturaCm: a, edad, genero }) * FACTORES_ACTIVIDAD.sedentario)
    : null;

  const rangoText = { in: "text-range-in", out: "text-range-out", critical: "text-range-critical" } as const;

  return (
    <form action={onSubmit} className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
      <input type="hidden" name="pacienteId" value={pacienteId} />

      {/* Columna izquierda */}
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="mb-3.5 flex items-baseline justify-between">
            <span className="font-display text-[15px] font-bold text-text">Antropometría</span>
            <span className="text-[11.5px] text-text-3">Los cálculos se actualizan al escribir</span>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="Peso (kg) *" htmlFor="peso">
              <Input id="peso" name="peso" type="number" step="0.1" min="1" required value={peso} onChange={(e) => setPeso(e.target.value)} />
            </Field>
            <Field label="Altura (cm) *" htmlFor="altura">
              <Input id="altura" name="altura" type="number" step="0.5" min="1" required value={altura} onChange={(e) => setAltura(e.target.value)} />
            </Field>
            <Field label="% grasa" htmlFor="grasaCorporal">
              <Input id="grasaCorporal" name="grasaCorporal" type="number" step="0.1" />
            </Field>
            <Field label="Cintura (cm)" htmlFor="cintura">
              <Input id="cintura" name="cintura" type="number" step="0.5" />
            </Field>
            <Field label="Cadera (cm)" htmlFor="cadera">
              <Input id="cadera" name="cadera" type="number" step="0.5" />
            </Field>
            <Field label="Brazo (cm)" htmlFor="brazo">
              <Input id="brazo" name="brazo" type="number" step="0.5" />
            </Field>
          </div>

          {/* Tira "Calculado" */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-ctl bg-surface-2 px-4 py-2.5 text-[13px]">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-3">Calculado</span>
            <span className="text-text-2">
              IMC{" "}
              <b className={`font-mono tabular-nums ${claseIMC ? rangoText[claseIMC.rango] : "text-text"}`}>
                {valorIMC != null ? valorIMC.toFixed(1) : "—"}
              </b>
              {claseIMC && <span className="ml-1 text-text-3">{claseIMC.etiqueta}</span>}
            </span>
            <span className="text-text-2">
              GET <b className="font-mono tabular-nums text-text">{get != null ? get.toLocaleString("es-MX") : "—"}</b>
              <span className="ml-1 text-text-3">kcal</span>
            </span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Objetivo y notas</div>
          <Field label="Objetivo del plan *" htmlFor="objetivos">
            <Textarea
              id="objetivos"
              name="objetivos"
              rows={2}
              required
              placeholder="Ej. pérdida de grasa gradual, mejorar energía"
            />
          </Field>
        </Card>
      </div>

      {/* Columna derecha */}
      <div className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Restricciones para la IA</div>
          <Field
            label="Alergias, intolerancias y preferencias"
            htmlFor="restricciones"
            hint="Sepáralas con comas. Ej: alergia a nuez, intolerancia a lactosa, no come res"
          >
            <Textarea
              id="restricciones"
              name="restricciones"
              rows={4}
              placeholder="Ej. intolerancia a la lactosa, no come cerdo"
            />
          </Field>
          <div className="mt-4 rounded-ctl border border-primary-soft-brd bg-primary-soft p-3 text-[12.5px] text-text-2">
            <b className="text-primary">✦ La IA usará este contexto.</b> El plan saldrá en borrador:
            nada llega al paciente sin tu aprobación.
          </div>
        </Card>

        {error && (
          <div className="rounded-ctl border border-danger-brd bg-danger-soft px-4 py-3 text-[13px] text-danger">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar consulta"}
          </Button>
        </div>
      </div>
    </form>
  );
}
