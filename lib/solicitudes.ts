import type { EstadoSolicitud } from "@prisma/client";
import type { Tone } from "@/components/ui/Badge";

// Estados en orden de ciclo de vida (se usa para selects y filtros)
export const ESTADOS_SOLICITUD: EstadoSolicitud[] = [
  "NUEVA",
  "EN_REVISION",
  "APROBADA",
  "RECHAZADA",
  "IMPLEMENTADA",
];

// Estados que cuentan como "pendientes de revisión" para el tope anti-spam
export const ESTADOS_ABIERTOS: EstadoSolicitud[] = ["NUEVA", "EN_REVISION"];
export const MAX_SOLICITUDES_ABIERTAS = 10;

export const SOLICITUD_LABELS: Record<EstadoSolicitud, string> = {
  NUEVA: "Nueva",
  EN_REVISION: "En revisión",
  APROBADA: "Aprobada",
  RECHAZADA: "Rechazada",
  IMPLEMENTADA: "Implementada",
};

export const SOLICITUD_TONES: Record<EstadoSolicitud, Tone> = {
  NUEVA: "info",
  EN_REVISION: "warning",
  APROBADA: "success",
  RECHAZADA: "danger",
  IMPLEMENTADA: "primary",
};

// Veredictos del análisis de viabilidad con IA.
// Mantener en sincronía con scripts/analizar-solicitudes.mjs (no puede importar TS).
export const VEREDICTOS_IA = ["VIABLE", "NO_VIABLE", "REQUIERE_DISENO"] as const;
export type VeredictoIA = (typeof VEREDICTOS_IA)[number];

export const VEREDICTO_LABELS: Record<VeredictoIA, string> = {
  VIABLE: "Viable",
  NO_VIABLE: "No viable",
  REQUIERE_DISENO: "Requiere diseño",
};

export const VEREDICTO_TONES: Record<VeredictoIA, Tone> = {
  VIABLE: "success",
  NO_VIABLE: "danger",
  REQUIERE_DISENO: "warning",
};
