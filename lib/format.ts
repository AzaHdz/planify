/** Iniciales para avatares: primeras letras de las dos primeras palabras. */
export function initials(nombre?: string | null): string {
  if (!nombre) return "?";
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0] ?? "";
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] ?? "" : "";
  return (primera + segunda).toUpperCase();
}

/** Fecha corta es-MX: "02 jul 2026". */
export function fechaCorta(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Fecha larga es-MX: "viernes 17 de julio de 2026". */
export function fechaLarga(d: Date): string {
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
