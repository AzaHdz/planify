import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

/** Inicio del mes calendario actual — mismo criterio que el dashboard. */
export function inicioDeMes(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function consultasUsadasEsteMes(userId: string): Promise<number> {
  return prisma.consulta.count({
    where: { userId, createdAt: { gte: inicioDeMes() } },
  });
}
