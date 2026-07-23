"use client";

import { Button } from "@/components/ui/Button";

export function ImprimirButton() {
  return (
    <Button onClick={() => window.print()} className="print:hidden">
      Imprimir / Guardar como PDF
    </Button>
  );
}
