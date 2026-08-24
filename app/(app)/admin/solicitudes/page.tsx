import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { LIMITES_TIER } from "@/lib/limits";
import {
  ESTADOS_SOLICITUD,
  SOLICITUD_LABELS,
  SOLICITUD_TONES,
  VEREDICTO_LABELS,
  VEREDICTO_TONES,
  type VeredictoIA,
} from "@/lib/solicitudes";
import { fechaCorta } from "@/lib/format";
import { actualizarSolicitudAdmin } from "@/app/actions/solicitudes";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";

export default async function SolicitudesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const filtro = ESTADOS_SOLICITUD.find((e) => e === estado);

  const where: Prisma.SolicitudWhereInput = filtro ? { estado: filtro } : {};
  const solicitudes = await prisma.solicitud.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, email: true, tier: true } } },
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
          ← Administración
        </Link>
        <h1 className="mt-3 font-display text-[26px] font-bold tracking-tight text-text">
          Solicitudes de funcionalidades
        </h1>
        <p className="mt-1 text-sm text-text-3">
          Sugerencias enviadas por los nutriólogos. La respuesta que escribas aquí es
          visible para quien la envió.
        </p>
      </div>

      {/* Filtro por estado */}
      <div className="flex flex-wrap gap-2">
        <FiltroPill href="/admin/solicitudes" activo={!filtro}>
          Todas
        </FiltroPill>
        {ESTADOS_SOLICITUD.map((e) => (
          <FiltroPill key={e} href={`/admin/solicitudes?estado=${e}`} activo={filtro === e}>
            {SOLICITUD_LABELS[e]}
          </FiltroPill>
        ))}
      </div>

      {solicitudes.length === 0 ? (
        <Card>
          <p className="px-5 py-8 text-center text-sm text-text-3">
            {filtro
              ? `No hay solicitudes en estado ${SOLICITUD_LABELS[filtro].toLowerCase()}.`
              : "Aún no hay solicitudes."}
          </p>
        </Card>
      ) : (
        solicitudes.map((s) => (
          <Card key={s.id} className="p-4.5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-sm font-bold text-text">{s.titulo}</span>
                  <Badge tone={SOLICITUD_TONES[s.estado]}>{SOLICITUD_LABELS[s.estado]}</Badge>
                  {s.analizadoAt && s.veredictoIA && (
                    <Badge tone={VEREDICTO_TONES[s.veredictoIA as VeredictoIA] ?? "neutral"}>
                      IA: {VEREDICTO_LABELS[s.veredictoIA as VeredictoIA] ?? s.veredictoIA}
                    </Badge>
                  )}
                </div>
                <Link
                  href={`/admin/cuentas/${s.user.id}`}
                  className="mt-1.5 flex items-center gap-2 hover:underline"
                >
                  <Avatar nombre={s.user.name ?? s.user.email} size="sm" />
                  <span className="truncate text-[12.5px] text-text-2">
                    {s.user.name ?? "Sin nombre"} · {s.user.email} ·{" "}
                    {LIMITES_TIER[s.user.tier].nombre}
                  </span>
                </Link>
              </div>
              <span className="text-[11.5px] text-text-3">{fechaCorta(s.createdAt)}</span>
            </div>

            <p className="mt-2.5 whitespace-pre-wrap text-[13px] text-text-2">{s.descripcion}</p>

            {s.analisisIA && (
              <details className="mt-3 rounded-ctl border border-border bg-surface-2 px-3.5 py-2.5">
                <summary className="cursor-pointer text-xs font-bold text-text-2">
                  Análisis de viabilidad (IA)
                  {s.analizadoAt && ` · ${fechaCorta(s.analizadoAt)}`}
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-[13px] text-text-2">{s.analisisIA}</p>
              </details>
            )}

            <form
              action={actualizarSolicitudAdmin}
              className="mt-3.5 flex flex-col gap-2.5 border-t border-border pt-3.5"
            >
              <input type="hidden" name="solicitudId" value={s.id} />
              <div className="flex items-center gap-2.5">
                <select
                  name="estado"
                  defaultValue={s.estado}
                  className="h-9 rounded-ctl border border-border-strong bg-surface px-2.5 text-sm text-text"
                >
                  {ESTADOS_SOLICITUD.map((e) => (
                    <option key={e} value={e}>
                      {SOLICITUD_LABELS[e]}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary">
                  Guardar
                </Button>
              </div>
              <textarea
                name="respuesta"
                defaultValue={s.respuestaAdmin ?? s.respuestaIA ?? ""}
                rows={2}
                maxLength={2000}
                placeholder="Respuesta visible para el nutriólogo…"
                className="w-full rounded-ctl border border-border-strong bg-surface px-2.5 py-2 text-sm text-text"
              />
              {!s.respuestaAdmin && s.respuestaIA && (
                <p className="text-[11.5px] text-text-3">
                  Borrador sugerido por IA — revísalo antes de guardar.
                </p>
              )}
            </form>
          </Card>
        ))
      )}
    </div>
  );
}

function FiltroPill({
  href,
  activo,
  children,
}: {
  href: string;
  activo: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-pill border px-3 py-1 text-xs font-semibold transition-colors",
        activo
          ? "border-primary-soft-brd bg-primary-soft text-primary"
          : "border-border text-text-2 hover:bg-surface-3",
      )}
    >
      {children}
    </Link>
  );
}
