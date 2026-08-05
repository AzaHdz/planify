/** Fechas de la agenda, siempre en horario de México.
 *
 *  La app se despliega en Vercel, donde el servidor corre en UTC. Si se formatea
 *  un `Date` sin fijar zona, una cita de las 21:00 se dibuja en el día siguiente.
 *  Todo lo que toque citas pasa por aquí; `lib/format.ts` sigue sirviendo para el
 *  resto de la app, que no depende de la hora.
 *
 *  En la BD `inicioAt` siempre es un instante UTC. La zona solo se aplica al
 *  interpretar lo que el nutriólogo escribe y al pintarlo. */

export const ZONA = "America/Mexico_City";

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Descompone un instante en los valores de calendario que se ven en México. */
function partesEnZona(d: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(d);

  const v = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  // `hour12: false` puede devolver 24 en lugar de 0 para la medianoche.
  const hora = v("hour") % 24;
  return { anio: v("year"), mes: v("month"), dia: v("day"), hora, minuto: v("minute"), segundo: v("second") };
}

/** Minutos que la zona va por delante de UTC en ese instante (México: −360). */
function desfaseMin(instante: Date): number {
  const p = partesEnZona(instante);
  const comoSiFueraUtc = Date.UTC(p.anio, p.mes - 1, p.dia, p.hora, p.minuto, p.segundo);
  return (comoSiFueraUtc - instante.getTime()) / 60_000;
}

/** "2026-08-10" + "21:00" entendidos como hora de México → el instante UTC a guardar.
 *
 *  México abolió el horario de verano en 2022, así que hoy el desfase es fijo; aun
 *  así se calcula sobre el instante concreto para no depender de ese dato. */
export function aUtc(fechaISO: string, horaHHmm: string): Date {
  const [anio, mes, dia] = fechaISO.split("-").map(Number);
  const [hora, minuto] = horaHHmm.split(":").map(Number);
  const tentativo = Date.UTC(anio, mes - 1, dia, hora, minuto);
  return new Date(tentativo - desfaseMin(new Date(tentativo)) * 60_000);
}

/** Día de calendario al que pertenece el instante en México: "2026-08-10".
 *  Es la clave con la que se agrupan las citas en las celdas de la rejilla. */
export function claveDia(d: Date): string {
  const p = partesEnZona(d);
  return `${p.anio}-${dosDigitos(p.mes)}-${dosDigitos(p.dia)}`;
}

/** Primer instante (UTC) del día de calendario indicado. */
export function inicioDelDia(clave: string): Date {
  return aUtc(clave, "00:00");
}

/** Instante en que termina el día: el arranque del siguiente. Para consultar rangos
 *  con `{ gte: inicioDelDia(a), lt: finDelDia(b) }` sin dejar fuera la última noche. */
export function finDelDia(clave: string): Date {
  return aUtc(clave, "24:00"); // Date.UTC normaliza la hora 24 al día siguiente
}

export function hoyClave(): string {
  return claveDia(new Date());
}

/** Hora a la que acaba una cita, ya en zona: "10:00". */
export function horaFinEnZona(inicioAt: Date, duracionMin: number): string {
  return horaEnZona(new Date(inicioAt.getTime() + duracionMin * 60_000));
}

/** "21:00" */
export function horaEnZona(d: Date): string {
  const p = partesEnZona(d);
  return `${dosDigitos(p.hora)}:${dosDigitos(p.minuto)}`;
}

/** "lun 10 ago, 21:00" */
export function fechaHoraEnZona(d: Date): string {
  const etiqueta = new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
  return `${etiqueta}, ${horaEnZona(d)}`;
}

/** "lunes 10 de agosto de 2026" — para el mensaje de recordatorio.
 *  Se le quita la coma que es-MX pone tras el día de la semana: dentro de una
 *  frase corrida ("tu cita el lunes, 10 de agosto") queda raro. */
export function fechaLargaEnZona(d: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: ZONA,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(d)
    .replace(",", "");
}

/** "agosto 2026" — encabezado de la rejilla. Los valores son de calendario puro,
 *  ya construidos en UTC, así que se formatean en UTC para que no se corran. */
export function nombreDelMes(anio: number, mes: number): string {
  return new Intl.DateTimeFormat("es-MX", { timeZone: "UTC", month: "long", year: "numeric" }).format(
    new Date(Date.UTC(anio, mes - 1, 1))
  );
}

export type CeldaDia = { clave: string; dia: number; delMes: boolean };

/** Las 6 semanas de la rejilla, de lunes a domingo, incluyendo los días de relleno
 *  del mes anterior y del siguiente. Es aritmética de calendario pura (todo en UTC),
 *  independiente de la zona: un 10 de agosto es el 10 de agosto. */
export function rejillaDelMes(anio: number, mes: number): CeldaDia[] {
  const primero = new Date(Date.UTC(anio, mes - 1, 1));
  const desplazamiento = (primero.getUTCDay() + 6) % 7; // getUTCDay: 0 = domingo → 0 = lunes

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(Date.UTC(anio, mes - 1, 1 - desplazamiento + i));
    return {
      clave: `${d.getUTCFullYear()}-${dosDigitos(d.getUTCMonth() + 1)}-${dosDigitos(d.getUTCDate())}`,
      dia: d.getUTCDate(),
      delMes: d.getUTCFullYear() === anio && d.getUTCMonth() === mes - 1,
    };
  });
}

export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

/** Mes anterior y siguiente, para los enlaces ‹ › del encabezado. */
export function mesVecino(anio: number, mes: number, delta: number): { anio: number; mes: number } {
  const d = new Date(Date.UTC(anio, mes - 1 + delta, 1));
  return { anio: d.getUTCFullYear(), mes: d.getUTCMonth() + 1 };
}

/** "2026-08" → { anio, mes }. Devuelve el mes actual si el valor no es válido. */
export function parsearMes(valor?: string): { anio: number; mes: number } {
  const m = valor?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const anio = Number(m[1]);
    const mes = Number(m[2]);
    if (mes >= 1 && mes <= 12) return { anio, mes };
  }
  const p = partesEnZona(new Date());
  return { anio: p.anio, mes: p.mes };
}

export function claveMes(anio: number, mes: number): string {
  return `${anio}-${dosDigitos(mes)}`;
}
