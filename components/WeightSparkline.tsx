/** Line chart SVG de la evolución de peso — sin librerías, server component.
 *  Recibe puntos ya ordenados cronológicamente (más antiguo → más reciente). */
export function WeightSparkline({
  puntos,
  className,
}: {
  puntos: { peso: number; etiqueta: string }[];
  className?: string;
}) {
  if (puntos.length < 2) {
    return (
      <p className={`text-sm text-text-3 ${className ?? ""}`}>
        Se necesitan al menos dos consultas para graficar la evolución.
      </p>
    );
  }

  const W = 640;
  const H = 150;
  const padY = 20;
  const pesos = puntos.map((p) => p.peso);
  const min = Math.min(...pesos);
  const max = Math.max(...pesos);
  const span = max - min || 1;

  const coords = puntos.map((p, i) => {
    const x = (i / (puntos.length - 1)) * (W - 40) + 20;
    const y = padY + (1 - (p.peso - min) / span) * (H - padY * 2);
    return { x, y };
  });

  const linea = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const ultimo = coords[coords.length - 1];

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        className="text-primary"
      >
        {[0.5, 1.5, 2.5].map((m, i) => (
          <line
            key={i}
            x1={0}
            y1={(H / 3) * (i + 0.5)}
            x2={W}
            y2={(H / 3) * (i + 0.5)}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}
        <polyline
          points={linea}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={i === coords.length - 1 ? 5 : 4}
            className={i === coords.length - 1 ? "fill-accent" : "fill-primary"}
          />
        ))}
        {/* punto final resaltado */}
        <circle cx={ultimo.x} cy={ultimo.y} r={5} className="fill-accent" />
      </svg>
      <div className="mt-1 flex justify-between px-1 font-mono text-[10.5px] tabular-nums text-text-3">
        {puntos.map((p, i) => (
          <span key={i} className={i === puntos.length - 1 ? "font-semibold text-accent" : undefined}>
            {p.peso}
          </span>
        ))}
      </div>
    </div>
  );
}
