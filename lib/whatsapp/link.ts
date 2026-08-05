/** Enlaces wa.me para recordatorios de cita.
 *
 *  Sin API ni claves: `wa.me` solo abre WhatsApp con el mensaje ya escrito y el
 *  nutriólogo pulsa enviar. El envío automático (WhatsApp Cloud API) es otra fase.
 *
 *  El teléfono del paciente se captura como texto libre y nunca se validó, así que
 *  aquí se normaliza a E.164 con la tolerancia necesaria para lo que la gente
 *  escribe de verdad. */

import { fechaLargaEnZona, horaEnZona } from "@/lib/fechas";

/** Texto libre → E.164 mexicano sin el `+` (`525512345678`), o null si no se puede.
 *
 *  Acepta "55 1234 5678", "(55) 1234-5678", "+52 55 1234 5678" y el viejo formato
 *  de WhatsApp con el 1 tras el 52 ("52 1 55 ..."), que hoy ya no se usa pero
 *  sigue guardado en muchas agendas. */
export function normalizarTelefonoMX(raw?: string | null): string | null {
  if (!raw) return null;

  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2); // prefijo internacional a la antigua

  if (d.length === 10) return `52${d}`; // número nacional
  if (d.length === 12 && d.startsWith("52")) return d;
  if (d.length === 13 && d.startsWith("521")) return `52${d.slice(3)}`;

  return null;
}

export function enlaceWhatsApp(e164: string, mensaje: string): string {
  return `https://wa.me/${e164}?text=${encodeURIComponent(mensaje)}`;
}

/** Primer nombre, para que el saludo no suene a oficio. */
function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? nombre;
}

/** Mensaje de recordatorio.
 *
 *  IMPORTANTE: no debe llevar ningún dato clínico. Solo nombre, cuándo y con quién.
 *  El paciente lo recibe en un canal que no controlamos y que puede leer cualquiera
 *  con acceso a su teléfono. */
export function mensajeRecordatorio({
  paciente,
  nutriologo,
  inicioAt,
}: {
  paciente: string;
  nutriologo?: string | null;
  inicioAt: Date;
}): string {
  const con = nutriologo?.trim() ? ` con ${nutriologo.trim()}` : "";
  return (
    `Hola ${primerNombre(paciente)}, te recuerdo tu cita${con} el ` +
    `${fechaLargaEnZona(inicioAt)} a las ${horaEnZona(inicioAt)}. ` +
    `Si necesitas cambiarla, contéstame por aquí. ¡Nos vemos!`
  );
}
