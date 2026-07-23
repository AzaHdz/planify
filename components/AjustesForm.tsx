"use client";

import { useState, useTransition } from "react";
import { actualizarPerfil } from "@/app/actions/perfil";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AjustesForm({
  nombre,
  cedula,
  logoUrl,
  estiloPrompt,
}: {
  nombre: string;
  cedula: string;
  logoUrl: string;
  estiloPrompt: string;
}) {
  const [logo, setLogo] = useState(logoUrl);
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(formData: FormData) {
    setEstado("idle");
    setError(null);
    startTransition(async () => {
      const r = await actualizarPerfil(formData);
      if (r.ok) {
        setEstado("ok");
      } else {
        setEstado("error");
        setError(r.error ?? "No se pudo guardar.");
      }
    });
  }

  return (
    <form action={onSubmit}>
      <Card className="flex flex-col gap-4 p-6">
        <Field label="Nombre para el PDF" htmlFor="nombre">
          <Input id="nombre" name="nombre" defaultValue={nombre} required placeholder="Dra. Sofía Ramírez" />
        </Field>

        <Field label="Cédula profesional" htmlFor="cedula" hint="Aparece bajo tu nombre en el plan impreso.">
          <Input id="cedula" name="cedula" defaultValue={cedula} placeholder="12345678" />
        </Field>

        <Field label="Logo (URL)" htmlFor="logoUrl" hint="Pega el enlace de una imagen; se muestra en el membrete del PDF.">
          <Input
            id="logoUrl"
            name="logoUrl"
            type="url"
            defaultValue={logoUrl}
            onChange={(e) => setLogo(e.target.value)}
            placeholder="https://…/logo.png"
          />
        </Field>

        <Field
          label="Tu estilo de planes (opcional)"
          htmlFor="estiloPrompt"
          hint="La IA lo toma en cuenta al generar borradores. Ej.: 'colaciones siempre con fruta, evito lácteos enteros, tuteo al paciente'."
        >
          <Textarea
            id="estiloPrompt"
            name="estiloPrompt"
            defaultValue={estiloPrompt}
            rows={3}
            maxLength={1500}
            placeholder="Describe cómo te gusta armar tus planes…"
          />
        </Field>

        {logo.trim() !== "" && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-3">Vista previa:</span>
            <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-ctl border border-border bg-surface-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          {estado === "ok" && <span className="text-sm text-success">Guardado ✓</span>}
          {estado === "error" && <span className="text-sm text-danger">{error}</span>}
        </div>
      </Card>
    </form>
  );
}
