"use client";

import { useMemo, useState } from "react";

export type PuntoSerie = { t: number; fecha: string; valor: number };
export type SerieMetrica = {
  key: string;
  label: string;
  unidad: string;
  puntos: PuntoSerie[];
};

/** Una cifra clínica: una decimal, sin el ".0" sobrante (92.0 → 92). */
function fmt(v: number): string {
  return v.toFixed(1).replace(/\.0$/, "");
}

/** Gráfica de evolución del paciente, una métrica a la vez.
 *
 *  El SVG usa viewBox 0-100 en ambos ejes con preserveAspectRatio="none": así una
 *  coordenada (25, 40) cae exactamente en left:25% / top:40% del contenedor, y los
 *  marcadores, el crosshair y el tooltip pueden ser HTML posicionado por porcentaje
 *  —círculos que no se deforman y texto a tamaño real— sin medir el ancho.
 *  La línea lleva vector-effect para que el grosor no se estire con el contenedor. */
export function ProgresoChart({ series }: { series: SerieMetrica[] }) {
  const [metrica, setMetrica] = useState(series[0]?.key ?? "");
  const [activo, setActivo] = useState<number | null>(null);

  const serie = series.find((s) => s.key === metrica) ?? series[0];
  // Memoizado: `?? []` crearía un array nuevo en cada render y anularía el useMemo de geo.
  const puntos = useMemo(() => serie?.puntos ?? [], [serie]);

  const geo = useMemo(() => {
    if (puntos.length < 2) return null;

    const ts = puntos.map((p) => p.t);
    const vs = puntos.map((p) => p.valor);
    const tMin = Math.min(...ts);
    const tSpan = Math.max(...ts) - tMin || 1;

    // Dominio Y con holgura para que la línea no roce los bordes. Si todas las
    // medidas son iguales, se abre un margen artificial y la línea queda centrada
    // en vez de pegada arriba.
    const vMin = Math.min(...vs);
    const vMax = Math.max(...vs);
    const bruto = vMax - vMin;
    const holgura = bruto === 0 ? Math.abs(vMin) * 0.05 || 1 : bruto * 0.12;
    const dMin = vMin - holgura;
    const dSpan = vMax + holgura - dMin;

    // Margen horizontal para que los marcadores de los extremos no se corten.
    const padX = 3;
    const x = (t: number) => padX + ((t - tMin) / tSpan) * (100 - padX * 2);
    const y = (v: number) => (1 - (v - dMin) / dSpan) * 100;

    const coords = puntos.map((p) => ({ x: x(p.t), y: y(p.valor) }));

    // Marcas del eje Y con valores reales de la serie, no del dominio con holgura.
    const marcas =
      bruto === 0
        ? [{ v: vMin, y: y(vMin) }]
        : [vMax, (vMin + vMax) / 2, vMin].map((v) => ({ v, y: y(v) }));

    return { coords, marcas };
  }, [puntos]);

  if (series.length === 0) return null;

  // Ninguna métrica llega a dos puntos ⇒ el paciente tiene una sola consulta.
  const maxPuntos = Math.max(...series.map((s) => s.puntos.length));
  if (maxPuntos < 2) {
    return (
      <p className="mt-3 text-sm text-text-3">
        Se necesita al menos una consulta más para graficar la evolución.
      </p>
    );
  }

  const ultimo = puntos[puntos.length - 1];
  const previo = puntos[puntos.length - 2];
  const cambio = puntos.length >= 2 ? ultimo.valor - previo.valor : null;

  function mover(delta: number) {
    if (!geo) return;
    setActivo((i) => {
      const base = i ?? puntos.length - 1;
      return Math.min(puntos.length - 1, Math.max(0, base + delta));
    });
  }

  function alApuntar(e: React.PointerEvent<HTMLDivElement>) {
    if (!geo) return;
    const caja = e.currentTarget.getBoundingClientRect();
    const pct = ((e.clientX - caja.left) / caja.width) * 100;
    let cerca = 0;
    let dist = Infinity;
    geo.coords.forEach((c, i) => {
      const d = Math.abs(c.x - pct);
      if (d < dist) {
        dist = d;
        cerca = i;
      }
    });
    setActivo(cerca);
  }

  const resumen = geo
    ? `${serie.label}: ${puntos.length} registros del ${puntos[0].fecha} al ${ultimo.fecha}, de ${fmt(puntos[0].valor)} a ${fmt(ultimo.valor)} ${serie.unidad}`.trim()
    : "";

  return (
    <div className="mt-3">
      {/* Selector de métrica */}
      <div className="flex flex-wrap gap-1.5">
        {series.map((s) => {
          const activa = s.key === serie.key;
          const sinDatos = s.puntos.length < 2;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => {
                setMetrica(s.key);
                setActivo(null);
              }}
              aria-pressed={activa}
              className={`rounded-pill border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                activa
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border-strong bg-surface text-text-2 hover:bg-surface-3 hover:text-text"
              } ${sinDatos && !activa ? "opacity-50" : ""}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Tendencia contra la consulta anterior. Sin color: si bajar es bueno o malo
          depende del objetivo del paciente, no de la métrica. */}
      {cambio != null && (
        <p className="mt-3 text-[13px] text-text-2">
          <span className="font-mono font-semibold tabular-nums text-text">
            {Math.abs(cambio) < 0.05
              ? "Sin cambio"
              : `${cambio > 0 ? "↑" : "↓"} ${fmt(Math.abs(cambio))}${serie.unidad ? ` ${serie.unidad}` : ""}`}
          </span>{" "}
          vs. consulta anterior
        </p>
      )}

      {!geo ? (
        <p className="mt-3 text-sm text-text-3">
          Aún no hay suficientes registros de {serie.label.toLowerCase()} para graficar.
        </p>
      ) : (
        <div className="mt-3 flex items-start gap-2">
          {/* Eje Y. `items-start` + la misma altura que el área de gráfica: si se
              estirara con el flex, el `top: %` se calcularía sobre una caja más alta
              y las cifras se despegarían de sus gridlines. */}
          <div className="relative h-40 w-9 shrink-0">
            {geo.marcas.map((m) => (
              <span
                key={m.v}
                className="absolute right-0 -translate-y-1/2 font-mono text-[10px] tabular-nums text-text-3"
                style={{ top: `${m.y}%` }}
              >
                {fmt(m.v)}
              </span>
            ))}
          </div>

          <div className="min-w-0 flex-1">
            <div
              role="img"
              aria-label={resumen}
              tabIndex={0}
              onPointerMove={alApuntar}
              onPointerLeave={() => setActivo(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  mover(1);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  mover(-1);
                } else if (e.key === "Home") {
                  e.preventDefault();
                  setActivo(0);
                } else if (e.key === "End") {
                  e.preventDefault();
                  setActivo(puntos.length - 1);
                } else if (e.key === "Escape") {
                  setActivo(null);
                }
              }}
              className="relative h-40 rounded-ctl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden
                className="absolute inset-0 h-full w-full"
              >
                {geo.marcas.map((m) => (
                  <line
                    key={m.v}
                    x1={0}
                    y1={m.y}
                    x2={100}
                    y2={m.y}
                    className="stroke-border"
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                ))}
                <polyline
                  points={geo.coords.map((c) => `${c.x},${c.y}`).join(" ")}
                  fill="none"
                  className="stroke-primary"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {/* Crosshair del punto bajo el cursor */}
              {activo != null && (
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 w-px bg-border-strong"
                  style={{ left: `${geo.coords[activo].x}%` }}
                />
              )}

              {/* Marcadores. El último punto se distingue por tamaño y anillo además
                  de por color: en modo oscuro primary y accent quedan cerca. */}
              {geo.coords.map((c, i) => {
                const esUltimo = i === geo.coords.length - 1;
                const esActivo = i === activo;
                return (
                  <span
                    key={i}
                    aria-hidden
                    className={`pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-pill ${
                      esUltimo ? "size-[11px] bg-accent" : "size-2 bg-primary"
                    } ${esUltimo || esActivo ? "ring-2 ring-surface" : ""} ${
                      esActivo ? "scale-125" : ""
                    }`}
                    style={{ left: `${c.x}%`, top: `${c.y}%` }}
                  />
                );
              })}

              {/* Tooltip. La x se acota para que no se salga de la card; el marcador
                  sigue en su posición real. */}
              {activo != null && (
                <div
                  className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-ctl border border-border bg-surface px-2 py-1 shadow-md"
                  style={{
                    left: `${Math.min(85, Math.max(15, geo.coords[activo].x))}%`,
                    top: `${geo.coords[activo].y}%`,
                    marginTop: "-0.65rem",
                  }}
                >
                  <div className="whitespace-nowrap text-[10.5px] text-text-3">
                    {puntos[activo].fecha}
                  </div>
                  <div className="whitespace-nowrap font-mono text-[13px] font-semibold tabular-nums text-text">
                    {fmt(puntos[activo].valor)}
                    {serie.unidad && (
                      <span className="ml-0.5 text-[11px] font-normal text-text-3">
                        {serie.unidad}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Eje X: extremos del rango. El detalle por punto lo da el tooltip. */}
            <div
              className="mt-1.5 flex justify-between font-mono text-[10.5px] tabular-nums text-text-3"
              style={{ paddingLeft: "3%", paddingRight: "3%" }}
            >
              <span>{puntos[0].fecha}</span>
              <span>{ultimo.fecha}</span>
            </div>
          </div>
        </div>
      )}

      {/* Lectura del punto activo para lectores de pantalla al navegar con teclado */}
      <span className="sr-only" aria-live="polite">
        {activo != null
          ? `${puntos[activo].fecha}: ${fmt(puntos[activo].valor)} ${serie.unidad}`.trim()
          : ""}
      </span>
    </div>
  );
}
