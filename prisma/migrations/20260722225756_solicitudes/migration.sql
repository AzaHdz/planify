-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('NUEVA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'IMPLEMENTADA');

-- CreateTable
CREATE TABLE "Solicitud" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'NUEVA',
    "respuestaAdmin" TEXT,
    "respondidoAt" TIMESTAMP(3),
    "analisisIA" TEXT,
    "veredictoIA" TEXT,
    "analizadoAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Solicitud_userId_idx" ON "Solicitud"("userId");

-- CreateIndex
CREATE INDEX "Solicitud_estado_idx" ON "Solicitud"("estado");

-- AddForeignKey
ALTER TABLE "Solicitud" ADD CONSTRAINT "Solicitud_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

