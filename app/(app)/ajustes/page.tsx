import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { LIMITES_TIER, consultasUsadasEsteMes } from "@/lib/limits";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { AjustesForm } from "@/components/AjustesForm";

export default async function AjustesPage() {
  const { userId, tier } = await requireUser();

  const [user, usadasMes] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, cedula: true, logoUrl: true, estiloPrompt: true },
    }),
    consultasUsadasEsteMes(userId),
  ]);

  const plan = LIMITES_TIER[tier];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="font-display text-[26px] font-bold tracking-tight text-text">Ajustes</h1>
        <p className="mt-1 text-sm text-text-3">
          Estos datos encabezan el PDF del plan que entregas a tus pacientes.
        </p>
      </div>

      <AjustesForm
        nombre={user?.name ?? ""}
        cedula={user?.cedula ?? ""}
        logoUrl={user?.logoUrl ?? ""}
        estiloPrompt={user?.estiloPrompt ?? ""}
      />

      <Card className="p-4.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-text">Tu plan</span>
          <Badge tone={tier === "FREE" ? "neutral" : "primary"}>{plan.nombre}</Badge>
        </div>
        <p className="text-[13px] text-text-2">
          {plan.consultasMes === null
            ? "Consultas ilimitadas."
            : `${usadasMes} de ${plan.consultasMes} consultas usadas este mes.`}
        </p>
        <p className="mt-1.5 text-[11.5px] text-text-3">
          Los cambios de plan se gestionan con el administrador de Planify.
        </p>
      </Card>
    </div>
  );
}
