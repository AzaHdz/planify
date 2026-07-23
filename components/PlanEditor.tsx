"use client";

import { useEffect, useRef, useState } from "react";
import type { PlanAlimenticio } from "@/lib/ai/planSchema";
import { PlanAlimenticio as PlanSchema } from "@/lib/ai/planSchema";
import { resumenPlan } from "@/lib/plan";
import { guardarPlanFinal } from "@/app/actions/consultas";
import { Card } from "@/components/ui/Card";
import { MacroBar } from "@/components/ui/MacroBar";
import { Input, Textarea } from "@/components/ui/Input";
import { PlanEditorJson } from "@/components/ConsultaAcciones";

type Estado = "idle" | "guardando" | "guardado" | "invalido" | "error";

const clonar = (p: PlanAlimenticio): PlanAlimenticio => JSON.parse(JSON.stringify(p));

/** Quita alimentos/recomendaciones vacíos y recorta strings antes de guardar/validar. */
function limpiar(p: PlanAlimenticio): PlanAlimenticio {
  return {
    ...p,
    comidas: p.comidas.map((c) => ({
      ...c,
      nombre: c.nombre.trim(),
      horarioSugerido: c.horarioSugerido.trim(),
      opciones: c.opciones.map((o) => ({
        ...o,
        descripcion: o.descripcion.trim(),
        alimentos: o.alimentos.map((a) => a.trim()).filter(Boolean),
      })),
    })),
    recomendacionesGenerales: p.recomendacionesGenerales.map((r) => r.trim()).filter(Boolean),
  };
}

/** Reemplaza NaN por 0 solo para el resumen en vivo (no se persiste). */
function numerico(p: PlanAlimenticio): PlanAlimenticio {
  const n = (x: number) => (Number.isFinite(x) ? x : 0);
  return {
    ...p,
    kcalObjetivoDiarias: n(p.kcalObjetivoDiarias),
    macros: {
      proteinas_g: n(p.macros.proteinas_g),
      carbohidratos_g: n(p.macros.carbohidratos_g),
      grasas_g: n(p.macros.grasas_g),
    },
    comidas: p.comidas.map((c) => ({
      ...c,
      opciones: c.opciones.map((o) => ({ ...o, kcalAprox: n(o.kcalAprox) })),
    })),
  };
}

export function PlanEditor({
  consultaId,
  plan: planInicial,
}: {
  consultaId: string;
  plan: PlanAlimenticio;
}) {
  const [plan, setPlan] = useState<PlanAlimenticio>(planInicial);
  const [estado, setEstado] = useState<Estado>("idle");
  const tocado = useRef(false);

  // Autoguardado con debounce
  useEffect(() => {
    if (!tocado.current) return;
    const limpio = limpiar(plan);
    const parsed = PlanSchema.safeParse(limpio);
    if (!parsed.success) {
      setEstado("invalido");
      return;
    }
    setEstado("guardando");
    const t = setTimeout(async () => {
      try {
        await guardarPlanFinal(consultaId, JSON.stringify(parsed.data));
        setEstado("guardado");
      } catch {
        setEstado("error");
      }
    }, 800);
    return () => clearTimeout(t);
  }, [plan, consultaId]);

  // Mutadores inmutables
  function editar(fn: (p: PlanAlimenticio) => void) {
    tocado.current = true;
    setPlan((prev) => {
      const copia = clonar(prev);
      fn(copia);
      return copia;
    });
  }

  const r = resumenPlan(numerico(plan));

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
      {/* Columna editable */}
      <div className="flex flex-col gap-4">
        <EstadoGuardado estado={estado} />

        {/* Ajustes del día */}
        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Ajustes del día</div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <NumberField label="Kcal objetivo" value={plan.kcalObjetivoDiarias} onChange={(v) => editar((p) => { p.kcalObjetivoDiarias = v; })} />
            <NumberField label="Proteínas (g)" value={plan.macros.proteinas_g} onChange={(v) => editar((p) => { p.macros.proteinas_g = v; })} />
            <NumberField label="Carbohidratos (g)" value={plan.macros.carbohidratos_g} onChange={(v) => editar((p) => { p.macros.carbohidratos_g = v; })} />
            <NumberField label="Grasas (g)" value={plan.macros.grasas_g} onChange={(v) => editar((p) => { p.macros.grasas_g = v; })} />
          </div>
        </Card>

        {/* Comidas */}
        {plan.comidas.map((comida, ci) => (
          <Card key={ci} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface-2 px-4 py-3">
              <input
                value={comida.nombre}
                onChange={(e) => editar((p) => { p.comidas[ci].nombre = e.target.value; })}
                placeholder="Nombre de la comida"
                className="min-w-0 flex-1 rounded-ctl border border-transparent bg-transparent px-1.5 py-1 font-display text-sm font-bold text-text hover:border-border focus:border-primary focus:bg-surface focus:outline-none"
              />
              <input
                value={comida.horarioSugerido}
                onChange={(e) => editar((p) => { p.comidas[ci].horarioSugerido = e.target.value; })}
                placeholder="Horario"
                className="w-28 rounded-ctl border border-transparent bg-transparent px-1.5 py-1 font-mono text-xs text-text-2 hover:border-border focus:border-primary focus:bg-surface focus:outline-none"
              />
              <BotonIcono label="Quitar comida" onClick={() => editar((p) => { p.comidas.splice(ci, 1); })} />
            </div>

            <div className="flex flex-col divide-y divide-border">
              {comida.opciones.map((op, oi) => (
                <div key={oi} className="flex flex-col gap-2 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-pill bg-surface-3 px-2 py-0.5 font-mono text-[10.5px] font-semibold text-text-2">
                      {String.fromCharCode(65 + oi)}
                    </span>
                    <input
                      value={op.descripcion}
                      onChange={(e) => editar((p) => { p.comidas[ci].opciones[oi].descripcion = e.target.value; })}
                      placeholder="Descripción del platillo"
                      className="min-w-0 flex-1 rounded-ctl border border-border-strong bg-surface px-2.5 py-1.5 text-[13px] font-semibold text-text focus:border-primary focus:outline-none"
                    />
                    <div className="w-24 shrink-0">
                      <NumberField
                        value={op.kcalAprox}
                        onChange={(v) => editar((p) => { p.comidas[ci].opciones[oi].kcalAprox = v; })}
                        suffix="kcal"
                        compact
                      />
                    </div>
                    <BotonIcono label="Quitar opción" onClick={() => editar((p) => { p.comidas[ci].opciones.splice(oi, 1); })} />
                  </div>
                  <Textarea
                    value={op.alimentos.join("\n")}
                    onChange={(e) => editar((p) => { p.comidas[ci].opciones[oi].alimentos = e.target.value.split("\n"); })}
                    rows={Math.max(2, op.alimentos.length)}
                    placeholder="Un alimento por línea, ej. 1 taza de arroz cocido"
                    className="text-[12.5px]"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => editar((p) => { p.comidas[ci].opciones.push({ descripcion: "", alimentos: [], kcalAprox: 0 }); })}
              className="w-full border-t border-border px-4 py-2.5 text-left text-[13px] font-semibold text-primary transition-colors hover:bg-primary-soft"
            >
              + Agregar opción
            </button>
          </Card>
        ))}

        <button
          onClick={() => editar((p) => { p.comidas.push({ nombre: "Nueva comida", horarioSugerido: "", opciones: [] }); })}
          className="rounded-card border border-dashed border-border-strong px-4 py-3 text-[13px] font-semibold text-text-2 transition-colors hover:bg-surface-3"
        >
          + Agregar comida
        </button>

        {/* Recomendaciones */}
        <Card className="p-5">
          <div className="mb-2.5 font-display text-[15px] font-bold text-text">Recomendaciones generales</div>
          <Textarea
            value={plan.recomendacionesGenerales.join("\n")}
            onChange={(e) => editar((p) => { p.recomendacionesGenerales = e.target.value.split("\n"); })}
            rows={Math.max(3, plan.recomendacionesGenerales.length)}
            placeholder="Una recomendación por línea"
            className="text-[13px]"
          />
        </Card>

        {/* JSON avanzado (reseeded con el plan vigente) */}
        <PlanEditorJson
          consultaId={consultaId}
          planJson={JSON.stringify(limpiar(plan), null, 2)}
          label="⚙ Editar JSON (avanzado)"
        />
      </div>

      {/* Resumen en vivo (sticky) */}
      <div className="lg:sticky lg:top-6">
        <Card className="p-5">
          <div className="mb-3.5 font-display text-[15px] font-bold text-text">Resumen en vivo</div>
          <div className="mb-4 flex items-baseline justify-between rounded-ctl bg-surface-2 px-3.5 py-2.5">
            <span className="text-[13px] text-text-2">
              <b className="font-mono tabular-nums text-text">{r.objetivo.toLocaleString("es-MX")}</b> kcal objetivo
            </span>
            <span className={`text-[13px] ${r.enObjetivo ? "text-success" : "text-warning"}`}>
              <b className="font-mono tabular-nums">{r.kcalPlan.toLocaleString("es-MX")}</b> kcal plan {r.enObjetivo ? "✓" : "⚠"}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <MacroBar label="Proteína" gramos={r.macros.proteina.gramos} pct={r.macros.proteina.pct} tone="primary" />
            <MacroBar label="Carbohidratos" gramos={r.macros.carbo.gramos} pct={r.macros.carbo.pct} tone="accent" />
            <MacroBar label="Grasas" gramos={r.macros.grasa.gramos} pct={r.macros.grasa.pct} tone="info" />
          </div>

          <Hints plan={plan} enObjetivo={r.enObjetivo} desvio={r.desvio} />
        </Card>
      </div>
    </div>
  );
}

function EstadoGuardado({ estado }: { estado: Estado }) {
  const map: Record<Estado, { text: string; cls: string } | null> = {
    idle: null,
    guardando: { text: "Guardando…", cls: "text-text-3" },
    guardado: { text: "Guardado ✓ · la aprobación previa se reinició", cls: "text-success" },
    invalido: { text: "Revisa los campos marcados antes de guardar", cls: "text-warning" },
    error: { text: "No se pudo guardar. Reintentando al siguiente cambio.", cls: "text-danger" },
  };
  const s = map[estado];
  return <div className="h-4 text-xs">{s && <span className={s.cls}>{s.text}</span>}</div>;
}

/** Avisos suaves, no bloqueantes. */
function Hints({ plan, enObjetivo, desvio }: { plan: PlanAlimenticio; enObjetivo: boolean; desvio: number }) {
  const avisos: string[] = [];
  if (!enObjetivo) {
    avisos.push(`Las kcal del plan se desvían ${Math.round(desvio * 100)}% del objetivo (ideal ≤10%).`);
  }
  const pocasOpciones = plan.comidas.filter((c) => c.opciones.length < 2).length;
  if (pocasOpciones > 0) {
    avisos.push(`${pocasOpciones} comida(s) con menos de 2 opciones intercambiables.`);
  }
  if (avisos.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-1.5 border-t border-dashed border-border pt-3.5">
      {avisos.map((a, i) => (
        <div key={i} className="flex items-start gap-2 text-[12.5px] text-text-2">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning" />
          {a}
        </div>
      ))}
    </div>
  );
}

/** Campo numérico que permite vaciarse (queda marcado como inválido). */
function NumberField({
  label,
  value,
  onChange,
  suffix,
  compact,
}: {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  compact?: boolean;
}) {
  const [str, setStr] = useState(Number.isFinite(value) ? String(value) : "");
  const invalido = str.trim() === "" || Number.isNaN(Number(str));

  // Refleja cambios externos (p. ej. reset desde JSON avanzado)
  useEffect(() => {
    if (Number.isFinite(value) && Number(str) !== value) setStr(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-text-2">{label}</span>}
      <span className="relative flex items-center">
        <input
          type="number"
          inputMode="decimal"
          value={str}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            setStr(e.target.value);
            onChange(e.target.value.trim() === "" ? NaN : Number(e.target.value));
          }}
          className={`w-full rounded-ctl border bg-surface px-2.5 font-mono text-sm tabular-nums text-text focus:outline-none ${
            compact ? "py-1.5 text-[13px]" : "py-2"
          } ${invalido ? "border-danger" : "border-border-strong focus:border-primary"} ${suffix ? "pr-10" : ""}`}
        />
        {suffix && <span className="pointer-events-none absolute right-2.5 text-[11px] text-text-3">{suffix}</span>}
      </span>
    </label>
  );
}

function BotonIcono({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-pill text-text-3 transition-colors hover:bg-danger-soft hover:text-danger"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    </button>
  );
}
