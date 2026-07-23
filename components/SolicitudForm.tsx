"use client";

import { useRef, useState, useTransition } from "react";
import { crearSolicitud } from "@/app/actions/solicitudes";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SolicitudForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setEstado("idle");
    setError(null);
    startTransition(async () => {
      const r = await crearSolicitud(formData);
      if (r.ok) {
        setEstado("ok");
        formRef.current?.reset();
      } else {
        setEstado("error");
        setError(r.error ?? "No se pudo enviar.");
      }
    });
  }

  return (
    <form ref={formRef} action={onSubmit}>
      <Card className="flex flex-col gap-4 p-6">
        <Field label="¿Qué necesitas?" htmlFor="titulo">
          <Input
            id="titulo"
            name="titulo"
            required
            maxLength={120}
            placeholder="Ej. Recordatorios de consulta por WhatsApp"
          />
        </Field>

        <Field
          label="Cuéntanos más"
          htmlFor="descripcion"
          hint="¿Qué problema te resolvería? ¿Cómo te imaginas que funcione?"
        >
          <Textarea
            id="descripcion"
            name="descripcion"
            required
            rows={4}
            maxLength={2000}
            placeholder="Describe la funcionalidad y para qué la usarías…"
          />
        </Field>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Enviando…" : "Enviar sugerencia"}
          </Button>
          {estado === "ok" && (
            <span className="text-sm text-success">Enviada ✓ — la revisaremos pronto</span>
          )}
          {estado === "error" && <span className="text-sm text-danger">{error}</span>}
        </div>
      </Card>
    </form>
  );
}
