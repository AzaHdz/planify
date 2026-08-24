"use client";

import { useEffect, useState, useTransition } from "react";
import {
  generarPlanAction,
  guardarPlanFinal,
  aprobarConsulta,
} from "@/app/actions/consultas";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export function GenerarPlanButton({
  consultaId,
  yaHayPlan,
}: {
  consultaId: string;
  yaHayPlan: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            try {
              const r = await generarPlanAction(consultaId);
              if (!r.ok) setError(r.error);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Error al generar el plan");
            }
          });
        }}
      >
        {pending
          ? "Generando plan…"
          : yaHayPlan
            ? "Regenerar plan con IA"
            : "Generar plan con IA"}
      </Button>
      {pending && (
        <p className="text-xs text-text-3">
          Esto puede tomar alrededor de un minuto. El plan es un borrador: revísalo antes de aprobar.
        </p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

export function PlanEditorJson({
  consultaId,
  planJson,
  label = "Editar plan (JSON)",
}: {
  consultaId: string;
  planJson: string;
  label?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [valor, setValor] = useState(planJson);
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  // Re-sincroniza con el plan vigente cuando cambia desde el editor visual.
  useEffect(() => setValor(planJson), [planJson]);

  return (
    <div className="rounded-card border border-border bg-surface">
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full rounded-card px-4 py-3 text-left text-sm font-medium text-text-2 transition-colors hover:bg-surface-3"
      >
        {abierto ? "▾" : "▸"} {label}
      </button>
      {abierto && (
        <div className="flex flex-col gap-2 border-t border-border p-4">
          <Textarea
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={18}
            spellCheck={false}
            className="font-mono text-xs"
          />
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => {
                setMensaje(null);
                startTransition(async () => {
                  try {
                    await guardarPlanFinal(consultaId, valor);
                    setMensaje("Guardado ✓ (la aprobación previa se invalidó)");
                  } catch (e) {
                    setMensaje(e instanceof Error ? e.message : "Error al guardar");
                  }
                });
              }}
            >
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
            {mensaje && <p className="text-sm text-text-2">{mensaje}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export function AprobarButton({
  consultaId,
  aprobado,
}: {
  consultaId: string;
  aprobado: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [advertencias, setAdvertencias] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (aprobado) {
    return (
      <div className="flex items-center gap-3">
        <Badge tone="success">✓ Plan aprobado</Badge>
        <a
          href={`/consultas/${consultaId}/imprimir`}
          target="_blank"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Exportar PDF
        </a>
      </div>
    );
  }

  const aprobar = (confirmar: boolean) => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await aprobarConsulta(consultaId, { confirmar });
        setAdvertencias(r.aprobado ? [] : r.advertencias);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Error al aprobar");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Button variant="secondary" disabled={pending} onClick={() => aprobar(false)}>
        {pending ? "Validando…" : "Aprobar plan"}
      </Button>
      {advertencias.length > 0 && (
        <div className="rounded-card border border-warning-brd bg-warning-soft p-3 text-sm text-warning">
          <p className="font-medium">El plan no se aprobó: la validación numérica encontró…</p>
          <ul className="mt-1 list-disc pl-5">
            {advertencias.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
          <p className="mt-2">Corrige el plan, o aprueba bajo tu criterio profesional:</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-2"
            disabled={pending}
            onClick={() => aprobar(true)}
          >
            Aprobar de todas formas
          </Button>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
