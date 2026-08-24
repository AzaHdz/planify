import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { claveMes, inicioDelDia, parsearMes } from "@/lib/fechas";

/** Precios y límites por tier. Cambiar precio/límite = editar aquí, no la BD.
 *  `consultasMes: null` = sin límite. */
export const LIMITES_TIER: Record<
  PlanTier,
  { consultasMes: number | null; nombre: string; precioMXN: number }
> = {
  FREE: { consultasMes: 5, nombre: "Gratis", precioMXN: 0 },
  PRO: { consultasMes: 50, nombre: "Pro", precioMXN: 399 },
  ILIMITADO: { consultasMes: null, nombre: "Ilimitado", precioMXN: 799 },
};

/** Cada llamada a la IA cuesta tokens reales; sin tope, regenerar la misma
 *  consulta es gasto ilimitado. Pasado el tope, el plan se ajusta a mano. */
export const MAX_GENERACIONES_POR_CONSULTA = 3;

/** Inicio del mes calendario actual visto desde México — mismo criterio que el
 *  dashboard. En Vercel el proceso corre en UTC: calcularlo con la hora local
 *  del proceso correría el corte de cuota 6 h. */
export function inicioDeMes(): Date {
  const { anio, mes } = parsearMes();
  return inicioDelDia(`${claveMes(anio, mes)}-01`);
}

export async function consultasUsadasEsteMes(userId: string): Promise<number> {
  return prisma.consulta.count({
    where: { userId, createdAt: { gte: inicioDeMes() } },
  });
}
