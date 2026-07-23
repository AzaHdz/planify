"use client";

import { useState } from "react";
import type { PlanAlimenticio } from "@/lib/ai/planSchema";
import { PlanEditor } from "@/components/PlanEditor";
import { Button } from "@/components/ui/Button";

/** Alterna entre la vista de solo lectura del plan y el editor visual. */
export function PlanPanel({
  consultaId,
  plan,
  readView,
  resumen,
}: {
  consultaId: string;
  plan: PlanAlimenticio;
  readView: React.ReactNode;
  resumen: React.ReactNode;
}) {
  const [editando, setEditando] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant={editando ? "primary" : "secondary"} size="sm" onClick={() => setEditando((v) => !v)}>
          {editando ? "Listo" : "✎ Editar plan"}
        </Button>
      </div>

      {editando ? (
        <PlanEditor consultaId={consultaId} plan={plan} />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
          <div className="flex flex-col gap-4">{readView}</div>
          <div className="flex flex-col gap-4">{resumen}</div>
        </div>
      )}
    </div>
  );
}
